/**
 * usePartners — real data for PlayHomeScreen > Find a Partner tab
 *
 * Returns other Volpair users sorted by their volpair_score with the current user.
 * Falls back to level-similarity ordering if no pre-computed scores exist yet.
 *
 * Includes player_stats for level, win rate, play style, availability (preferred_days),
 * and top club for display.
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Partner {
  userId: string;
  fullName: string;
  city: string | null;
  photos: string[];
  // stats
  levelValue: number | null;
  levelLabel: string | null;
  winRate: number | null;
  playStyle: string | null;
  preferredDays: string[];
  topClub: string | null;
  // score
  volpairScore: number;
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

function friendlyDays(days: string[]): string {
  if (!days || days.length === 0) return 'Flexible';
  const map: Record<string, string> = {
    monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
    thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
  };
  const short = days.map(d => map[d.toLowerCase()] ?? d);
  if (short.length <= 2) return short.join(' & ');
  const hasWeekend = days.some(d => ['saturday', 'sunday'].includes(d.toLowerCase()));
  const hasWeekday = days.some(d => !['saturday', 'sunday'].includes(d.toLowerCase()));
  if (hasWeekend && hasWeekday) return 'Weekdays + weekends';
  if (hasWeekend) return 'Weekends';
  return 'Weekday evenings';
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePartners() {
  const { user } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // ── 1. Pre-computed volpair scores for this user ─────────────────────────
      const { data: scoresData } = await supabase
        .from('volpair_scores')
        .select('user_a_id, user_b_id, total_score')
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
        .order('total_score', { ascending: false })
        .limit(50);

      // Extract the other user IDs, preserving score order
      const scoredMap = new Map<string, number>();
      for (const s of (scoresData ?? []) as any[]) {
        const otherId = s.user_a_id === user.id ? s.user_b_id : s.user_a_id;
        scoredMap.set(otherId, s.total_score);
      }

      let targetUserIds: string[] = Array.from(scoredMap.keys());

      // ── 2. Fallback: if no volpair scores yet, fetch all users near our level ─
      if (targetUserIds.length === 0) {
        // Get my level first
        const { data: myStats } = await supabase
          .from('player_stats')
          .select('level_value')
          .eq('user_id', user.id)
          .maybeSingle();

        const myLevel = (myStats as any)?.level_value ?? 4.0;

        const { data: nearbyStats } = await supabase
          .from('player_stats')
          .select('user_id, level_value')
          .gte('level_value', myLevel - 1.0)
          .lte('level_value', myLevel + 1.0)
          .neq('user_id', user.id)
          .limit(30);

        targetUserIds = (nearbyStats ?? []).map((s: any) => s.user_id);
      }

      if (targetUserIds.length === 0) {
        setPartners([]);
        setLoading(false);
        return;
      }

      // ── 3. Fetch user profiles + stats ────────────────────────────────────────
      const { data: usersData } = await supabase
        .from('users')
        .select('id, full_name, city, photos')
        .in('id', targetUserIds);

      const { data: statsData } = await supabase
        .from('player_stats')
        .select('user_id, level_value, win_rate, play_style, preferred_days, top_clubs')
        .in('user_id', targetUserIds);

      // ── 4. Existing connections I've sent ─────────────────────────────────────
      const { data: myConnections } = await supabase
        .from('connections')
        .select('id, receiver_id, action_type')
        .eq('sender_id', user.id)
        .in('status', ['pending', 'accepted'])
        .in('receiver_id', targetUserIds);

      const actionMap = new Map<string, { id: string; action: string }>();
      for (const c of (myConnections ?? []) as any[]) {
        actionMap.set(c.receiver_id, { id: c.id, action: c.action_type });
      }

      const statsMap = new Map((statsData ?? []).map((s: any) => [s.user_id, s]));

      const result: Partner[] = (usersData ?? []).map((u: any) => {
        const stats = statsMap.get(u.id) as any;
        const topClub = stats?.top_clubs?.[0]?.club_name ?? null;
        const action = actionMap.get(u.id);

        // Score: use pre-computed if available, else use level proximity
        const preScore = scoredMap.get(u.id);
        const fallbackScore = stats?.level_value
          ? Math.max(0, 100 - Math.round(Math.abs(4.5 - stats.level_value) * 20))
          : 50;

        return {
          userId: u.id,
          fullName: u.full_name ?? 'Unknown',
          city: u.city,
          photos: u.photos ?? [],
          levelValue: stats?.level_value ?? null,
          levelLabel: levelLabel(stats?.level_value ?? null),
          winRate: stats ? Math.round((stats.win_rate ?? 0) * 100) : null,
          playStyle: stats?.play_style?.replace('_', ' ') ?? null,
          preferredDays: stats?.preferred_days ?? [],
          topClub,
          availability: friendlyDays(stats?.preferred_days ?? []),
          volpairScore: preScore ?? fallbackScore,
          myAction: (action?.action ?? null) as any,
          connectionId: action?.id ?? null,
        };
      });

      // Sort by volpair score
      result.sort((a, b) => b.volpairScore - a.volpairScore);
      setPartners(result);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load partners');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  /** Send a play request to a partner */
  const sendServe = async (receiverId: string): Promise<string | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('connections')
      .insert({ sender_id: user.id, receiver_id: receiverId, action_type: 'play_again' })
      .select('id')
      .single();
    if (error) throw error;

    setPartners(prev =>
      prev.map(p =>
        p.userId === receiverId
          ? { ...p, myAction: 'play_again', connectionId: data.id }
          : p
      )
    );

    return data.id;
  };

  return { partners, loading, error, reload: load, sendServe };
}
