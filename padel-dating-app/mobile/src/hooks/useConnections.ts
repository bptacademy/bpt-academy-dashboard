/**
 * useConnections — loads all accepted connections with latest serve preview
 * Used by ConnectionsListScreen (Messages tab)
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface ConnectionPreview {
  connectionId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserPhoto: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  matchedAt: string | null;
}

export function useConnections() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<ConnectionPreview[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Load all accepted connections
      const { data: conns } = await supabase
        .from('connections')
        .select('id, sender_id, receiver_id, matched_at')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('matched_at', { ascending: false });

      if (!conns || conns.length === 0) {
        setConnections([]);
        setLoading(false);
        return;
      }

      // Get other user IDs
      const otherUserIds = conns.map((c: any) =>
        c.sender_id === user.id ? c.receiver_id : c.sender_id
      );

      // Fetch other users' profiles
      const { data: users } = await supabase
        .from('users')
        .select('id, full_name, photos')
        .in('id', otherUserIds);

      const userMap = new Map((users ?? []).map((u: any) => [u.id, u]));

      // For each connection, get latest serve + unread count
      const previews: ConnectionPreview[] = await Promise.all(
        conns.map(async (c: any) => {
          const otherUserId = c.sender_id === user.id ? c.receiver_id : c.sender_id;
          const otherUser = userMap.get(otherUserId);

          // Latest serve
          const { data: lastServe } = await supabase
            .from('serves')
            .select('body, created_at')
            .eq('connection_id', c.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Unread count
          const { count } = await supabase
            .from('serves')
            .select('id', { count: 'exact', head: true })
            .eq('connection_id', c.id)
            .eq('sender_id', otherUserId)
            .is('read_at', null);

          return {
            connectionId: c.id,
            otherUserId,
            otherUserName: otherUser?.full_name ?? 'Unknown',
            otherUserPhoto: otherUser?.photos?.[0] ?? null,
            lastMessage: lastServe?.body ?? null,
            lastMessageAt: lastServe?.created_at ?? c.matched_at,
            unreadCount: count ?? 0,
            matchedAt: c.matched_at,
          };
        })
      );

      // Sort by most recent message
      previews.sort((a, b) =>
        new Date(b.lastMessageAt ?? 0).getTime() - new Date(a.lastMessageAt ?? 0).getTime()
      );

      setConnections(previews);
    } catch (e) {
      console.error('useConnections error:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  return { connections, loading, reload: load };
}
