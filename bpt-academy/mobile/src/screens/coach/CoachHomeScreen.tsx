import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import ScreenHeader from '../../components/common/ScreenHeader';

const MENU = [
  { icon: '📊', label: 'Dashboard', screen: 'Dashboard' },
  { icon: '📋', label: 'Programs',  screen: 'Manage' },
  { icon: '🎬', label: 'Videos',    screen: 'Videos' },
  { icon: '👥', label: 'Students',  screen: 'Students' },
  { icon: '💬', label: 'Messages',  screen: 'Messages' },
  { icon: '🔔', label: 'Announce',  screen: 'Announce' },
  { icon: '👤', label: 'Profile',   screen: 'Profile' },
];

export default function CoachHomeScreen({ navigation }: any) {
  const { profile } = useAuth();
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

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScreenHeader title="BPT Academy 🎾" dark />
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Admin Dashboard 👋</Text>
          <Text style={styles.name}>{profile?.full_name}</Text>
        </View>
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>Admin</Text>
        </View>
      </View>

      {/* Stats — tappable */}
      <View style={styles.statsRow}>
        <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Students')}>
          <Text style={styles.statNumber}>{stats.students}</Text>
          <Text style={styles.statLabel}>Students</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Manage')}>
          <Text style={styles.statNumber}>{stats.programs}</Text>
          <Text style={styles.statLabel}>Programs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Videos')}>
          <Text style={styles.statNumber}>{stats.videos}</Text>
          <Text style={styles.statLabel}>Videos</Text>
        </TouchableOpacity>
      </View>

      {/* Quick actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Manage</Text>
        <View style={styles.actionGrid}>
          {[
            { icon: '📚', label: 'Programs', screen: 'ManagePrograms' },
            { icon: '👥', label: 'Students', screen: 'ManageStudents' },
            { icon: '🎬', label: 'Upload Video', screen: 'UploadVideo' },
            { icon: '🔔', label: 'Announce', screen: 'SendAnnouncement' },
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
    padding: 24, backgroundColor: '#111827',
  },
  greeting: { fontSize: 14, color: '#9CA3AF' },
  name: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  adminBadge: { backgroundColor: '#16A34A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  adminBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  statsRow: { flexDirection: 'row', padding: 16, gap: 12 },
  statCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB',
  },
  statNumber: { fontSize: 28, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 12 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: {
    width: '47%', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB',
  },
  actionIcon: { fontSize: 32, marginBottom: 8 },
  actionLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
});
