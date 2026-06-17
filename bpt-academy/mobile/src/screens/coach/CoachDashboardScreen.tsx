import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import ScreenHeader from '../../components/common/ScreenHeader';
import {
  UsersThree, ClipboardText, HourglassMedium, ChatCircleDots, FilmSlate,
  Bell, Ranking, Trophy, CheckCircle, type Icon as PhosphorIcon,
} from 'phosphor-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 22 * 2 - 11) / 2;

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
  const tabBarPadding = useTabBarPadding();
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

  const baseGridItems: { Icon: PhosphorIcon; label: string; color: string; onPress: () => void }[] = [
    { Icon: UsersThree,      label: 'My Students',  color: '#22cdb6', onPress: () => goToTab('StudentsTab', 'Students') },
    { Icon: ClipboardText,   label: 'Programs',     color: '#4d8bff', onPress: () => navigation.navigate('Manage') },
    { Icon: HourglassMedium, label: 'Waiting List', color: '#f6a531', onPress: () => navigation.navigate('AllWaitingLists') },
    { Icon: ChatCircleDots,  label: 'Messages',     color: '#34b8ff', onPress: () => goToTab('MessagesTab', 'Messages') },
    { Icon: FilmSlate,       label: 'Upload Video', color: '#34b8ff', onPress: () => navigation.navigate('UploadVideo') },
    { Icon: Bell,            label: 'Announce',     color: '#ff8a3d', onPress: () => navigation.navigate('Announce') },
    { Icon: Ranking,         label: 'Divisions',    color: '#9b6cff', onPress: () => navigation.navigate('DivisionDashboard') },
    { Icon: Trophy,          label: 'Tournaments',  color: '#fc4a36', onPress: () => navigation.navigate('TournamentManage') },
  ];

  const gridItems = attendanceDue.length > 0
    ? [
        ...baseGridItems.slice(0, 4),
        { Icon: CheckCircle, label: 'Attendance', color: '#33cf74', onPress: () => goToTab('StudentsTab', 'Students') },
        ...baseGridItems.slice(4),
      ]
    : baseGridItems;

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
        <Text style={styles.manageLabel}>MANAGE</Text>
        <View style={styles.actionGrid}>
          {gridItems.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.actionCard, { backgroundColor: item.color + '22', borderColor: item.color + '3d' }]}
              onPress={item.onPress}
              activeOpacity={0.8}
            >
              <item.Icon size={30} weight="duotone" color={item.color} />
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
    </View>
  );
}

const { width: SW, height: SH } = Dimensions.get('window');
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
