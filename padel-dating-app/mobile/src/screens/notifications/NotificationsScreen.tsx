import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, StatusBar, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { theme, fonts } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotifItem {
  id: string;
  emoji: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  // navigation
  screen: string | null;
  params: Record<string, any>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(isoDate: string): string {
  const ms = Date.now() - new Date(isoDate).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(isoDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function connectionToNotif(conn: any, myUserId: string): NotifItem {
  const isIncoming = conn.receiver_id === myUserId;
  const isAccepted = conn.status === 'accepted';
  const action = conn.action_type ?? 'connect';
  const otherName = isIncoming
    ? (conn.sender?.full_name ?? 'Someone')
    : (conn.receiver?.full_name ?? 'Someone');

  if (isAccepted) {
    return {
      id: `${conn.id}-accepted`,
      emoji: '💘',
      title: "It's a match!",
      body: `You and ${otherName} are connected. The court is yours.`,
      createdAt: conn.updated_at ?? conn.created_at,
      read: false,
      screen: 'MutualVolleyMatch',
      params: { connectionId: conn.id },
    };
  }

  if (isIncoming) {
    const emojiMap: Record<string, string> = {
      volley: '💌',
      connect: '🤝',
      play_again: '🎾',
    };
    const titleMap: Record<string, string> = {
      volley: `${otherName} sent you a Volley`,
      connect: `${otherName} wants to connect`,
      play_again: `${otherName} sent you a Serve`,
    };
    const bodyMap: Record<string, string> = {
      volley: 'Tap to respond.',
      connect: 'You played together recently.',
      play_again: 'They want to play again!',
    };
    return {
      id: conn.id,
      emoji: emojiMap[action] ?? '📬',
      title: titleMap[action] ?? `${otherName} sent you a request`,
      body: bodyMap[action] ?? '',
      createdAt: conn.created_at,
      read: false,
      screen: action === 'play_again' ? 'Conversation' : 'Conversation',
      params: { connectionId: conn.id },
    };
  }

  // Outgoing + accepted
  return {
    id: conn.id,
    emoji: '✅',
    title: `${otherName} accepted`,
    body: `${otherName} accepted your connection request.`,
    createdAt: conn.updated_at ?? conn.created_at,
    read: false,
    screen: 'Conversation',
    params: { connectionId: conn.id },
  };
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function NotificationsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const tabBarPadding = useTabBarPadding();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Incoming connections to me
      const { data: incoming } = await supabase
        .from('connections')
        .select('id, sender_id, receiver_id, action_type, status, created_at, updated_at, sender:users!connections_sender_id_fkey(full_name)')
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);

      // My outgoing accepted connections
      const { data: accepted } = await supabase
        .from('connections')
        .select('id, sender_id, receiver_id, action_type, status, created_at, updated_at, receiver:users!connections_receiver_id_fkey(full_name)')
        .eq('sender_id', user.id)
        .eq('status', 'accepted')
        .order('updated_at', { ascending: false })
        .limit(20);

      const all: NotifItem[] = [];

      for (const c of (incoming ?? []) as any[]) {
        all.push(connectionToNotif(c, user.id));
      }
      for (const c of (accepted ?? []) as any[]) {
        all.push(connectionToNotif(c, user.id));
      }

      // Sort by date desc, deduplicate by id
      const seen = new Set<string>();
      const deduped = all
        .filter(n => {
          if (seen.has(n.id)) return false;
          seen.add(n.id);
          return true;
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setNotifications(deduped);
    } catch (e) {
      console.error('Notifications load error:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
    // Mark all as read when this screen is opened
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, [load]);

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleTap = (notif: NotifItem) => {
    markRead(notif.id);
    if (!notif.screen) return;
    try {
      navigation.navigate(notif.screen, notif.params);
    } catch (e) {
      // screen may not be in current navigator
      console.log('Navigate error:', e);
    }
  };

  return (
    <View style={{flex:1, backgroundColor:'transparent'}}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
      

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={markAllRead}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPadding }]}>
          {notifications.map(n => (
            <TouchableOpacity
              key={n.id}
              style={[styles.notifRow, !n.read && styles.notifRowUnread]}
              onPress={() => handleTap(n)}
              activeOpacity={0.75}
            >
              <View style={[styles.notifIcon, !n.read && styles.notifIconUnread]}>
                <Text style={styles.notifEmoji}>{n.emoji}</Text>
              </View>
              <View style={styles.notifContent}>
                <Text style={[styles.notifTitle, !n.read && styles.notifTitleUnread]}>
                  {n.title}
                </Text>
                <Text style={styles.notifBody} numberOfLines={2}>{n.body}</Text>
                <Text style={styles.notifTime}>{timeAgo(n.createdAt)}</Text>
              </View>
              {!n.read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          ))}

          {notifications.length === 0 && (
            <View style={styles.emptyState}>
              <Image source={require('../../../assets/icons/Notifications.png')} style={styles.emptyBellImg} />
              <Text style={styles.emptyTitle}>All caught up</Text>
              <Text style={styles.emptySub}>New volleys, serves and match prompts will appear here.</Text>
            </View>
          )}

          {notifications.length > 0 && notifications.every(n => n.read) && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>✓</Text>
              <Text style={styles.emptyTitle}>All caught up</Text>
              <Text style={styles.emptySub}>You're up to date.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: theme.bgCard,
  },
  headerTitle: { fontSize: 18.2, fontFamily: fonts.bodyBold, color: theme.textPrimary },
  backText: { fontSize: 17.1, color: theme.textSecondary, fontFamily: fonts.bodyLight },
  markAllText: { fontSize: 13.9, color: theme.primary, fontFamily: fonts.bodyLight },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingTop: 8, paddingBottom: 120 },

  notifRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: theme.bgCard,
  },
  notifRowUnread: { backgroundColor: 'rgba(0,212,200,0.04)' },
  notifIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: theme.bgCard, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: theme.border,
  },
  notifIconUnread: { backgroundColor: theme.primaryDim, borderColor: theme.primaryBorder },
  notifEmoji: { fontSize: 20 },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 16.1, fontFamily: fonts.bodyLight, color: theme.textSecondary, marginBottom: 3 },
  notifTitleUnread: { fontFamily: fonts.bodyBold, color: theme.textPrimary },
  notifBody: { fontSize: 13.9, color: theme.textMuted, lineHeight: 18, marginBottom: 4, fontFamily: fonts.bodyLight },
  notifTime: { fontSize: 11.8, color: theme.textDim, fontFamily: fonts.bodyLight },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary, marginTop: 6 },

  emptyState: { padding: 48, alignItems: 'center' },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyBellImg: { width: 72, height: 72, tintColor: '#0ACCB5', marginBottom: 16, opacity: 0.9 },
  emptyTitle: { fontSize: 19.3, fontFamily: fonts.bodyBold, color: theme.textPrimary, marginBottom: 8 },
  emptySub: { fontSize: 15, color: theme.textMuted, textAlign: 'center', lineHeight: 22, fontFamily: fonts.bodyLight },
});
