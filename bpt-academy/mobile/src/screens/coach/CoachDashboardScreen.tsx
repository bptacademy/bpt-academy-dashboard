import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import ScreenHeader from '../../components/common/ScreenHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - 12) / 2;

export default function CoachDashboardScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [stats, setStats] = useState({ myStudents: 0, myPrograms: 0, videos: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    if (!profile) return;

    const { data: programCoachRows } = await supabase
      .from('program_coaches')
      .select('program_id')
      .eq('coach_id', profile.id);

    const programIds = programCoachRows?.map((r: any) => r.program_id) ?? [];

    const [studentsRes, videosRes] = await Promise.all([
      programIds.length > 0
        ? supabase
            .from('enrollments')
            .select('student_id', { count: 'exact', head: true })
            .in('program_id', programIds)
            .eq('status', 'active')
        : Promise.resolve({ count: 0 }),
      supabase
        .from('videos')
        .select('id', { count: 'exact', head: true })
        .eq('uploaded_by', profile.id)
        .eq('is_published', true),
    ]);

    setStats({
      myStudents: studentsRes.count ?? 0,
      myPrograms: programIds.length,
      videos:     videosRes.count ?? 0,
    });
  };

  const onRefresh = async () => { setRefreshing(true); await fetchStats(); setRefreshing(false); };
  useEffect(() => { fetchStats(); }, [profile]);

  const goToTab = (tab: string, screen: string) =>
    navigation.getParent()?.navigate(tab, { screen });

  const gridItems = [
    { icon: '👥', label: 'My Students',  onPress: () => goToTab('StudentsTab', 'Students') },
    { icon: '📋', label: 'Programs',     onPress: () => navigation.navigate('Manage') },
    { icon: '💬', label: 'Messages',     onPress: () => goToTab('MessagesTab', 'Messages') },
    { icon: '🎬', label: 'Upload Video', onPress: () => navigation.navigate('UploadVideo') },
    { icon: '✅', label: 'Attendance',   onPress: () => goToTab('StudentsTab', 'Students') },
    { icon: '🔔', label: 'Announce',     onPress: () => navigation.navigate('Announce') },
    { icon: '🏅', label: 'Divisions',    onPress: () => navigation.navigate('DivisionDashboard') },
    { icon: '🎾', label: 'Tournaments',  onPress: () => navigation.navigate('TournamentManage') },
  ];

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 80, 104) }}
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScreenHeader title="BPT Academy 🎾" dark />

      <View style={styles.hero}>
        <View>
          <Text style={styles.greeting}>Coach Dashboard 🎾</Text>
          <Text style={styles.name}>{profile?.full_name}</Text>
        </View>
        <View style={styles.coachBadge}>
          <Text style={styles.coachBadgeText}>Coach</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <TouchableOpacity style={styles.statCard} onPress={() => goToTab('StudentsTab', 'Students')}>
          <Text style={styles.statNumber}>{stats.myStudents}</Text>
          <Text style={styles.statLabel}>My Students</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Manage')}>
          <Text style={styles.statNumber}>{stats.myPrograms}</Text>
          <Text style={styles.statLabel}>Programs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('ManageVideos')}>
          <Text style={styles.statNumber}>{stats.videos}</Text>
          <Text style={styles.statLabel}>Videos</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          {gridItems.map((item) => (
            <TouchableOpacity key={item.label} style={styles.actionCard} onPress={item.onPress}>
              <Text style={styles.actionIcon}>{item.icon}</Text>
              <Text style={styles.actionLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeIcon}>🔒</Text>
        <Text style={styles.noticeText}>
          Billing, payment reconciliation, and academy settings are managed by Admins.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  hero: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, backgroundColor: '#111827' },
  greeting: { fontSize: 13, color: '#9CA3AF' },
  name: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  coachBadge: { backgroundColor: '#EA580C', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  coachBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  statsRow: { flexDirection: 'row', padding: 16, gap: 12 },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  statNumber: { fontSize: 28, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 2, textAlign: 'center' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 12 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { width: CARD_WIDTH, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  actionIcon: { fontSize: 30, marginBottom: 8 },
  actionLabel: { fontSize: 13, fontWeight: '600', color: '#374151', textAlign: 'center' },
  notice: { flexDirection: 'row', margin: 16, marginTop: 4, backgroundColor: '#FFFBEB', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#FDE68A', alignItems: 'flex-start', gap: 10 },
  noticeIcon: { fontSize: 16, marginTop: 1 },
  noticeText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 20 },
});
