/**
 * compute-scores — volpair Score computation Edge Function
 *
 * Computes compatibility scores between a given user and all other users.
 * Called after:
 *   - Onboarding Q7 (self_reported stats saved)
 *   - Platform sync completed (playtomic stats saved)
 *
 * Prefers platform='playtomic' stats over 'self_reported' for each user.
 * Scores stored in volpair_scores table, upserted on (user_a_id, user_b_id).
 *
 * POST body: { user_id: string }
 * Returns: { scores_computed: number }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Play style compatibility matrix ─────────────────────────────────────────
// Higher = better pairing. Aggressive + Defensive = great (20). Same = lower.
const STYLE_MATRIX: Record<string, Record<string, number>> = {
  aggressive:      { aggressive: 12, defensive: 20, balanced: 16, serve_and_volley: 14 },
  defensive:       { aggressive: 20, defensive: 10, balanced: 15, serve_and_volley: 18 },
  balanced:        { aggressive: 16, defensive: 15, balanced: 14, serve_and_volley: 15 },
  serve_and_volley:{ aggressive: 14, defensive: 18, balanced: 15, serve_and_volley: 11 },
};

// ── Intent compatibility ─────────────────────────────────────────────────────
// How well two intents pair together for the Connect tab
const INTENT_MATRIX: Record<string, Record<string, number>> = {
  date:      { date: 10, both: 10, partner: 3,  exploring: 6  },
  partner:   { date: 3,  both: 8,  partner: 10, exploring: 6  },
  both:      { date: 10, both: 10, partner: 8,  exploring: 7  },
  exploring: { date: 6,  both: 7,  partner: 6,  exploring: 5  },
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── 1. Get best stats for the requesting user ────────────────────────────
    const myStats = await getBestStats(supabase, user_id);
    if (!myStats) {
      return new Response(JSON.stringify({ error: 'No stats found for user', scores_computed: 0 }), {
        status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── 2. Get the requesting user's profile (for intent) ────────────────────
    const { data: myProfile } = await supabase
      .from('users')
      .select('id, looking_for, city')
      .eq('id', user_id)
      .maybeSingle();

    // ── 3. Get all other users who have stats ─────────────────────────────────
    const { data: allStatsRows } = await supabase
      .from('player_stats')
      .select('user_id, platform, level_value, level_confidence, play_style, preferred_days, top_clubs')
      .neq('user_id', user_id);

    if (!allStatsRows || allStatsRows.length === 0) {
      return new Response(JSON.stringify({ scores_computed: 0 }), {
        status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── 4. Deduplicate: prefer 'playtomic' over 'self_reported' per user ──────
    const bestStatsMap = new Map<string, any>();
    for (const row of allStatsRows) {
      const existing = bestStatsMap.get(row.user_id);
      if (!existing || row.platform === 'playtomic') {
        bestStatsMap.set(row.user_id, row);
      }
    }

    // ── 5. Get profiles for intent matching ───────────────────────────────────
    const otherUserIds = [...bestStatsMap.keys()];
    const { data: otherProfiles } = await supabase
      .from('users')
      .select('id, looking_for')
      .in('id', otherUserIds);

    const profileMap = new Map((otherProfiles ?? []).map((p: any) => [p.id, p]));

    // ── 6. Compute match history (shared matches) ─────────────────────────────
    const { data: myMatches } = await supabase
      .from('match_players')
      .select('match_id')
      .eq('user_id', user_id);

    const myMatchIds = (myMatches ?? []).map((m: any) => m.match_id);

    const matchesTogetherMap = new Map<string, number>();
    if (myMatchIds.length > 0) {
      const { data: sharedPlayers } = await supabase
        .from('match_players')
        .select('user_id, match_id')
        .in('match_id', myMatchIds)
        .neq('user_id', user_id);

      for (const row of (sharedPlayers ?? [])) {
        matchesTogetherMap.set(
          row.user_id,
          (matchesTogetherMap.get(row.user_id) ?? 0) + 1,
        );
      }
    }

    // ── 7. Compute and upsert scores ──────────────────────────────────────────
    let scoresComputed = 0;
    const upsertRows: any[] = [];

    for (const [otherId, otherStats] of bestStatsMap) {
      const [userAId, userBId] = [user_id, otherId].sort();

      // Level proximity (0–30 pts)
      const myLevel = myStats.level_value ?? 4.0;
      const theirLevel = otherStats.level_value ?? 4.0;
      const levelDelta = Math.abs(myLevel - theirLevel);
      const skillScore = Math.max(0, Math.round(30 - (levelDelta / 0.06)));

      // Play style compatibility (0–20 pts)
      const styleA = myStats.play_style ?? 'balanced';
      const styleB = otherStats.play_style ?? 'balanced';
      const styleScore = STYLE_MATRIX[styleA]?.[styleB] ?? 14;

      // Availability overlap (0–20 pts)
      const daysA = new Set<string>(myStats.preferred_days ?? []);
      const daysB = new Set<string>(otherStats.preferred_days ?? []);
      const dayOverlap = [...daysA].filter(d => daysB.has(d)).length;
      const availabilityScore = Math.round((dayOverlap / 7) * 20);

      // Shared court history / chemistry (0–15 pts)
      const matchesTogether = matchesTogetherMap.get(otherId) ?? 0;
      const chemistryScore = Math.min(15, matchesTogether * 3);

      // Shared clubs / proximity (0–10 pts)
      const clubsA = new Set((myStats.top_clubs ?? []).map((c: any) => c.club_id));
      const clubsB = new Set((otherStats.top_clubs ?? []).map((c: any) => c.club_id));
      const sharedClubs = [...clubsA].filter(c => clubsB.has(c)).length;
      const proximityScore = Math.min(10, sharedClubs * 3);

      // Intent compatibility (0–5 pts)
      const intentA = myProfile?.looking_for ?? 'exploring';
      const intentB = profileMap.get(otherId)?.looking_for ?? 'exploring';
      const intentScore = Math.round((INTENT_MATRIX[intentA]?.[intentB] ?? 5) / 2);

      const totalScore = Math.min(100,
        skillScore + styleScore + availabilityScore + chemistryScore + proximityScore + intentScore,
      );

      upsertRows.push({
        user_a_id: userAId,
        user_b_id: userBId,
        total_score: totalScore,
        skill_score: skillScore,
        style_score: styleScore,
        availability_score: availabilityScore,
        location_score: 0,
        chemistry_score: chemistryScore,
        proximity_score: proximityScore,
        matches_together: matchesTogether,
        calculated_at: new Date().toISOString(),
      });

      scoresComputed++;
    }

    // Batch upsert in chunks of 100
    const CHUNK = 100;
    for (let i = 0; i < upsertRows.length; i += CHUNK) {
      await supabase
        .from('volpair_scores')
        .upsert(upsertRows.slice(i, i + CHUNK), { onConflict: 'user_a_id,user_b_id' });
    }

    return new Response(
      JSON.stringify({ scores_computed: scoresComputed }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );

  } catch (err: any) {
    console.error('compute-scores error:', err);
    return new Response(
      JSON.stringify({ error: err?.message ?? 'Internal error' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});

// ── Helper: get best stats for a user (playtomic > self_reported) ────────────
async function getBestStats(supabase: any, userId: string) {
  const { data: rows } = await supabase
    .from('player_stats')
    .select('*')
    .eq('user_id', userId)
    .order('platform', { ascending: false }); // 'self_reported' < 'playtomic' alphabetically

  if (!rows || rows.length === 0) return null;
  const playtomic = rows.find((r: any) => r.platform === 'playtomic');
  return playtomic ?? rows[0];
}
