import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Notification } from '../types';

export interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useNotifications(): UseNotificationsResult {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchUnread = useCallback(async () => {
    if (!profile?.id) return;
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', profile.id)
      .eq('read', false)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('created_at', { ascending: false });
    if (data) setNotifications(data as Notification[]);
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;

    fetchUnread();

    // Subscribe to realtime — fires on INSERT and UPDATE (REPLICA IDENTITY FULL enabled)
    const channel = supabase
      .channel(`notifications:${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${profile.id}`,
        },
        (payload) => {
          // On UPDATE: if notification was marked read, remove it from state immediately
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any;
            if (updated?.read === true) {
              setNotifications(prev => prev.filter(n => n.id !== updated.id));
              return;
            }
          }
          // On INSERT or other changes: re-fetch
          fetchUnread();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [profile?.id, fetchUnread]);

  const markRead = useCallback(async (id: string) => {
    // Optimistic update — remove from state immediately before DB confirms
    setNotifications(prev => prev.filter(n => n.id !== id));
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!profile?.id) return;
    const ids = notifications.map(n => n.id);
    if (ids.length === 0) return;
    // Optimistic update — clear state immediately
    setNotifications([]);
    await supabase.from('notifications').update({ read: true }).in('id', ids);
  }, [profile?.id, notifications]);

  const refresh = useCallback(async () => {
    await fetchUnread();
  }, [fetchUnread]);

  return {
    notifications,
    unreadCount: notifications.length,
    markRead,
    markAllRead,
    refresh,
  };
}
