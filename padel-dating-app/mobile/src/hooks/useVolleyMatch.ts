/**
 * useVolleyMatch — realtime Volley mutual match detection
 *
 * Subscribes to the connections table. When a new volley arrives where the
 * current user is the receiver, checks if they also sent a volley to that
 * sender. If mutual → marks both accepted, sends match notifications, calls onMatch.
 */

import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { notifyMatch } from '../lib/notifications';

export interface VolleyMatch {
  connectionId: string;
  matchedUserId: string;
  matchedUserName: string;
  matchedUserPhoto: string | null;
}

export function useVolleyMatch(onMatch: (match: VolleyMatch) => void) {
  const { user } = useAuth();
  const onMatchRef = useRef(onMatch);
  onMatchRef.current = onMatch;

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`volley-match-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'connections',
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          const incoming = payload.new as any;
          if (incoming.action_type !== 'volley') return;
          if (incoming.status !== 'pending') return;

          const senderId = incoming.sender_id;

          // Check if we already sent a volley to this person
          const { data: myVolley } = await supabase
            .from('connections')
            .select('id')
            .eq('sender_id', user.id)
            .eq('receiver_id', senderId)
            .eq('action_type', 'volley')
            .eq('status', 'pending')
            .maybeSingle();

          if (!myVolley) return;

          // It's a match — mark both accepted
          const now = new Date().toISOString();
          await supabase
            .from('connections')
            .update({ status: 'accepted', matched_at: now })
            .in('id', [incoming.id, myVolley.id]);

          // Fetch matched user details
          const { data: matchedUser } = await supabase
            .from('users')
            .select('id, full_name, photos')
            .eq('id', senderId)
            .maybeSingle();

          const matchedUserName = matchedUser?.full_name ?? 'Someone';

          // Notify both users of the match
          await notifyMatch(senderId, user.full_name ?? 'Someone', incoming.id);

          onMatchRef.current({
            connectionId: incoming.id,
            matchedUserId: senderId,
            matchedUserName,
            matchedUserPhoto: matchedUser?.photos?.[0] ?? null,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
}
