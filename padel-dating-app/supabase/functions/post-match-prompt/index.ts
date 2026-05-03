// post-match-prompt Edge Function
// Returns co-players from matches the current user played in the last 48h.
// Called by the mobile app on startup (once per day max).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CoPlayer {
  userId: string | null;
  platformUserId: string;
  platformName: string | null;
  levelValue: number | null;
  isOnVolpair: boolean;
  alreadyActioned: boolean;
  photo_url: string | null;
}

interface MatchGroup {
  matchId: string;
  clubName: string | null;
  playedAt: string | null;
  players: CoPlayer[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ── 1. Verify JWT, get current user ─────────────────────────────────────
    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);

    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    // ── 2. Get user's platform_user_id ───────────────────────────────────────
    const { data: myConn } = await supabase
      .from('platform_connections')
      .select('platform_user_id, platform')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!myConn) {
      return new Response(
        JSON.stringify({ matches: [] }),
        { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    const myPlatformId = myConn.platform_user_id;

    // ── 3. Find my matches in the last 48h ───────────────────────────────────
    const { data: myRecentMatchRows } = await supabase
      .from('match_players')
      .select('match_id, matches(id, played_at, tenant_name)')
      .eq('platform_user_id', myPlatformId)
      .gte('matches.played_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

    // Filter out nulls (rows where join returned nothing due to date filter)
    const recentMatchIds: string[] = [];
    const matchInfoMap = new Map<string, { clubName: string | null; playedAt: string | null }>();

    for (const row of (myRecentMatchRows ?? []) as any[]) {
      if (row.matches && row.matches.played_at) {
        recentMatchIds.push(row.match_id);
        matchInfoMap.set(row.match_id, {
          clubName: row.matches.tenant_name ?? null,
          playedAt: row.matches.played_at,
        });
      }
    }

    if (recentMatchIds.length === 0) {
      return new Response(
        JSON.stringify({ matches: [] }),
        { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    // ── 4. Get co-players for those matches (exclude self) ───────────────────
    const { data: coPlayerRows } = await supabase
      .from('match_players')
      .select('match_id, user_id, platform_user_id, platform_name, level_value')
      .in('match_id', recentMatchIds)
      .neq('platform_user_id', myPlatformId);

    // ── 5. Check existing connections for co-players with user_id ────────────
    const volpairCoPlayerIds = (coPlayerRows ?? [])
      .filter((r: any) => r.user_id)
      .map((r: any) => r.user_id as string);

    const actionedSet = new Set<string>();

    if (volpairCoPlayerIds.length > 0) {
      const { data: myConnections } = await supabase
        .from('connections')
        .select('receiver_id')
        .eq('sender_id', user.id)
        .in('receiver_id', volpairCoPlayerIds);

      for (const c of (myConnections ?? []) as any[]) {
        actionedSet.add(c.receiver_id);
      }
    }

    // ── 6. Fetch signed photo URLs for co-players on Volpair ─────────────────
    const photoUrlMap = new Map<string, string>();

    if (volpairCoPlayerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('users')
        .select('id, photos')
        .in('id', volpairCoPlayerIds);

      for (const profile of (profiles ?? []) as any[]) {
        const firstPath = profile.photos?.[0];
        if (firstPath) {
          const cleanPath = firstPath.replace(/^avatars\//, '');
          const { data: urlData } = await supabase.storage
            .from('avatars')
            .createSignedUrl(cleanPath, 3600);
          if (urlData?.signedUrl) {
            photoUrlMap.set(profile.id, urlData.signedUrl);
          }
        }
      }
    }

    // ── 7. Group by match, build response ────────────────────────────────────
    const matchGroups = new Map<string, CoPlayer[]>();

    for (const matchId of recentMatchIds) {
      matchGroups.set(matchId, []);
    }

    for (const row of (coPlayerRows ?? []) as any[]) {
      const players = matchGroups.get(row.match_id);
      if (!players) continue;

      const uid = row.user_id ?? null;
      players.push({
        userId: uid,
        platformUserId: row.platform_user_id,
        platformName: row.platform_name ?? null,
        levelValue: row.level_value ?? null,
        isOnVolpair: !!uid,
        alreadyActioned: uid ? actionedSet.has(uid) : false,
        photo_url: uid ? (photoUrlMap.get(uid) ?? null) : null,
      });
    }

    const result: MatchGroup[] = [];
    for (const [matchId, players] of matchGroups.entries()) {
      if (players.length === 0) continue;
      const info = matchInfoMap.get(matchId);
      result.push({
        matchId,
        clubName: info?.clubName ?? null,
        playedAt: info?.playedAt ?? null,
        players,
      });
    }

    // Sort by most recent match first
    result.sort((a, b) => {
      if (!a.playedAt) return 1;
      if (!b.playedAt) return -1;
      return new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime();
    });

    return new Response(
      JSON.stringify({ matches: result }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('post-match-prompt error:', err);
    return new Response(
      JSON.stringify({ error: err.message ?? 'Internal error' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
});
