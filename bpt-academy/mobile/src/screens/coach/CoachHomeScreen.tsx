import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import ScreenHeader from '../../components/common/ScreenHeader';
import {
  ClipboardText, HourglassMedium, UsersThree, Ranking, Trophy, CreditCard,
  MegaphoneSimple, FilmSlate, Bell, ChartBar, Gear, Wallet, type Icon as PhosphorIcon,
} from 'phosphor-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 22 * 2 - 11) / 2;
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
  const tabBarPadding = useTabBarPadding();
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

  // Manage tiles — Phosphor duotone icon + accent colour per the Spectrum design.
  // All existing destinations are preserved (Settings/Billing kept for admins).
  const gridItems: { label: string; Icon: PhosphorIcon; color: string; onPress: () => void }[] = [
    { label: 'Programs',     Icon: ClipboardText,    color: '#4d8bff', onPress: goToPrograms },
    { label: 'Waiting List', Icon: HourglassMedium,  color: '#f6a531', onPress: () => navigation.navigate('AllWaitingLists') },
    { label: 'Students',     Icon: UsersThree,       color: '#22cdb6', onPress: goToStudents },
    { label: 'Divisions',    Icon: Ranking,          color: '#9b6cff', onPress: () => navigation.navigate('DivisionDashboard') },
    { label: 'Tournaments',  Icon: Trophy,           color: '#fc4a36', onPress: () => navigation.navigate('TournamentManage') },
    { label: 'Payments',     Icon: CreditCard,       color: '#33cf74', onPress: () => navigation.navigate('Payments') },
    { label: 'Bulk Msg',     Icon: MegaphoneSimple,  color: '#ff5d97', onPress: () => navigation.navigate('BulkMsg') },
    { label: 'Upload Video', Icon: FilmSlate,        color: '#34b8ff', onPress: () => navigation.navigate('UploadVideo') },
    { label: 'Announce',     Icon: Bell,             color: '#ff8a3d', onPress: () => navigation.navigate('Announce') },
    { label: 'Reports',      Icon: ChartBar,         color: '#6d7bff', onPress: () => navigation.navigate('Reports') },
    { label: 'Settings',     Icon: Gear,             color: '#8b98bd', onPress: () => navigation.navigate('AcademySettings') },
    { label: 'Billing',      Icon: Wallet,           color: '#33cf74', onPress: () => navigation.navigate('BillingSettings') },
  ];

  const visiblePenalties = penaltyAlerts.filter(
    (p) => !dismissedKeys.has(`${p.coachId}:${p.programId}:${p.month}`)
  );

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0c1635', '#0a1024', '#080d1e']}
        locations={[0, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 80, 104) }}
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b98bd" />}
      >
      <ScreenHeader
        title=""
        homeHeader
        profileName={profile?.full_name}
        profileRole={profile?.role}
        profileAvatar={(profile as any)?.avatar_url ?? null}
        onAvatarPress={() => navigation.navigate('Profile')}
      />

      {/* Stats */}
      <View style={styles.statsRow}>
        <TouchableOpacity style={styles.statCard} onPress={goToStudents} activeOpacity={0.85}>
          <Text style={styles.statNumber}>{stats.students}</Text>
          <Text style={styles.statLabel}>Students</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statCard} onPress={goToPrograms} activeOpacity={0.85}>
          <Text style={styles.statNumber}>{stats.programs}</Text>
          <Text style={styles.statLabel}>Programs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('ManageVideos')} activeOpacity={0.85}>
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

      {/* Manage grid */}
      <View style={styles.section}>
        <Text style={styles.manageLabel}>MANAGE</Text>
        <View style={styles.actionGrid}>
          {gridItems.map(({ label, Icon, color, onPress }) => (
            <TouchableOpacity
              key={label}
              style={[styles.actionCard, { backgroundColor: color + '22', borderColor: color + '3d' }]}
              onPress={onPress}
              activeOpacity={0.8}
            >
              <Icon size={30} weight="duotone" color={color} />
              <Text style={styles.actionLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a1024' },
  container: { flex: 1 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 22, paddingTop: 12, paddingBottom: 6, gap: 10 },
  statCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
  },
  statNumber: { fontSize: 30, color: '#ffffff', fontFamily: 'TTOctosquaresCond-Bold', lineHeight: 32 },
  statLabel: { fontSize: 11, color: '#8b98bd', marginTop: 3, textAlign: 'center' },
  section: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 4 },
  sectionTitle: { fontSize: 17, color: '#F0F6FC', marginBottom: 12, fontFamily: 'TTOctosquaresCond-Bold' },
  manageLabel: {
    fontSize: 15, color: '#8b98bd', marginBottom: 10,
    letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'TTOctosquaresCond-Bold',
  },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },
  actionCard: {
    width: CARD_WIDTH, borderRadius: 16, paddingVertical: 22, alignItems: 'center',
    borderWidth: 1, gap: 9,
  },
  actionLabel: { fontSize: 12.5, color: '#dfe5f7', textAlign: 'center', fontFamily: 'TTOctosquaresCond-Bold' },

  // Penalty cards (unchanged)
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
