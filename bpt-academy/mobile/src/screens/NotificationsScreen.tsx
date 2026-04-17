import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
  Image, Dimensions, Modal, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackHeader from '../components/common/BackHeader';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Notification } from '../types';

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
  ) return 'Yesterday';
  return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function typeIcon(type: string): string {
  switch (type) {
    case 'reenrollment_request':           return '🔄';
    case 'attendance_confirmation_request': return '✅';
    case 'enrollment':                     return '🎾';
    case 'waitlist_miss':                  return '📋';
    case 'welcome':                        return '👋';
    case 'admin_new_registration':         return '🆕';
    case 'announcement':                   return '📢';
    case 'session_reminder':               return '⏰';
    default:                               return '🔔';
  }
}

export default function NotificationsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { unreadCount, markRead, markAllRead, refresh: refreshUnread } = useNotifications();
  const [allNotifications, setAllNotifications] = useState<NotificationWithExpiry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<NotificationWithExpiry | null>(null);

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

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchAll(), refreshUnread()]);
    setRefreshing(false);
  };

  const handleTap = async (n: NotificationWithExpiry) => {
    // Mark as read
    if (!n.read) {
      await markRead(n.id);
      setAllNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    }
    // Navigate for actionable types, otherwise show detail modal
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
    } else {
      // All other types: open detail modal
      setSelected(n);
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
      activeOpacity={0.75}
    >
      <Text style={styles.cardIcon}>{typeIcon(item.type)}</Text>
      <View style={styles.cardContent}>
        <View style={styles.cardRow}>
          <Text style={[styles.cardTitle, item.read ? styles.titleRead : styles.titleUnread]} numberOfLines={2}>
            {item.title}
          </Text>
          {!item.read && <View style={styles.unreadDot} />}
        </View>
        {item.body ? <Text style={styles.cardBody} numberOfLines={2}>{item.body}</Text> : null}
        <Text style={styles.cardTime}>{relativeTime(item.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Image source={require('../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />
      <BackHeader title="Notifications" />

      {unreadCount > 0 && (
        <View style={styles.markAllRow}>
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={allNotifications}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          allNotifications.length === 0 ? styles.emptyContainer : styles.listContent,
          { paddingBottom: 48 + insets.bottom + 16 },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyText}>You're all caught up!</Text>
          </View>
        }
      />

      {/* Detail modal — for notifications without a dedicated screen */}
      <Modal
        visible={!!selected}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            {selected && (
              <ScrollView contentContainerStyle={styles.modalBody}>
                <Text style={styles.modalIcon}>{typeIcon(selected.type)}</Text>
                <Text style={styles.modalTitle}>{selected.title}</Text>
                <Text style={styles.modalTime}>{relativeTime(selected.created_at)}</Text>
                {selected.body ? (
                  <Text style={styles.modalBodyText}>{selected.body}</Text>
                ) : null}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.modalClose} onPress={() => setSelected(null)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  bgImage: { position: 'absolute', top: 0, left: 0, width, height },
  container: { flex: 1, backgroundColor: '#0B1628' },

  markAllRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'flex-end',
    backgroundColor: 'rgba(17,30,51,0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  markAllText: { fontSize: 14, fontWeight: '600', color: '#3B82F6' },

  listContent: { padding: 16 },
  emptyContainer: { flex: 1 },

  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
  },
  cardUnread: {
    backgroundColor: 'rgba(59,130,246,0.10)',
    borderColor: 'rgba(59,130,246,0.30)',
  },
  cardRead: {
    backgroundColor: 'rgba(17,30,51,0.75)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardIcon: { fontSize: 22, marginTop: 2 },
  cardContent: { flex: 1 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardTitle: { fontSize: 14, flex: 1 },
  titleUnread: { fontWeight: '700', color: '#F0F6FC' },
  titleRead: { fontWeight: '400', color: '#7A8FA6' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6', marginTop: 4, flexShrink: 0 },
  cardBody: { fontSize: 13, color: '#7A8FA6', marginTop: 4, lineHeight: 18 },
  cardTime: { fontSize: 11, color: '#4B5563', marginTop: 6 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#7A8FA6', textAlign: 'center' },

  // Detail modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: {
    backgroundColor: '#111E33',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    minHeight: 240,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center', marginTop: 12, marginBottom: 8,
  },
  modalBody: { padding: 24, alignItems: 'center' },
  modalIcon: { fontSize: 48, marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#F0F6FC', textAlign: 'center', marginBottom: 6 },
  modalTime: { fontSize: 12, color: '#7A8FA6', marginBottom: 16 },
  modalBodyText: { fontSize: 15, color: '#CBD5E1', lineHeight: 22, textAlign: 'center' },
  modalClose: {
    marginHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  modalCloseText: { fontSize: 15, fontWeight: '600', color: '#F0F6FC' },
});
