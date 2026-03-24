import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Notification } from '../../types';
import ScreenHeader from '../../components/common/ScreenHeader';

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  announcement:     { icon: '📢', color: '#3B82F6' },
  promotion:        { icon: '🚀', color: '#16A34A' },
  session_reminder: { icon: '📅', color: '#F59E0B' },
  new_video:        { icon: '🎬', color: '#8B5CF6' },
  message:          { icon: '💬', color: '#EC4899' },
  tournament:       { icon: '🏆', color: '#EF4444' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function NotificationsScreen() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setNotifications(data as Notification[]);
  }, [profile]);

  const load = async () => {
    setLoading(true);
    await fetchNotifications();
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  useEffect(() => { load(); }, [profile]);

  const markAllRead = async () => {
    if (!profile) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('recipient_id', profile.id)
      .eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Notifications" />

      {unreadCount > 0 && (
        <View style={styles.headerBar}>
          <Text style={styles.unreadText}>{unreadCount} unread</Text>
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.markAllBtn}>Mark all read</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#16A34A" style={styles.loader} />
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {notifications.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyText}>
                Announcements, promotion updates, and session reminders will appear here.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {notifications.map((n) => {
                const config = TYPE_CONFIG[n.type ?? 'announcement'] ?? TYPE_CONFIG.announcement;
                return (
                  <TouchableOpacity
                    key={n.id}
                    style={[styles.card, !n.read && styles.cardUnread]}
                    onPress={() => { if (!n.read) markRead(n.id); }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconContainer, { backgroundColor: config.color + '18' }]}>
                      <Text style={styles.icon}>{config.icon}</Text>
                    </View>
                    <View style={styles.cardBody}>
                      <View style={styles.cardTop}>
                        <Text
                          style={[styles.cardTitle, !n.read && styles.cardTitleUnread]}
                          numberOfLines={1}
                        >
                          {n.title}
                        </Text>
                        <Text style={styles.cardTime}>{timeAgo(n.created_at)}</Text>
                      </View>
                      {n.body ? (
                        <Text style={styles.cardText} numberOfLines={2}>{n.body}</Text>
                      ) : null}
                      <View style={[styles.typeBadge, { backgroundColor: config.color + '18' }]}>
                        <Text style={[styles.typeBadgeText, { color: config.color }]}>
                          {(n.type ?? 'notification').replace(/_/g, ' ')}
                        </Text>
                      </View>
                    </View>
                    {!n.read && <View style={[styles.unreadDot, { backgroundColor: config.color }]} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  headerBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  unreadText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  markAllBtn: { fontSize: 13, fontWeight: '700', color: '#16A34A' },
  loader: { marginTop: 60 },
  content: { padding: 16, paddingBottom: 40 },
  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 40,
    alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', marginTop: 20,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptyText: { color: '#6B7280', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  list: { gap: 8 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderWidth: 1, borderColor: '#E5E7EB', position: 'relative',
  },
  cardUnread: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  iconContainer: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  icon: { fontSize: 20 },
  cardBody: { flex: 1 },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 4,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#374151', flex: 1, marginRight: 8 },
  cardTitleUnread: { color: '#111827', fontWeight: '700' },
  cardTime: { fontSize: 11, color: '#9CA3AF', flexShrink: 0 },
  cardText: { fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 8 },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  typeBadgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  unreadDot: {
    position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: 4,
  },
});
