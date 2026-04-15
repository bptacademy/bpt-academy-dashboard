import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import ScreenHeader from '../../components/common/ScreenHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - 12) / 2;

interface AttendanceDueSession {
  id: string;
  title: string;
  program_id: string;
  programTitle: string;
  attendance_deadline: string;
  hoursRemaining: number;
}

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export default function CoachDashboardScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [stats, setStats] = useState({ myStudents: 0, myPrograms: 0, videos: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceDue, setAttendanceDue] = useState<AttendanceDueSession[]>([]);

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

    // Fetch sessions with attendance due
    if (programIds.length > 0) {
      await fetchAttendanceDue(programIds);
    }
  };

  const fetchAttendanceDue = async (programIds: string[]) => {
    const now = new Date();
    const { data: sessions } = await supabase
      .from('program_sessions')
      .select('id, title, program_id, attendance_deadline, programs:program_id(title)')
      .in('program_id', programIds)
      .eq('attendance_completed', false)
      .not('attendance_deadline', 'is', null)
      .gt('attendance_deadline', now.toISOString())
      .order('attendance_deadline', { ascending: true });

    if (!sessions) return;

    const due: AttendanceDueSession[] = sessions
      .filter((s: any) => {
        const deadline = new Date(s.attendance_deadline);
        const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursRemaining <= 23.99;
      })
      .map((s: any) => {
        const deadline = new Date(s.attendance_deadline);
        const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
        return {
          id: s.id,
          title: s.title,
          program_id: s.program_id,
          programTitle: (Array.isArray(s.programs) ? s.programs[0]?.title : s.programs?.title) ?? 'Program',
          attendance_deadline: s.attendance_deadline,
          hoursRemaining,
        };
      });

    setAttendanceDue(due);
  };

  const onRefresh = async () => { setRefreshing(true); await fetchStats(); setRefreshing(false); };
  useEffect(() => { fetchStats(); }, [profile]);
  useFocusEffect(useCallback(() => { fetchStats(); }, [profile]));

  const goToTab = (tab: string, screen: string) =>
    navigation.getParent()?.navigate(tab, { screen });

  const baseGridItems = [
    { icon: '👥', label: 'My Students',  onPress: () => goToTab('StudentsTab', 'Students') },
    { icon: '📋', label: 'Programs',     onPress: () => navigation.navigate('Manage') },
    { icon: '💬', label: 'Messages',     onPress: () => goToTab('MessagesTab', 'Messages') },
    { icon: '🎬', label: 'Upload Video', onPress: () => navigation.navigate('UploadVideo') },
    { icon: '🔔', label: 'Announce',     onPress: () => navigation.navigate('Announce') },
    { icon: '🏅', label: 'Divisions',    onPress: () => navigation.navigate('DivisionDashboard') },
    { icon: '🎾', label: 'Tournaments',  onPress: () => navigation.navigate('TournamentManage') },
  ];

  const gridItems = attendanceDue.length > 0
    ? [
        ...baseGridItems.slice(0, 4),
        { icon: '✅', label: 'Attendance', onPress: () => goToTab('StudentsTab', 'Students') },
        ...baseGridItems.slice(4),
      ]
    : baseGridItems;

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 80, 104) }}
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* New home header: avatar + welcome + role pill + bell */}
      <ScreenHeader
        title=""
        homeHeader
        profileName={profile?.full_name}
        profileRole={profile?.role}
        profileAvatar={(profile as any)?.avatar_url ?? null}
        onAvatarPress={() => navigation.navigate('Profile')}
      />

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

      {/* Attendance Due Cards */}
      {attendanceDue.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✅ Attendance Required</Text>
          {attendanceDue.map((s) => {
            const isUrgent = s.hoursRemaining <= 4;
            const hoursLabel = s.hoursRemaining < 1
              ? 'Less than 1h left'
              : `${Math.ceil(s.hoursRemaining)}h remaining`;
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.attendanceCard, isUrgent && styles.attendanceCardUrgent]}
                onPress={() => navigation.navigate('Attendance', {
                  sessionId: s.id,
                  sessionTitle: s.title,
                })}
                activeOpacity={0.8}
              >
                <View style={styles.attendanceCardLeft}>
                  <Text style={styles.attendanceCardIcon}>{isUrgent ? '🚨' : '⏰'}</Text>
                </View>
                <View style={styles.attendanceCardBody}>
                  <Text style={styles.attendanceCardTitle}>{s.title}</Text>
                  <Text style={styles.attendanceCardProgram}>{s.programTitle}</Text>
                  <Text style={[styles.attendanceCardTime, isUrgent && styles.attendanceCardTimeUrgent]}>
                    {hoursLabel}
                  </Text>
                </View>
                <Text style={styles.attendanceCardChevron}>›</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

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
  statsRow: { flexDirection: 'row', padding: 16, gap: 12 },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  statNumber: { fontSize: 28, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 2, textAlign: 'center' },
  section: { padding: 16, paddingBottom: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 12 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { width: CARD_WIDTH, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  actionIcon: { fontSize: 30, marginBottom: 8 },
  actionLabel: { fontSize: 13, fontWeight: '600', color: '#374151', textAlign: 'center' },
  notice: { flexDirection: 'row', margin: 16, marginTop: 4, backgroundColor: '#FFFBEB', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#FDE68A', alignItems: 'flex-start', gap: 10 },
  noticeIcon: { fontSize: 16, marginTop: 1 },
  noticeText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 20 },

  // Attendance due cards
  attendanceCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1.5, borderColor: '#F59E0B', gap: 12,
  },
  attendanceCardUrgent: { borderColor: '#EF4444', backgroundColor: '#FFF5F5' },
  attendanceCardLeft: { width: 36, alignItems: 'center' },
  attendanceCardIcon: { fontSize: 24 },
  attendanceCardBody: { flex: 1 },
  attendanceCardTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  attendanceCardProgram: { fontSize: 12, color: '#6B7280', marginBottom: 3 },
  attendanceCardTime: { fontSize: 12, fontWeight: '600', color: '#F59E0B' },
  attendanceCardTimeUrgent: { color: '#EF4444' },
  attendanceCardChevron: { fontSize: 24, color: '#9CA3AF' },
});
