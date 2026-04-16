import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Image, Dimensions} from 'react-native';
import BackHeader from '../components/common/BackHeader';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Notification } from '../types';
import BackButton from '../components/common/BackButton';

interface NotificationWithExpiry extends Notification {
  expires_at?: string | null;
}

function relativeTime(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    then.getDate() === yesterday.getDate() &&
    then.getMonth() === yesterday.getMonth() &&
    then.getFullYear() === yesterday.getFullYear()
  ) {
    return 'Yesterday';
  }
  return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function NotificationsScreen({ navigation }: any) {
  const { profile } = useAuth();
  const { unreadCount, markRead, markAllRead, refresh: refreshUnread } = useNotifications();
  const [allNotifications, setAllNotifications] = useState<NotificationWithExpiry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!profile?.id) return;
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', profile.id)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('created_at', { ascending: false });
    if (data) setAllNotifications(data as NotificationWithExpiry[]);
  }, [profile?.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchAll(), refreshUnread()]);
    setRefreshing(false);
  };

  const handleTap = async (n: NotificationWithExpiry) => {
    if (!n.read) {
      await markRead(n.id);
      setAllNotifications(prev =>
        prev.map(x => (x.id === n.id ? { ...x, read: true } : x))
      );
    }
    if (n.type === 'reenrollment_request' && n.data?.enrollment_id) {
      navigation.navigate('ReEnrollment', {
        enrollmentId: n.data.enrollment_id,
        programId: n.data.program_id,
        programTitle: (n.data.program_title as string) ?? 'Program',
        price: (n.data.price as number) ?? 0,
        deadline: n.data.deadline,
      });
    } else if (n.type === 'attendance_confirmation_request' && n.data?.session_id) {
      navigation.navigate('AttendanceConfirm', {
        session_id: n.data.session_id,
        program_title: (n.data.program_title as string) ?? 'Training Session',
        session_time: n.data.session_time,
        editable_until: n.data.editable_until,
      });
    }
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    setAllNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const renderItem = ({ item }: { item: NotificationWithExpiry }) => (
    <TouchableOpacity
      style={[styles.card, item.read ? styles.cardRead : styles.cardUnread]}
      onPress={() => handleTap(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardRow}>
        <Text style={[styles.cardTitle, item.read ? styles.titleRead : styles.titleUnread]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.cardTime}>{relativeTime(item.created_at)}</Text>
      </View>
      {item.body ? (
        <Text style={styles.cardBody} numberOfLines={2}>{item.body}</Text>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <BackButton />

      <Image source={require('../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />

      <BackHeader title="Notifications" />

      {/* Mark all read header row */}
      {unreadCount > 0 && (
        <View style={styles.markAllRow}>
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={allNotifications}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={allNotifications.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>You're all caught up! 🎉</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  markAllRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  markAllText: { fontSize: 14, fontWeight: '600', color: '#16A34A' },

  listContent: { padding: 16 },
  emptyContainer: { flex: 1 },

  card: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
  },
  cardUnread: {
    backgroundColor: '#FFFFFF',
    borderLeftColor: '#16A34A',
  },
  cardRead: {
    backgroundColor: '#F9FAFB',
    borderLeftColor: '#E5E7EB',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: { fontSize: 14, flex: 1, marginRight: 8 },
  titleUnread: { fontWeight: '700', color: '#111827' },
  titleRead: { fontWeight: '400', color: '#374151' },
  cardTime: { fontSize: 12, color: '#9CA3AF', flexShrink: 0 },
  cardBody: { fontSize: 13, color: '#6B7280', marginTop: 4, lineHeight: 18 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, color: '#6B7280', textAlign: 'center' },
});
