import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import ScreenHeader from '../../components/common/ScreenHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - 12) / 2;
const DISMISSED_STORAGE_KEY = 'penalty_dismissed_v1';

interface PenaltyAlert {
  coachName: string;
  programTitle: string;
  strikeCount: number;
  month: string;
  coachId: string;
  programId: string;
}

export default function CoachHomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile, isSuperAdmin, isAdmin } = useAuth();
  const [stats, setStats] = useState({ students: 0, programs: 0, videos: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [penaltyAlerts, setPenaltyAlerts] = useState<PenaltyAlert[]>([]);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());

  const fetchStats = async () => {
    const [studentsRes, programsRes, videosRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('programs').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('videos').select('id', { count: 'exact', head: true }).eq('is_published', true),
    ]);
    setStats({
      students: studentsRes.count ?? 0,
      programs: programsRes.count ?? 0,
      videos: videosRes.count ?? 0,
    });
  };

  const loadDismissed = async () => {
    try {
      const raw = await AsyncStorage.getItem(DISMISSED_STORAGE_KEY);
      if (raw) setDismissedKeys(new Set(JSON.parse(raw)));
    } catch (_) {}
  };

  const dismissPenalty = async (key: string) => {
    setDismissedKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      AsyncStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  };

  const fetchPenalties = async () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data } = await supabase
      .from('coach_penalties')
      .select('coach_id, program_id, strike_count, month, coach:profiles!coach_id(full_name), program:programs!program_id(title)')
      .eq('month', currentMonth)
      .gte('strike_count', 1)
      .order('strike_count', { ascending: false });

    if (!data) return;

    // Deduplicate by coach+program, keep highest strike count
    const seen = new Map<string, PenaltyAlert>();
    for (const row of data as any[]) {
      const key = `${row.coach_id}:${row.program_id}`;
      if (!seen.has(key) || row.strike_count > seen.get(key)!.strikeCount) {
        seen.set(key, {
          coachName: row.coach?.full_name ?? 'Unknown',
          programTitle: row.program?.title ?? 'Unknown',
          strikeCount: row.strike_count,
          month: row.month,
          coachId: row.coach_id,
          programId: row.program_id,
        });
      }
    }
    setPenaltyAlerts([...seen.values()]);
  };

  const fetchAll = async () => {
    await Promise.all([fetchStats(), fetchPenalties(), loadDismissed()]);
  };

  const onRefresh = async () => { setRefreshing(true); await fetchAll(); setRefreshing(false); };
  useEffect(() => { fetchAll(); }, []);
  useFocusEffect(useCallback(() => { fetchAll(); }, []));

  const goToStudents = () => {
    if (isSuperAdmin) {
      navigation.navigate('Students');
    } else {
      navigation.getParent()?.navigate('StudentsTab', { screen: 'Students' });
    }
  };

  const goToPrograms = () => {
    if (isSuperAdmin) {
      navigation.navigate('Manage');
    } else {
      navigation.getParent()?.navigate('ProgramsTab', { screen: 'Manage' });
    }
  };

  const gridItems = [
    { icon: '📋', label: 'Programs',     onPress: goToPrograms },
    { icon: '👥', label: 'Students',     onPress: goToStudents },
    { icon: '🏅', label: 'Divisions',    onPress: () => navigation.navigate('DivisionDashboard') },
    { icon: '🎾', label: 'Tournaments',  onPress: () => navigation.navigate('TournamentManage') },
    { icon: '💳', label: 'Payments',     onPress: () => navigation.navigate('Payments') },
    { icon: '📣', label: 'Bulk Msg',     onPress: () => navigation.navigate('BulkMsg') },
    { icon: '🎬', label: 'Upload Video', onPress: () => navigation.navigate('UploadVideo') },
    { icon: '🔔', label: 'Announce',     onPress: () => navigation.navigate('Announce') },
    { icon: '📊', label: 'Reports',      onPress: () => navigation.navigate('Reports') },
    { icon: '⚙️', label: 'Settings',     onPress: () => navigation.navigate('AcademySettings') },
    { icon: '💰', label: 'Billing',      onPress: () => navigation.navigate('BillingSettings') },
  ];

  const visiblePenalties = penaltyAlerts.filter(
    (p) => !dismissedKeys.has(`${p.coachId}:${p.programId}:${p.month}`)
  );

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 80, 104) }}
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScreenHeader title="BPT Academy 🎾" dark />
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Admin Dashboard 👋</Text>
          <Text style={styles.name}>{profile?.full_name}</Text>
        </View>
        <View style={[styles.adminBadge, isSuperAdmin && { backgroundColor: '#7C3AED' }]}>
          <Text style={styles.adminBadgeText}>
            {isSuperAdmin ? '👑 Super Admin' : 'Admin'}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <TouchableOpacity style={styles.statCard} onPress={goToStudents}>
          <Text style={styles.statNumber}>{stats.students}</Text>
          <Text style={styles.statLabel}>Students</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statCard} onPress={goToPrograms}>
          <Text style={styles.statNumber}>{stats.programs}</Text>
          <Text style={styles.statLabel}>Programs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('ManageVideos')}>
          <Text style={styles.statNumber}>{stats.videos}</Text>
          <Text style={styles.statLabel}>Videos</Text>
        </TouchableOpacity>
      </View>

      {/* Coach Penalty Alerts */}
      {visiblePenalties.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚨 Coach Penalties This Month</Text>
          {visiblePenalties.map((p) => {
            const isCritical = p.strikeCount >= 2;
            const alertKey = `${p.coachId}:${p.programId}:${p.month}`;
            return (
              <View
                key={alertKey}
                style={[styles.penaltyCard, isCritical && styles.penaltyCardCritical]}
              >
                <View style={styles.penaltyLeft}>
                  <Text style={styles.penaltyIcon}>{isCritical ? '🔴' : '🟡'}</Text>
                </View>
                <View style={styles.penaltyBody}>
                  <Text style={styles.penaltyCoach}>{p.coachName}</Text>
                  <Text style={styles.penaltyProgram}>{p.programTitle}</Text>
                  <Text style={[styles.penaltyStrikes, isCritical && styles.penaltyStrikesCritical]}>
                    {p.strikeCount} strike{p.strikeCount !== 1 ? 's' : ''} — {isCritical ? 'Review required' : 'Warning'}
                  </Text>
                </View>
                <View style={[styles.penaltyBadge, isCritical && styles.penaltyBadgeCritical]}>
                  <Text style={styles.penaltyBadgeText}>{p.strikeCount}</Text>
                </View>
                <TouchableOpacity
                  style={styles.penaltyDismiss}
                  onPress={() => dismissPenalty(alertKey)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.penaltyDismissText}>✕</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {/* Quick actions grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Manage</Text>
        <View style={styles.actionGrid}>
          {gridItems.map((item) => (
            <TouchableOpacity key={item.label} style={styles.actionCard} onPress={item.onPress}>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, backgroundColor: '#111827' },
  greeting: { fontSize: 14, color: '#9CA3AF' },
  name: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  adminBadge: { backgroundColor: '#16A34A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  adminBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  statsRow: { flexDirection: 'row', padding: 16, gap: 12 },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  statNumber: { fontSize: 28, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  section: { padding: 16, paddingBottom: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 12 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { width: CARD_WIDTH, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  actionIcon: { fontSize: 32, marginBottom: 8 },
  actionLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },

  // Penalty cards
  penaltyCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB',
    borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1.5, borderColor: '#FDE68A', gap: 12,
  },
  penaltyCardCritical: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  penaltyLeft: { width: 28, alignItems: 'center' },
  penaltyIcon: { fontSize: 20 },
  penaltyBody: { flex: 1 },
  penaltyCoach: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  penaltyProgram: { fontSize: 12, color: '#6B7280', marginBottom: 3 },
  penaltyStrikes: { fontSize: 12, fontWeight: '600', color: '#D97706' },
  penaltyStrikesCritical: { color: '#DC2626' },
  penaltyBadge: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center',
  },
  penaltyBadgeCritical: { backgroundColor: '#EF4444' },
  penaltyBadgeText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  penaltyDismiss: { paddingLeft: 4, alignItems: 'center', justifyContent: 'center' },
  penaltyDismissText: { fontSize: 18, color: '#9CA3AF', fontWeight: '600' },
});
