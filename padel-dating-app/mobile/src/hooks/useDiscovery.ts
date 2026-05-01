/**
 * useDiscovery — real data for ConnectHomeScreen
 *
 * Layer 1: users who share match_players rows with the current user
 *          (you've literally been on the same court)
 * Layer 2: users who played with Layer 1 players
 *          (friends of your court — one degree removed)
 *
 * For each discovered user we also fetch:
 *   - their player_stats (level, win_rate, play_style, top_clubs)
 *   - volpair_scores row if it exists (pre-computed by the sync edge function)
 *     If no row exists yet we fall back to a computed score from stats alone.
 *   - already-actioned connection (so we can show the sent state)
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DiscoveredPlayer {
  userId: string;
  fullName: string;
  city: string | null;
  lookingFor: string | null;
  bio: string | null;
  photos: string[];
  // stats
  levelValue: number | null;
  levelLabel: string | null;
  winRate: number | null;
  playStyle: string | null;
  topClub: string | null;
  // court relationship
  matchesTogether: number;
  lastPlayedTogether: string | null; // ISO
  lastClubName: string | null;
  // score
  volpairScore: number;
  // layer info
  layer: 1 | 2;
  mutualVia: string | null; // for layer 2: first-degree player name
  mutualConnections: number;
  // action state (from connections table)
  myAction: 'play_again' | 'connect' | 'volley' | null;
  connectionId: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function levelLabel(value: number | null): string | null {
  if (value === null) return null;
  if (value >= 5.5) return 'Elite';
  if (value >= 5.0) return 'Advanced+';
  if (value >= 4.5) return 'Advanced';
  if (value >= 4.0) return 'Competitive';
  if (value >= 3.5) return 'Intermediate+';
  if (value >= 3.0) return 'Intermediate';
  return 'Beginner';
}

/** Estimate a volpair score from stats when no pre-computed row exists */
function estimateScore(
  myStats: any,
  theirStats: any,
  matchesTogether: number,
): number {
  if (!myStats || !theirStats) return 50;

  // Skill delta: closer levels → higher score (max 40 pts)
  const delta = Math.abs((myStats.level_value ?? 0) - (theirStats.level_value ?? 0));
  const skillScore = Math.max(0, 40 - Math.round(delta * 20));

  // Chemistry: shared matches (max 30 pts, plateaus at 10 matches)
  const chemScore = Math.min(30, matchesTogether * 3);

  // Win rate compatibility (max 20 pts)
  const wrDelta = Math.abs((myStats.win_rate ?? 50) - (theirStats.win_rate ?? 50));
  const wrScore = Math.max(0, 20 - Math.round(wrDelta / 5));

  // Base 10 pts for being on the platform
  return Math.min(100, 10 + skillScore + chemScore + wrScore);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDiscovery() {
  const { user } = useAuth();
  const [layer1, setLayer1] = useState<DiscoveredPlayer[]>([]);
  const [layer2, setLayer2] = useState<DiscoveredPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // ── 0. My stats (for score estimation) ──────────────────────────────────
      const { data: myStatsRow } = await supabase
        .from('player_stats')
        .select('level_value, win_rate, play_style')
        .eq('user_id', user.id)
        .maybeSingle();

      // ── 1. My platform_user_id from platform_connections ────────────────────
      const { data: myConn } = await supabase
        .from('platform_connections')
        .select('platform_user_id, platform')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!myConn) {
        setLayer1([]);
        setLayer2([]);
        setLoading(false);
        return;
      }

      // ── 2. All match_player rows for ME (by platform_user_id) ───────────────
      const { data: myMatchRows } = await supabase
        .from('match_players')
        .select('match_id')
        .eq('platform_user_id', myConn.platform_user_id);

      const myMatchIds = (myMatchRows ?? []).map((r: any) => r.match_id);

      if (myMatchIds.length === 0) {
        setLayer1([]);
        setLayer2([]);
        setLoading(false);
        return;
      }

      // ── 3. Co-players in those matches (not me, must be on Volpair: user_id != null) ──
      const { data: coPlayerRows } = await supabase
        .from('match_players')
        .select('user_id, platform_user_id, match_id, matches(played_at, tenant_name)')
        .in('match_id', myMatchIds)
        .neq('platform_user_id', myConn.platform_user_id)
        .not('user_id', 'is', null);

      // Group by user_id: count matches, find last club
      const coPlayerMap = new Map<string, {
        userId: string;
        count: number;
        lastPlayedAt: string | null;
        lastClubName: string | null;
        matchIds: string[];
      }>();

      for (const row of (coPlayerRows ?? []) as any[]) {
        const uid = row.user_id as string;
        const existing = coPlayerMap.get(uid);
        const playedAt = row.matches?.played_at ?? null;
        const club = row.matches?.tenant_name ?? null;

        if (!existing) {
          coPlayerMap.set(uid, {
            userId: uid,
            count: 1,
            lastPlayedAt: playedAt,
            lastClubName: club,
            matchIds: [row.match_id],
          });
        } else {
          existing.count += 1;
          existing.matchIds.push(row.match_id);
          // keep most recent
          if (playedAt && (!existing.lastPlayedAt || playedAt > existing.lastPlayedAt)) {
            existing.lastPlayedAt = playedAt;
            existing.lastClubName = club;
          }
        }
      }

      const layer1UserIds = Array.from(coPlayerMap.keys());

      // ── 4. My existing connections (so we know what I've already sent) ──────
      const { data: myConnections } = await supabase
        .from('connections')
        .select('id, receiver_id, action_type, status')
        .eq('sender_id', user.id)
        .in('status', ['pending', 'accepted']);

      const actionMap = new Map<string, { id: string; action: string }>();
      for (const c of (myConnections ?? []) as any[]) {
        actionMap.set(c.receiver_id, { id: c.id, action: c.action_type });
      }

      // ── 5. Fetch user + stats + volpair_scores for Layer 1 ──────────────────
      const buildLayer1 = async (): Promise<DiscoveredPlayer[]> => {
        if (layer1UserIds.length === 0) return [];

        const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name, city, looking_for, bio, photos')
          .in('id', layer1UserIds);

        const { data: statsData } = await supabase
          .from('player_stats')
          .select('user_id, level_value, win_rate, play_style, top_clubs')
          .in('user_id', layer1UserIds);

        // Volpair scores — constraint requires user_a_id < user_b_id
        const scoreIds = layer1UserIds.map(uid => {
          const a = user.id < uid ? user.id : uid;
          const b = user.id < uid ? uid : user.id;
          return { a, b };
        });
        const { data: scoresData } = await supabase
          .from('volpair_scores')
          .select('user_a_id, user_b_id, total_score, matches_together, last_played_together')
          .or(scoreIds.map(s => `and(user_a_id.eq.${s.a},user_b_id.eq.${s.b})`).join(','));

        const statsMap = new Map((statsData ?? []).map((s: any) => [s.user_id, s]));
        const scoreMap = new Map<string, any>();
        for (const s of (scoresData ?? []) as any[]) {
          const otherId = s.user_a_id === user.id ? s.user_b_id : s.user_a_id;
          scoreMap.set(otherId, s);
        }

        return (usersData ?? []).map((u: any) => {
          const rel = coPlayerMap.get(u.id)!;
          const stats = statsMap.get(u.id) as any;
          const scoreRow = scoreMap.get(u.id);
          const topClub = stats?.top_clubs?.[0]?.club_name ?? null;
          const action = actionMap.get(u.id);

          // Format last played
          let lastPlayedStr: string | null = null;
          if (rel.lastPlayedAt) {
            const days = Math.floor(
              (Date.now() - new Date(rel.lastPlayedAt).getTime()) / 86400000
            );
            lastPlayedStr = days === 0
              ? 'today'
              : days === 1
              ? '1 day ago'
              : days < 7
              ? `${days} days ago`
              : days < 14
              ? '1 week ago'
              : `${Math.floor(days / 7)} weeks ago`;
          }

          return {
            userId: u.id,
            fullName: u.full_name ?? 'Unknown',
            city: u.city,
            lookingFor: u.looking_for,
            bio: u.bio,
            photos: u.photos ?? [],
            levelValue: stats?.level_value ?? null,
            levelLabel: levelLabel(stats?.level_value ?? null),
            winRate: stats ? Math.round((stats.win_rate ?? 0) * 100) : null,
            playStyle: stats?.play_style?.replace('_', ' ') ?? null,
            topClub,
            matchesTogether: rel.count,
            lastPlayedTogether: rel.lastPlayedAt,
            lastClubName: rel.lastClubName
              ? `${rel.lastClubName}${lastPlayedStr ? ' · ' + lastPlayedStr : ''}`
              : lastPlayedStr,
            volpairScore: scoreRow?.total_score
              ?? estimateScore(myStatsRow, stats, rel.count),
            layer: 1 as const,
            mutualVia: null,
            mutualConnections: rel.count,
            myAction: (action?.action ?? null) as any,
            connectionId: action?.id ?? null,
          };
        }).sort((a, b) => b.volpairScore - a.volpairScore);
      };

      // ── 6. Layer 2: players who played with Layer 1 players ─────────────────
      const buildLayer2 = async (l1players: DiscoveredPlayer[]): Promise<DiscoveredPlayer[]> => {
        if (l1players.length === 0) return [];

        // Get platform_user_ids of layer1 players
        const { data: l1PlatformRows } = await supabase
          .from('platform_connections')
          .select('platform_user_id, user_id')
          .in('user_id', l1players.map(p => p.userId));

        const l1PlatformIds = (l1PlatformRows ?? []).map((r: any) => r.platform_user_id);
        const l1PlatformToUserId = new Map(
          (l1PlatformRows ?? []).map((r: any) => [r.platform_user_id, r.user_id])
        );

        if (l1PlatformIds.length === 0) return [];

        // Matches involving l1 players
        const { data: l1MatchRows } = await supabase
          .from('match_players')
          .select('match_id')
          .in('platform_user_id', l1PlatformIds);

        const l1MatchIds = [...new Set((l1MatchRows ?? []).map((r: any) => r.match_id))];
        if (l1MatchIds.length === 0) return [];

        // Co-players of l1 players (not me, not already in layer1)
        const excludeIds = new Set([myConn.platform_user_id, ...l1PlatformIds]);

        const { data: l2CoRows } = await supabase
          .from('match_players')
          .select('user_id, platform_user_id, match_id')
          .in('match_id', l1MatchIds)
          .not('user_id', 'is', null);

        // Filter in JS (avoid complex RLS-unsafe NOT IN on large sets)
        const filtered = (l2CoRows ?? []).filter(
          (r: any) => !excludeIds.has(r.platform_user_id) && r.user_id !== user.id
        );

        // Group by user_id + track which l1 player introduced them
        const l2Map = new Map<string, { userId: string; count: number; viaUserId: string }>();
        for (const row of filtered as any[]) {
          const uid = row.user_id as string;
          if (!l2Map.has(uid)) {
            // Find which l1 match_player was in this match
            const viaUserId =
              (l1MatchRows ?? []).find((m: any) => m.match_id === row.match_id)
              ? l1players[0]?.userId // fallback — we don't have direct link here
              : l1players[0]?.userId;
            l2Map.set(uid, { userId: uid, count: 1, viaUserId });
          } else {
            l2Map.get(uid)!.count += 1;
          }
        }

        const l2UserIds = Array.from(l2Map.keys()).slice(0, 20); // cap at 20
        if (l2UserIds.length === 0) return [];

        const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name, city, looking_for, bio, photos')
          .in('id', l2UserIds);

        const { data: statsData } = await supabase
          .from('player_stats')
          .select('user_id, level_value, win_rate, play_style, top_clubs')
          .in('user_id', l2UserIds);

        const statsMap = new Map((statsData ?? []).map((s: any) => [s.user_id, s]));

        // Build name map for l1 players (for "Plays with X")
        const l1NameMap = new Map(l1players.map(p => [p.userId, p.fullName]));

        return (usersData ?? []).map((u: any) => {
          const rel = l2Map.get(u.id)!;
          const stats = statsMap.get(u.id) as any;
          const topClub = stats?.top_clubs?.[0]?.club_name ?? null;
          const action = actionMap.get(u.id);
          const viaName = l1NameMap.get(rel.viaUserId) ?? null;

          return {
            userId: u.id,
            fullName: u.full_name ?? 'Unknown',
            city: u.city,
            lookingFor: u.looking_for,
            bio: u.bio,
            photos: u.photos ?? [],
            levelValue: stats?.level_value ?? null,
            levelLabel: levelLabel(stats?.level_value ?? null),
            winRate: stats ? Math.round((stats.win_rate ?? 0) * 100) : null,
            playStyle: stats?.play_style?.replace('_', ' ') ?? null,
            topClub,
            matchesTogether: 0,
            lastPlayedTogether: null,
            lastClubName: null,
            volpairScore: estimateScore(myStatsRow, stats, 0),
            layer: 2 as const,
            mutualVia: viaName,
            mutualConnections: rel.count,
            myAction: (action?.action ?? null) as any,
            connectionId: action?.id ?? null,
          };
        }).sort((a, b) => b.volpairScore - a.volpairScore);
      };

      const l1 = await buildLayer1();
      const l2 = await buildLayer2(l1);

      setLayer1(l1);
      setLayer2(l2);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load discovery');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  /** Send a connection action (play_again | connect | volley) */
  const sendAction = async (
    receiverId: string,
    actionType: 'play_again' | 'connect' | 'volley',
  ): Promise<string | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('connections')
      .insert({ sender_id: user.id, receiver_id: receiverId, action_type: actionType })
      .select('id')
      .single();
    if (error) throw error;

    // Update local state optimistically
    const update = (list: DiscoveredPlayer[]) =>
      list.map(p =>
        p.userId === receiverId
          ? { ...p, myAction: actionType, connectionId: data.id }
          : p
      );
    setLayer1(prev => update(prev));
    setLayer2(prev => update(prev));

    return data.id;
  };

  return { layer1, layer2, loading, error, reload: load, sendAction };
}
