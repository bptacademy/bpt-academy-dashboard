/**
 * useDiscovery — real data for ConnectHomeScreen
 *
 * Layer 1: players who share match_players rows with the current user
 *          (you've literally been on the same court)
 * Layer 2: players who played with Layer 1 players
 *          (friends of your court — one degree removed)
 *
 * Shows ALL co-players regardless of whether they're on Volpair yet.
 * If they're on Volpair, we show their full profile + volpair score.
 * If not, we show their Playtomic name + level + "Not on Volpair yet" badge.
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DiscoveredPlayer {
  userId: string | null;          // null if not on Volpair
  platformUserId: string;
  fullName: string;
  city: string | null;
  lookingFor: string | null;
  bio: string | null;
  photos: string[];
  isOnVolpair: boolean;
  // stats
  levelValue: number | null;
  levelLabel: string | null;
  winRate: number | null;
  playStyle: string | null;
  topClub: string | null;
  // court relationship
  matchesTogether: number;
  lastPlayedTogether: string | null;
  lastClubName: string | null;
  // score
  volpairScore: number;
  // layer info
  layer: 1 | 2;
  mutualVia: string | null;
  mutualConnections: number;
  // action state
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

function estimateScore(myStats: any, theirLevel: number | null, matchesTogether: number): number {
  if (!myStats || theirLevel === null) return 50;
  const delta = Math.abs((myStats.level_value ?? 0) - theirLevel);
  const skillScore = Math.max(0, 40 - Math.round(delta * 20));
  const chemScore = Math.min(30, matchesTogether * 3);
  const wrScore = 20; // default when we don't have their win rate
  return Math.min(100, 10 + skillScore + chemScore + wrScore);
}

function formatTimeAgo(isoDate: string | null): string | null {
  if (!isoDate) return null;
  const days = Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return '1 week ago';
  return `${Math.floor(days / 7)} weeks ago`;
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
      // ── 0. My stats ──────────────────────────────────────────────────────────
      const { data: myStatsRow } = await supabase
        .from('player_stats')
        .select('level_value, win_rate, play_style')
        .eq('user_id', user.id)
        .maybeSingle();

      // ── 1. My platform_user_id ───────────────────────────────────────────────
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

      const myPlatformId = myConn.platform_user_id;

      // ── 2. All my match IDs ──────────────────────────────────────────────────
      const { data: myMatchRows } = await supabase
        .from('match_players')
        .select('match_id')
        .eq('platform_user_id', myPlatformId);

      const myMatchIds = (myMatchRows ?? []).map((r: any) => r.match_id);

      if (myMatchIds.length === 0) {
        setLayer1([]);
        setLayer2([]);
        setLoading(false);
        return;
      }

      // ── 3. Co-players in my matches (ALL — Volpair or not) ───────────────────
      const { data: coPlayerRows } = await supabase
        .from('match_players')
        .select('user_id, platform_user_id, platform_name, match_id, level_value, matches(played_at, tenant_name)')
        .in('match_id', myMatchIds)
        .neq('platform_user_id', myPlatformId);

      // Group by platform_user_id
      const coPlayerMap = new Map<string, {
        platformUserId: string;
        userId: string | null;
        platformName: string | null;
        count: number;
        lastPlayedAt: string | null;
        lastClubName: string | null;
        levelValue: number | null;
      }>();

      for (const row of (coPlayerRows ?? []) as any[]) {
        const pid = row.platform_user_id as string;
        const existing = coPlayerMap.get(pid);
        const playedAt = row.matches?.played_at ?? null;
        const club = row.matches?.tenant_name ?? null;

        if (!existing) {
          coPlayerMap.set(pid, {
            platformUserId: pid,
            userId: row.user_id ?? null,
            platformName: row.platform_name ?? null,
            count: 1,
            lastPlayedAt: playedAt,
            lastClubName: club,
            levelValue: row.level_value ?? null,
          });
        } else {
          existing.count += 1;
          if (playedAt && (!existing.lastPlayedAt || playedAt > existing.lastPlayedAt)) {
            existing.lastPlayedAt = playedAt;
            existing.lastClubName = club;
          }
          if (row.level_value && !existing.levelValue) {
            existing.levelValue = row.level_value;
          }
        }
      }

      const layer1PlatformIds = Array.from(coPlayerMap.keys());

      // ── 4. My existing connections ───────────────────────────────────────────
      const { data: myConnections } = await supabase
        .from('connections')
        .select('id, receiver_id, action_type, status')
        .eq('sender_id', user.id)
        .in('status', ['pending', 'accepted']);

      const actionMap = new Map<string, { id: string; action: string }>();
      for (const c of (myConnections ?? []) as any[]) {
        actionMap.set(c.receiver_id, { id: c.id, action: c.action_type });
      }

      // ── 5. Fetch Volpair profiles for co-players who ARE on Volpair ──────────
      const volpairUserIds = Array.from(coPlayerMap.values())
        .filter(p => p.userId !== null)
        .map(p => p.userId as string);

      const volpairProfileMap = new Map<string, any>();
      const volpairStatsMap = new Map<string, any>();

      if (volpairUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('users')
          .select('id, full_name, city, looking_for, bio, photos')
          .in('id', volpairUserIds);

        for (const p of (profiles ?? [])) volpairProfileMap.set(p.id, p);

        const { data: stats } = await supabase
          .from('player_stats')
          .select('user_id, level_value, win_rate, play_style, top_clubs')
          .in('user_id', volpairUserIds);

        for (const s of (stats ?? [])) volpairStatsMap.set(s.user_id, s);

        // Volpair scores
        const scoreIds = volpairUserIds.map(uid => {
          const a = user.id < uid ? user.id : uid;
          const b = user.id < uid ? uid : user.id;
          return { a, b };
        });
        const { data: scoresData } = await supabase
          .from('volpair_scores')
          .select('user_a_id, user_b_id, total_score, matches_together, last_played_together')
          .or(scoreIds.map(s => `and(user_a_id.eq.${s.a},user_b_id.eq.${s.b})`).join(','));

        for (const s of (scoresData ?? []) as any[]) {
          const otherId = s.user_a_id === user.id ? s.user_b_id : s.user_a_id;
          // store score by user_id
          volpairStatsMap.get(otherId) && (volpairStatsMap.get(otherId).__score = s.total_score);
        }
      }

      // ── 6. Build Layer 1 ─────────────────────────────────────────────────────
      const l1: DiscoveredPlayer[] = Array.from(coPlayerMap.values())
        .sort((a, b) => b.count - a.count) // sort by matches together
        .slice(0, 30) // cap at 30
        .map(rel => {
          const profile = rel.userId ? volpairProfileMap.get(rel.userId) : null;
          const stats = rel.userId ? volpairStatsMap.get(rel.userId) : null;
          const timeAgo = formatTimeAgo(rel.lastPlayedAt);
          const action = rel.userId ? actionMap.get(rel.userId) : null;

          const levelVal = stats?.level_value ?? rel.levelValue ?? null;
          const score = stats?.__score
            ?? estimateScore(myStatsRow, levelVal, rel.count);

          return {
            userId: rel.userId,
            platformUserId: rel.platformUserId,
            fullName: profile?.full_name ?? rel.platformName ?? `Player ${rel.platformUserId}`,
            city: profile?.city ?? null,
            lookingFor: profile?.looking_for ?? null,
            bio: profile?.bio ?? null,
            photos: profile?.photos ?? [],
            isOnVolpair: !!rel.userId,
            levelValue: levelVal,
            levelLabel: levelLabel(levelVal),
            winRate: stats ? Math.round((stats.win_rate ?? 0) * 100) : null,
            playStyle: stats?.play_style?.replace('_', ' ') ?? null,
            topClub: stats?.top_clubs?.[0]?.club_name ?? null,
            matchesTogether: rel.count,
            lastPlayedTogether: rel.lastPlayedAt,
            lastClubName: rel.lastClubName
              ? `${rel.lastClubName}${timeAgo ? ' · ' + timeAgo : ''}`
              : timeAgo,
            volpairScore: score,
            layer: 1,
            mutualVia: null,
            mutualConnections: rel.count,
            myAction: (action?.action ?? null) as any,
            connectionId: action?.id ?? null,
          };
        })
        .sort((a, b) => b.volpairScore - a.volpairScore);

      setLayer1(l1);
      setLayer2([]); // Layer 2 skipped for now — Layer 1 already has real data
    } catch (e: any) {
      setError(e.message ?? 'Failed to load discovery');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

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
