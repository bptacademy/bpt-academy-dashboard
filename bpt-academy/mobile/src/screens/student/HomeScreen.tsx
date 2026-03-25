import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Enrollment, Notification } from '../../types';
import ScreenHeader from '../../components/common/ScreenHeader';

interface EnrollmentWithProgress extends Enrollment {
  completedModules: number;
  totalModules: number;
}

export default function HomeScreen({ navigation }: any) {
  const { profile } = useAuth();
  const [enrollments, setEnrollments] = useState<EnrollmentWithProgress[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Keep dismissed IDs in a ref so they survive re-renders and re-fetches
  const dismissedRef = useRef<Set<string>>(new Set());

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

    // Wire real progress for each enrollment
    if (enrollRes.data) {
      const withProgress = await Promise.all(
        enrollRes.data.map(async (e) => {
          const { data: modules } = await supabase
            .from('modules')
            .select('id')
            .eq('program_id', e.program_id);

          const moduleIds = (modules ?? []).map((m: { id: string }) => m.id);
          let completedModules = 0;

          if (moduleIds.length > 0) {
            const { count } = await supabase
              .from('student_progress')
              .select('*', { count: 'exact', head: true })
              .eq('student_id', profile.id)
              .eq('completed', true)
              .in('module_id', moduleIds);
            completedModules = count ?? 0;
          }

          return {
            ...e,
            completedModules,
            totalModules: moduleIds.length,
          };
        })
      );
      setEnrollments(withProgress);
    }

    // Filter out already-dismissed notifications using the ref
    if (notifRes.data) {
      setNotifications(
        notifRes.data.filter((n: Notification) => !dismissedRef.current.has(n.id))
      );
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => { fetchData(); }, [profile]);

  const dismissNotification = async (id: string) => {
    // Remove from UI immediately — do this first so it's instant
    dismissedRef.current.add(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    // Best-effort mark as read in DB (may silently fail due to RLS for admin accounts)
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  };

  const skillBadgeColor: Record<string, string> = {
    beginner:     '#3B82F6',
    intermediate: '#F59E0B',
    advanced:     '#EF4444',
  };

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning 🌅';
    if (hour >= 12 && hour < 17) return 'Good afternoon ☀️';
    if (hour >= 17 && hour < 21) return 'Good evening 🌆';
    return 'Good night 🌙';
  })();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScreenHeader title="BPT Academy 🎾" />

      {/* Welcome strip */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.name}>{profile?.full_name}</Text>
        </View>
        {profile?.skill_level && (
          <View style={[styles.badge, { backgroundColor: skillBadgeColor[profile.skill_level] ?? '#6B7280' }]}>
            <Text style={styles.badgeText}>
              {profile.skill_level.charAt(0).toUpperCase() + profile.skill_level.slice(1)}
            </Text>
          </View>
        )}
      </View>

      {/* Notifications */}
      {notifications.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Notifications</Text>
          {notifications.map((n) => (
            <TouchableOpacity
              key={n.id}
              style={styles.notifCard}
              onPress={() => dismissNotification(n.id)}
              activeOpacity={0.7}
            >
              <View style={styles.notifRow}>
                <Text style={styles.notifTitle}>{n.title}</Text>
                <Text style={styles.notifDismiss}>✕</Text>
              </View>
              {n.body ? <Text style={styles.notifBody} numberOfLines={2}>{n.body}</Text> : null}
            </TouchableOpacity>
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
          enrollments.map((e) => {
            const pct = e.totalModules > 0
              ? Math.round((e.completedModules / e.totalModules) * 100)
              : 0;
            return (
              <TouchableOpacity
                key={e.id}
                style={styles.programCard}
                onPress={() => navigation.navigate('ProgramDetail', { programId: e.program_id })}
              >
                <Text style={styles.programTitle}>{(e.program as any)?.title}</Text>
                <Text style={styles.programMeta}>
                  {(e.program as any)?.duration_weeks} weeks
                  {(e.program as any)?.sessions_per_week ? ` · ${(e.program as any).sessions_per_week}x/week` : ''}
                </Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${pct}%` }]} />
                </View>
                <Text style={styles.progressLabel}>
                  {e.completedModules}/{e.totalModules} sessions complete · {pct}%
                </Text>
              </TouchableOpacity>
            );
          })
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
  notifRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notifTitle: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 },
  notifDismiss: { fontSize: 14, color: '#9CA3AF', paddingLeft: 8 },
  notifBody: { fontSize: 13, color: '#6B7280', marginTop: 4, lineHeight: 18 },
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
  programMeta: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  progressBar: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, marginTop: 12 },
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
