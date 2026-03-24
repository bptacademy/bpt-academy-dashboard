import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Enrollment, Notification } from '../../types';
import ScreenHeader from '../../components/common/ScreenHeader';

const MENU = [
  { icon: '🏠', label: 'Home',     screen: 'Home' },
  { icon: '📚', label: 'Programs', screen: 'Programs' },
  { icon: '🎬', label: 'Videos',   screen: 'Videos' },
  { icon: '📈', label: 'Progress', screen: 'Progress' },
  { icon: '💬', label: 'Messages', screen: 'Messages' },
  { icon: '👤', label: 'Profile',  screen: 'Profile' },
];

export default function HomeScreen({ navigation }: any) {
  const { profile, signOut } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!profile) return;

    const [enrollRes, notifRes] = await Promise.all([
      supabase
        .from('enrollments')
        .select('*, program:programs(*)')
        .eq('student_id', profile.id)
        .eq('status', 'active')
        .limit(3),
      supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', profile.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    if (enrollRes.data) setEnrollments(enrollRes.data);
    if (notifRes.data) setNotifications(notifRes.data);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => { fetchData(); }, [profile]);

  const skillBadgeColor = {
    beginner: '#3B82F6',
    intermediate: '#F59E0B',
    advanced: '#EF4444',
    competition: '#8B5CF6',
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScreenHeader title="BPT Academy 🎾" />

      {/* Welcome strip */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning 👋</Text>
          <Text style={styles.name}>{profile?.full_name}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: skillBadgeColor[profile?.skill_level ?? 'beginner'] }]}>
          <Text style={styles.badgeText}>
            {profile?.skill_level?.charAt(0).toUpperCase() + (profile?.skill_level?.slice(1) ?? '')}
          </Text>
        </View>
      </View>

      {/* Notifications */}
      {notifications.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Notifications</Text>
          {notifications.map((n) => (
            <View key={n.id} style={styles.notifCard}>
              <Text style={styles.notifTitle}>{n.title}</Text>
              {n.body && <Text style={styles.notifBody}>{n.body}</Text>}
            </View>
          ))}
        </View>
      )}

      {/* My Programs */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📚 My Programs</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Programs')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        {enrollments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>You're not enrolled in any programs yet.</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Programs')}>
              <Text style={styles.emptyLink}>Browse programs →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          enrollments.map((e) => (
            <TouchableOpacity
              key={e.id}
              style={styles.programCard}
              onPress={() => navigation.navigate('ProgramDetail', { programId: e.program_id })}
            >
              <Text style={styles.programTitle}>{e.program?.title}</Text>
              <Text style={styles.programMeta}>
                {e.program?.skill_level} · {e.program?.duration_weeks} weeks
              </Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '40%' }]} />
              </View>
              <Text style={styles.progressLabel}>40% complete</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
        <View style={styles.quickGrid}>
          {[
            { icon: '🎬', label: 'Training Videos', screen: 'Videos' },
            { icon: '📈', label: 'My Progress',      screen: 'Progress' },
            { icon: '🏆', label: 'Leaderboard',      screen: 'Leaderboard' },
            { icon: '🎾', label: 'Tournaments',      screen: 'Tournaments' },
            { icon: '💬', label: 'Messages',         screen: 'Messages' },
            { icon: '📝', label: 'Coach Notes',      screen: 'MyCoachNotes' },
            { icon: '🔔', label: 'Notifications',    screen: 'Notifications' },
          ].map((item) => (
            <TouchableOpacity
              key={item.screen}
              style={styles.actionCard}
              onPress={() => navigation.navigate(item.screen)}
            >
              <Text style={styles.actionIcon}>{item.icon}</Text>
              <Text style={styles.actionLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 24, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  greeting: { fontSize: 14, color: '#6B7280' },
  name: { fontSize: 22, fontWeight: '700', color: '#111827' },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  section: { padding: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 12 },
  seeAll: { color: '#16A34A', fontSize: 14, fontWeight: '600' },
  notifCard: {
    backgroundColor: '#ECFDF5', borderRadius: 10, padding: 14,
    marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#16A34A',
  },
  notifTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  notifBody: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB',
  },
  emptyText: { color: '#6B7280', fontSize: 14, marginBottom: 8 },
  emptyLink: { color: '#16A34A', fontWeight: '600', fontSize: 14 },
  programCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB',
  },
  programTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  programMeta: { fontSize: 13, color: '#6B7280', marginTop: 4, textTransform: 'capitalize' },
  progressBar: {
    height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, marginTop: 12,
  },
  progressFill: { height: '100%', backgroundColor: '#16A34A', borderRadius: 3 },
  progressLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: {
    width: '47%', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB',
  },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionLabel: { fontSize: 12, fontWeight: '600', color: '#374151', textAlign: 'center' },
});
