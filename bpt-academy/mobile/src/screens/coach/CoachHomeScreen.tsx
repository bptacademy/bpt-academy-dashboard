import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import ScreenHeader from '../../components/common/ScreenHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - 12) / 2;

export default function CoachHomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile, isSuperAdmin, isAdmin } = useAuth();
  const [stats, setStats] = useState({ students: 0, programs: 0, videos: 0 });
  const [refreshing, setRefreshing] = useState(false);

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

  const onRefresh = async () => { setRefreshing(true); await fetchStats(); setRefreshing(false); };
  useEffect(() => { fetchStats(); }, []);

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
  section: { padding: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 12 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { width: CARD_WIDTH, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  actionIcon: { fontSize: 32, marginBottom: 8 },
  actionLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
});
