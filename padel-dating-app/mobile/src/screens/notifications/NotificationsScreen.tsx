import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../lib/theme';

const MOCK_NOTIFICATIONS = [
  {
    id: '1', type: 'volley_match', emoji: '💘',
    title: "It's a match!",
    body: "You and Sofia both sent a Volley. The court is yours.",
    time: '2m ago', read: false,
    screen: 'MutualVolleyMatch',
  },
  {
    id: '2', type: 'serve', emoji: '📬',
    title: 'New Serve from James',
    body: 'In for Sunday at Carbon? 🎾',
    time: '1h ago', read: false,
    screen: 'Conversation',
  },
  {
    id: '3', type: 'post_match', emoji: '📅',
    title: 'Post-match check-in',
    body: 'You played with 3 people yesterday. Want to connect?',
    time: 'Yesterday', read: true,
    screen: 'PostMatchPrompt',
  },
  {
    id: '4', type: 'sync', emoji: '🔄',
    title: 'Sync complete',
    body: '12 new matches imported from Playtomic.',
    time: '2 days ago', read: true,
    screen: 'PlatformSync',
  },
];

export default function NotificationsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleTap = (notif: any) => {
    markRead(notif.id);
    // In production: navigate to the relevant screen with params
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
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
              <Text style={styles.notifTime}>{n.time}</Text>
            </View>
            {!n.read && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        ))}

        {notifications.every(n => n.read) && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={styles.emptyTitle}>All caught up</Text>
            <Text style={styles.emptySub}>New volleys, serves and match prompts will appear here.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: theme.bgCard,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.textPrimary },
  backText: { fontSize: 16, color: theme.textSecondary },
  markAllText: { fontSize: 13, color: theme.primary },
  scroll: { paddingTop: 8 },

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
  notifTitle: { fontSize: 15, fontWeight: '500', color: theme.textSecondary, marginBottom: 3 },
  notifTitleUnread: { fontWeight: '700', color: theme.textPrimary },
  notifBody: { fontSize: 13, color: theme.textMuted, lineHeight: 18, marginBottom: 4 },
  notifTime: { fontSize: 11, color: theme.textDim },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary, marginTop: 6 },

  emptyState: { padding: 48, alignItems: 'center' },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.textPrimary, marginBottom: 8 },
  emptySub: { fontSize: 14, color: theme.textMuted, textAlign: 'center', lineHeight: 22 },
});
