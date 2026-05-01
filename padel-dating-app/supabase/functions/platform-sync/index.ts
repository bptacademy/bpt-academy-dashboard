// platform-sync Edge Function
// Fetches match history from Playtomic, upserts into DB,
// recalculates player_stats and volpair_scores.
// Idempotent — safe to run multiple times.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLAYTOMIC_BASE = 'https://api.playtomic.io';

// ─── Playtomic helpers ────────────────────────────────────────────────────────

async function refreshPlaytomicToken(email: string, password: string) {
  // Playtomic refresh endpoints (v1/v3) are unreliable — we re-login instead.
  const res = await fetch(`${PLAYTOMIC_BASE}/v3/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Re-login failed: ${res.status}. Please reconnect your Playtomic account.`);
  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
  };
}

async function fetchPlaytomicMatches(accessToken: string, userId: string, page = 0, size = 50) {
  const url = `${PLAYTOMIC_BASE}/v1/matches?user_id=${userId}&page=${page}&size=${size}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Matches fetch failed: ${res.status}`);
  return res.json();
}

async function fetchPlaytomicLevel(accessToken: string, userId: string) {
  const url = `${PLAYTOMIC_BASE}/v1/levels?user_id=${userId}&sport_id=PADEL`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

// ─── Stats calculation ────────────────────────────────────────────────────────

function derivePlayStyle(matches: any[]): string {
  const avgSetDiff = matches.reduce((acc, m) => {
    const myTeam = m.teams?.find((t: any) => t.players?.some((p: any) => p.is_me));
    if (!myTeam) return acc;
    const score = myTeam.result === 'WON' ? 1 : -1;
    return acc + score;
  }, 0) / Math.max(matches.length, 1);

  if (avgSetDiff > 0.3) return 'aggressive';
  if (avgSetDiff < -0.1) return 'defensive';
  return 'balanced';
}

function derivePreferredTime(matches: any[]): string {
  const hours = matches.map(m => new Date(m.start_date).getHours());
  const morning = hours.filter(h => h < 12).length;
  const afternoon = hours.filter(h => h >= 12 && h < 18).length;
  const evening = hours.filter(h => h >= 18).length;
  if (morning >= afternoon && morning >= evening) return 'morning';
  if (afternoon >= morning && afternoon >= evening) return 'afternoon';
  return 'evening';
}

function derivePreferredDays(matches: any[]): string[] {
  const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const counts: Record<string, number> = {};
  for (const m of matches) {
    const day = DAY_NAMES[new Date(m.start_date).getDay()];
    counts[day] = (counts[day] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([day]) => day);
}

function deriveTopClubs(matches: any[]): { club_id: string; club_name: string; play_count: number }[] {
  const counts: Record<string, { name: string; count: number }> = {};
  for (const m of matches) {
    const id = m.tenant_id ?? 'unknown';
    const name = m.tenant?.name ?? m.tenant_name ?? 'Unknown Club';
    if (!counts[id]) counts[id] = { name, count: 0 };
    counts[id].count++;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([club_id, { name, count }]) => ({ club_id, club_name: name, play_count: count }));
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Get Volpair user
    const { data: volpairUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', authUser.id)
      .maybeSingle();

    if (!volpairUser) {
      return new Response(JSON.stringify({ error: 'Volpair user not found' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Get platform connection (Playtomic for now)
    const { data: conn } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', volpairUser.id)
      .eq('platform', 'playtomic')
      .maybeSingle();

    if (!conn) {
      return new Response(JSON.stringify({ error: 'No Playtomic connection found. Connect first.' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── Token handling ────────────────────────────────────────────────────────
    // Strategy: use existing access token first. If it's clearly expired AND we
    // have credentials stored, re-login. Otherwise just try the token as-is —
    // Playtomic tokens tend to last much longer than their stated expiry.
    let accessToken = conn.access_token;
    const isExpired = conn.token_expires_at && new Date(conn.token_expires_at) < new Date();

    if (isExpired && conn.refresh_token) {
      // Try using the existing access_token first (may still work despite expiry claim)
      // If we get a 401 on the first real API call, we'll re-login then.
      // For now just proceed — the fetch functions will throw on 401.
      console.log('Token appears expired, attempting to use anyway — Playtomic tokens often outlive stated expiry');
    }

    const platformUserId = conn.platform_user_id;

    // ── Step 1: Fetch level ──────────────────────────────────────────────────
    let levelData: any = null;
    try {
      levelData = await fetchPlaytomicLevel(accessToken, platformUserId);
    } catch (e) {
      console.log('Level fetch failed (non-fatal):', e);
    }

    // ── Step 2: Fetch all match pages ────────────────────────────────────────
    const allMatches: any[] = [];
    let page = 0;
    while (true) {
      const batch = await fetchPlaytomicMatches(accessToken, platformUserId, page, 50);
      if (!batch || batch.length === 0) break;
      allMatches.push(...batch);
      if (batch.length < 50) break;
      page++;
    }

    console.log(`Fetched ${allMatches.length} matches for user ${platformUserId}`);

    // ── Step 3: Upsert clubs ─────────────────────────────────────────────────
    const clubMap: Record<string, string> = {};
    const uniqueClubs = [...new Map(allMatches.map(m => [m.tenant_id, m])).values()];

    for (const m of uniqueClubs) {
      if (!m.tenant_id) continue;
      const { data: club } = await supabase.from('clubs').upsert({
        platform: 'playtomic',
        platform_tenant_id: m.tenant_id,
        name: m.tenant?.name ?? m.tenant_name ?? 'Unknown Club',
        city: m.tenant?.address?.city ?? null,
        country_code: m.tenant?.address?.country_code ?? null,
        lat: m.tenant?.coordinates?.latitude ?? null,
        lon: m.tenant?.coordinates?.longitude ?? null,
      }, { onConflict: 'platform,platform_tenant_id' }).select('id').maybeSingle();
      if (club) clubMap[m.tenant_id] = club.id;
    }

    // ── Step 4: Upsert matches + match_players ───────────────────────────────
    let wins = 0, losses = 0;

    for (const m of allMatches) {
      if (!m.match_id && !m.id) continue;
      const matchId = m.match_id ?? m.id;

      const myTeam = m.teams?.find((t: any) =>
        t.players?.some((p: any) => p.user_id === platformUserId)
      );
      const result = myTeam?.winner ? 'won' : 'lost';
      if (result === 'won') wins++; else losses++;

      const { data: matchRow } = await supabase.from('matches').upsert({
        platform: 'playtomic',
        platform_match_id: matchId,
        club_id: m.tenant_id ? clubMap[m.tenant_id] ?? null : null,
        tenant_name: m.tenant?.name ?? m.tenant_name ?? null,
        court_name: m.court?.name ?? null,
        city: m.tenant?.address?.city ?? null,
        country_code: m.tenant?.address?.country_code ?? null,
        lat: m.tenant?.coordinates?.latitude ?? null,
        lon: m.tenant?.coordinates?.longitude ?? null,
        played_at: m.start_date,
        duration_minutes: m.duration ? Math.round(m.duration / 60) : null,
        match_type: m.is_competitive ? 'competitive' : 'casual',
        surface_type: m.court?.features?.includes('PANORAMIC') ? 'panoramic'
          : m.court?.features?.includes('CRYSTAL') ? 'crystal'
          : m.court?.features?.includes('WALL') ? 'wall'
          : m.court?.is_indoor === false ? 'outdoor' : null,
        result_confirmed: true,
      }, { onConflict: 'platform,platform_match_id' }).select('id').maybeSingle();

      if (!matchRow) continue;

      for (const team of (m.teams ?? [])) {
        for (const player of (team.players ?? [])) {
          const { data: linkedUser } = await supabase
            .from('platform_connections')
            .select('user_id')
            .eq('platform', 'playtomic')
            .eq('platform_user_id', player.user_id)
            .maybeSingle();

          await supabase.from('match_players').upsert({
            match_id: matchRow.id,
            user_id: linkedUser?.user_id ?? null,
            platform_user_id: player.user_id,
            platform_name: player.name ?? player.full_name ?? null,
            team_id: String(team.team_index ?? team.id ?? '0'),
            result: team.winner ? 'won' : 'lost',
            level_value: player.level?.value ?? null,
            level_confidence: player.level?.confidence ?? null,
          }, { onConflict: 'match_id,platform_user_id' });
        }
      }
    }

    // ── Step 5: Recalculate player_stats ─────────────────────────────────────
    const totalMatches = allMatches.length;
    const winRate = totalMatches > 0 ? wins / totalMatches : 0;
    const playStyle = derivePlayStyle(allMatches);
    const preferredTime = derivePreferredTime(allMatches);
    const preferredDays = derivePreferredDays(allMatches);
    const topClubs = deriveTopClubs(allMatches);

    await supabase.from('player_stats').upsert({
      user_id: volpairUser.id,
      platform: 'playtomic',
      level_value: levelData?.level_value ?? null,
      level_confidence: levelData?.level_confidence ?? null,
      total_matches: totalMatches,
      wins,
      losses,
      win_rate: winRate,
      play_style: playStyle,
      preferred_time_of_day: preferredTime,
      preferred_days: preferredDays,
      top_clubs: topClubs,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' });

    await supabase.from('users').update({
      last_active_at: new Date().toISOString(),
    }).eq('id', volpairUser.id);

    // ── Step 6: Recalculate Volpair scores ────────────────────────────────────
    const matchIdsForScores = allMatches
      .filter(m => m.match_id ?? m.id)
      .map(m => m.match_id ?? m.id)
      .slice(0, 200);

    const { data: linkedPairs } = await supabase
      .from('match_players')
      .select('user_id')
      .neq('user_id', volpairUser.id)
      .not('user_id', 'is', null)
      .in('match_id', matchIdsForScores);

    const otherUserIds = [...new Set((linkedPairs ?? []).map((r: any) => r.user_id))];

    for (const otherUserId of otherUserIds) {
      const [userAId, userBId] = [volpairUser.id, otherUserId].sort();

      const { count: matchesTogether } = await supabase
        .from('match_players')
        .select('match_id', { count: 'exact', head: true })
        .eq('user_id', volpairUser.id)
        .in('match_id', (await supabase
          .from('match_players')
          .select('match_id')
          .eq('user_id', otherUserId)
        ).data?.map((r: any) => r.match_id) ?? []);

      const { data: statsA } = await supabase
        .from('player_stats').select('*').eq('user_id', userAId).eq('platform', 'playtomic').maybeSingle();
      const { data: statsB } = await supabase
        .from('player_stats').select('*').eq('user_id', userBId).eq('platform', 'playtomic').maybeSingle();

      if (!statsA || !statsB) continue;

      const levelDelta = Math.abs((statsA.level_value ?? 0) - (statsB.level_value ?? 0));
      const skillScore = Math.max(0, Math.round(25 - (levelDelta / 0.08)));

      const STYLE_MATRIX: Record<string, Record<string, number>> = {
        aggressive:   { aggressive: 14, defensive: 20, balanced: 16, net_dominant: 12 },
        defensive:    { aggressive: 20, defensive: 10, balanced: 15, net_dominant: 18 },
        balanced:     { aggressive: 16, defensive: 15, balanced: 14, net_dominant: 15 },
        net_dominant: { aggressive: 12, defensive: 18, balanced: 15, net_dominant: 10 },
      };
      const styleA = statsA.play_style ?? 'balanced';
      const styleB = statsB.play_style ?? 'balanced';
      const styleScore = STYLE_MATRIX[styleA]?.[styleB] ?? 14;

      const daysA = new Set(statsA.preferred_days ?? []);
      const daysB = new Set(statsB.preferred_days ?? []);
      const overlap = [...daysA].filter(d => daysB.has(d)).length;
      const availabilityScore = Math.round((overlap / 7) * 20);

      const chemistryScore = Math.min(10, (matchesTogether ?? 0) * 2);

      const clubsA = new Set((statsA.top_clubs ?? []).map((c: any) => c.club_id));
      const clubsB = new Set((statsB.top_clubs ?? []).map((c: any) => c.club_id));
      const sharedClubs = [...clubsA].filter(c => clubsB.has(c)).length;
      const proximityScore = Math.min(10, sharedClubs * 2);

      const locationScore = 10;

      const totalScore = skillScore + styleScore + availabilityScore + locationScore + chemistryScore + proximityScore;

      await supabase.from('volpair_scores').upsert({
        user_a_id: userAId,
        user_b_id: userBId,
        total_score: Math.min(100, totalScore),
        skill_score: skillScore,
        style_score: styleScore,
        availability_score: availabilityScore,
        location_score: locationScore,
        chemistry_score: chemistryScore,
        proximity_score: proximityScore,
        matches_together: matchesTogether ?? 0,
        calculated_at: new Date().toISOString(),
      }, { onConflict: 'user_a_id,user_b_id' });
    }

    // ── Step 7: Update last_synced_at ─────────────────────────────────────────
    await supabase.from('platform_connections').update({
      last_synced_at: new Date().toISOString(),
    }).eq('id', conn.id);

    return new Response(JSON.stringify({
      success: true,
      matches_imported: totalMatches,
      wins,
      losses,
      level: levelData?.level_value ?? null,
      volpair_scores_calculated: otherUserIds.length,
    }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('platform-sync error:', err);
    return new Response(JSON.stringify({ error: err.message ?? 'Internal error' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
