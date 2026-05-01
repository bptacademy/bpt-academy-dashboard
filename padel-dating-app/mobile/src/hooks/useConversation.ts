/**
 * useConversation — real-time messaging for a single connection
 *
 * - Loads existing serves from DB
 * - Subscribes to new serves via Supabase Realtime
 * - Marks unread serves as read on mount
 * - Exposes sendServe() to insert a new message
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface Message {
  id: string;
  senderId: string;
  body: string;
  createdAt: string; // ISO
  readAt: string | null;
}

export interface ConversationInfo {
  connectionId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserPhoto: string | null;
  matchedAt: string | null;
}

export function useConversation(connectionId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [info, setInfo] = useState<ConversationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!connectionId || !user) return;
    setLoading(true);
    setError(null);

    try {
      // ── 1. Load connection info + other user ─────────────────────────────
      const { data: conn } = await supabase
        .from('connections')
        .select('id, sender_id, receiver_id, matched_at')
        .eq('id', connectionId)
        .maybeSingle();

      if (!conn) throw new Error('Conversation not found');

      const otherUserId = conn.sender_id === user.id ? conn.receiver_id : conn.sender_id;

      const { data: otherUser } = await supabase
        .from('users')
        .select('id, full_name, photos')
        .eq('id', otherUserId)
        .maybeSingle();

      setInfo({
        connectionId,
        otherUserId,
        otherUserName: otherUser?.full_name ?? 'Unknown',
        otherUserPhoto: otherUser?.photos?.[0] ?? null,
        matchedAt: conn.matched_at,
      });

      // ── 2. Load existing serves ──────────────────────────────────────────
      const { data: serves } = await supabase
        .from('serves')
        .select('id, sender_id, body, created_at, read_at')
        .eq('connection_id', connectionId)
        .order('created_at', { ascending: true });

      setMessages(
        (serves ?? []).map((s: any) => ({
          id: s.id,
          senderId: s.sender_id,
          body: s.body,
          createdAt: s.created_at,
          readAt: s.read_at,
        }))
      );

      // ── 3. Mark unread serves from other user as read ────────────────────
      await supabase
        .from('serves')
        .update({ read_at: new Date().toISOString() })
        .eq('connection_id', connectionId)
        .eq('sender_id', otherUserId)
        .is('read_at', null);

    } catch (e: any) {
      setError(e.message ?? 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  }, [connectionId, user]);

  // ── Realtime subscription ────────────────────────────────────────────────
  useEffect(() => {
    if (!connectionId || !user) return;

    load();

    const channel = supabase
      .channel(`serves-${connectionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'serves',
          filter: `connection_id=eq.${connectionId}`,
        },
        (payload) => {
          const s = payload.new as any;
          // Avoid duplicates (we may have inserted it ourselves)
          setMessages(prev => {
            if (prev.find(m => m.id === s.id)) return prev;
            return [...prev, {
              id: s.id,
              senderId: s.sender_id,
              body: s.body,
              createdAt: s.created_at,
              readAt: s.read_at,
            }];
          });

          // Mark as read if it's from the other user
          if (s.sender_id !== user.id) {
            supabase
              .from('serves')
              .update({ read_at: new Date().toISOString() })
              .eq('id', s.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [connectionId, user]);

  const sendServe = async (body: string): Promise<void> => {
    if (!connectionId || !user || !body.trim()) return;
    const { error } = await supabase
      .from('serves')
      .insert({
        connection_id: connectionId,
        sender_id: user.id,
        body: body.trim(),
      });
    if (error) throw error;
  };

  return { messages, info, loading, error, sendServe };
}
