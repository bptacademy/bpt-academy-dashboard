import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Image, Dimensions} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackHeader from '../../components/common/BackHeader';
import { supabase } from '../../lib/supabase';
import {
  Profile, Enrollment, ProgramSession, SessionAttendance,
  CoachNote, Payment, Division, DIVISION_LABELS, DIVISION_COLORS,
} from '../../types';

type Tab = 'overview' | 'sessions' | 'attendance' | 'notes' | 'payments';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview',   label: 'Overview',   icon: '📋' },
  { key: 'sessions',   label: 'Sessions',   icon: '📅' },
  { key: 'attendance', label: 'Attendance', icon: '✅' },
  { key: 'notes',      label: 'Notes',      icon: '📝' },
  { key: 'payments',   label: 'Payments',   icon: '💳' },
];

interface EnrollmentWithProgress extends Enrollment {
  completedModules: number;
  totalModules: number;
}

function calcAge(dob: string): number {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function ParentChildDetailScreen({ route, navigation }: any) {
  const { child } = route.params as { child: Profile };
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);

  const [enrollments, setEnrollments] = useState<EnrollmentWithProgress[]>([]);
  const [sessions, setSessions] = useState<ProgramSession[]>([]);
  const [attendance, setAttendance] = useState<SessionAttendance[]>([]);
  const [notes, setNotes] = useState<CoachNote[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const division = child.division as Division | undefined;
  const divColor = division ? (DIVISION_COLORS[division] ?? '#16A34A') : '#16A34A';
  const divLabel = division ? (DIVISION_LABELS[division] ?? division) : 'Junior';
  const age = child.date_of_birth ? calcAge(child.date_of_birth) : null;
  const initial = child.full_name?.charAt(0)?.toUpperCase() ?? '?';

  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const [enrollRes, attendRes, notesRes, paymentsRes] = await Promise.all([
          supabase
            .from('enrollments')
            .select('*, program:programs(*)')
            .eq('student_id', child.id)
            .eq('status', 'active'),
          supabase
            .from('session_attendance')
            .select('*')
            .eq('student_id', child.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('coach_notes')
            .select('*')
            .eq('student_id', child.id)
            .eq('is_private', false)
            .order('created_at', { ascending: false }),
          supabase
            .from('payments')
            .select('*')
            .eq('student_id', child.id)
            .order('created_at', { ascending: false }),
        ]);

        if (cancelled) return;

        const rawEnrollments = enrollRes.data ?? [];
        const withProgress = await Promise.all(
          rawEnrollments.map(async (e: any) => {
            const { data: modules } = await supabase
              .from('modules')
              .select('id')
              .eq('program_id', e.program_id);
            const moduleIds = (modules ?? []).map((m: any) => m.id);
            let completedModules = 0;
            if (moduleIds.length > 0) {
              const { count } = await supabase
                .from('student_progress')
                .select('*', { count: 'exact', head: true })
                .eq('student_id', child.id)
                .eq('completed', true)
                .in('module_id', moduleIds);
              completedModules = count ?? 0;
            }
            return { ...e, completedModules, totalModules: moduleIds.length };
          }),
        );

        if (cancelled) return;
        setEnrollments(withProgress);

        const programIds = rawEnrollments.map((e: any) => e.program_id);
        if (programIds.length > 0) {
          const now = new Date().toISOString();
          const { data: sesData } = await supabase
            .from('program_sessions')
            .select('*')
            .in('program_id', programIds)
            .gte('scheduled_at', now)
            .order('scheduled_at', { ascending: true })
            .limit(20);
          if (!cancelled) setSessions(sesData ?? []);
        } else {
          setSessions([]);
        }

        if (!cancelled) {
          setAttendance(attendRes.data ?? []);
          setNotes(notesRes.data ?? []);
          setPayments(paymentsRes.data ?? []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAll();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child.id]);

  // ── Tab renderers ─────────────────────────────────────────────────────

  const renderOverview = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabPad}>
      <View style={styles.profileCard}>
        <View style={[styles.profileAvatar, { backgroundColor: divColor }]}>
          <Text style={styles.profileAvatarText}>{initial}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{child.full_name}</Text>
          {age !== null && <Text style={styles.profileAge}>{age} years old</Text>}
          <View style={[styles.divBadge, { backgroundColor: divColor + '20', borderColor: divColor }]}>
            <Text style={[styles.divBadgeText, { color: divColor }]}>{divLabel}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.subHeader}>Enrolled Programs</Text>
      {enrollments.length === 0 ? (
        <Text style={styles.emptyText}>No active programs.</Text>
      ) : (
        enrollments.map((e) => {
          const pct = e.totalModules > 0 ? e.completedModules / e.totalModules : 0;
          const pctStr = `${Math.round(pct * 100)}%`;
          return (
            <View key={e.id} style={styles.programCard}>
      <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />

              <Text style={styles.programTitle}>{(e.program as any)?.title ?? 'Program'}</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: pctStr as any }]} />
              </View>
              <Text style={styles.progressLabel}>
                {e.completedModules}/{e.totalModules} modules completed
              </Text>
            </View>
          );
        })
      )}
    </ScrollView>
  );

  const renderSessions = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabPad}>
      <Text style={styles.subHeader}>Upcoming Sessions</Text>
      {sessions.length === 0 ? (
        <Text style={styles.emptyText}>No upcoming sessions.</Text>
      ) : (
        sessions.map((s) => (
          <View key={s.id} style={styles.sessionCard}>
            <Text style={styles.sessionTitle}>{s.title}</Text>
            {s.scheduled_at && (
              <Text style={styles.sessionDate}>
                {new Date(s.scheduled_at).toLocaleDateString('en-GB', {
                  weekday: 'short', day: '2-digit', month: 'short',
                  hour: '2-digit', minute: '2-digit',
                })}
              </Text>
            )}
            {s.location && <Text style={styles.sessionLocation}>📍 {s.location}</Text>}
            <Text style={styles.sessionDuration}>⏱ {s.duration_minutes} min</Text>
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderAttendance = () => {
    const total = attendance.length;
    const attended = attendance.filter((a) => a.attended).length;
    const pct = total > 0 ? Math.round((attended / total) * 100) : 0;
    const pctStr = `${pct}%`;

    return (
      <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabPad}>
        <View style={styles.attendanceSummary}>
          <Text style={styles.attendancePct}>{pct}%</Text>
          <Text style={styles.attendanceLabel}>Attendance Rate</Text>
          <Text style={styles.attendanceCount}>{attended} of {total} sessions attended</Text>
          <View style={styles.bigProgressBg}>
            <View style={[styles.bigProgressFill, { width: pctStr as any }]} />
          </View>
        </View>

        <Text style={styles.subHeader}>Session History</Text>
        {attendance.length === 0
          ? <Text style={styles.emptyText}>No attendance records yet.</Text>
          : attendance.slice(0, 20).map((a) => (
            <View key={a.id} style={styles.attendanceRow}>
              <Text style={a.attended ? styles.attendedIcon : styles.missedIcon}>
                {a.attended ? '✅' : '❌'}
              </Text>
              <Text style={styles.attendanceRowText}>
                {new Date(a.created_at).toLocaleDateString('en-GB', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </Text>
              {a.feedback_rating != null && (
                <Text style={styles.attendanceRating}>⭐ {a.feedback_rating}/5</Text>
              )}
            </View>
          ))}
      </ScrollView>
    );
  };

  const renderNotes = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabPad}>
      <Text style={styles.subHeader}>Coach Notes</Text>
      {notes.length === 0 ? (
        <Text style={styles.emptyText}>No notes from coaches yet.</Text>
      ) : (
        notes.map((n) => (
          <View key={n.id} style={styles.noteCard}>
            <Text style={styles.noteText}>{n.note}</Text>
            <Text style={styles.noteMeta}>
              {new Date(n.created_at).toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderPayments = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabPad}>
      <Text style={styles.subHeader}>Payment History</Text>
      {payments.length === 0 ? (
        <Text style={styles.emptyText}>No payments found.</Text>
      ) : (
        payments.map((p) => {
          const statusColor =
            p.status === 'confirmed' ? '#16A34A' :
            p.status === 'pending'   ? '#B45309' :
            '#DC2626';
          const statusBg =
            p.status === 'confirmed' ? '#ECFDF5' :
            p.status === 'pending'   ? '#FEF9C3' :
            '#FEF2F2';
          return (
            <View key={p.id} style={styles.paymentRow}>
              <View>
                <Text style={styles.paymentAmount}>£{p.amount_gbp?.toFixed(2)}</Text>
                <Text style={styles.paymentDate}>
                  {new Date(p.created_at).toLocaleDateString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </Text>
              </View>
              <View style={[styles.paymentStatus, { backgroundColor: statusBg }]}>
                <Text style={[styles.paymentStatusText, { color: statusColor }]}>
                  {p.status}
                </Text>
              </View>
            </View>
          );
        })
      )}
      <TouchableOpacity
        style={styles.payBtn}
        onPress={() => navigation.navigate('Payment', { studentId: child.id })}
      >
        <Text style={styles.payBtnText}>💳 Pay for Program</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderTabContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#16A34A" />
        </View>
      );
    }
    switch (activeTab) {
      case 'overview':   return renderOverview();
      case 'sessions':   return renderSessions();
      case 'attendance': return renderAttendance();
      case 'notes':      return renderNotes();
      case 'payments':   return renderPayments();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BackHeader title={child.full_name} dark />

      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarInner}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {renderTabContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  container: { flex: 1, backgroundColor: '#F3F4F6' },

  tabBar: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tabBarInner: { paddingHorizontal: 12, paddingVertical: 4 },
  tabItem: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 2, borderRadius: 8 },
  tabItemActive: { backgroundColor: '#ECFDF5' },
  tabIcon: { fontSize: 18 },
  tabLabel: { fontSize: 11, color: '#6B7280', fontWeight: '500', marginTop: 2 },
  tabLabelActive: { color: '#16A34A', fontWeight: '700' },

  tabContent: { flex: 1 },
  tabPad: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  subHeader: { fontSize: 15, fontWeight: '700', color: '#1a2744', marginBottom: 12, marginTop: 4 },
  emptyText: { fontSize: 14, color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center', marginTop: 24 },

  profileCard: {
    backgroundColor: '#1a2744', borderRadius: 16, padding: 20,
    flexDirection: 'row', alignItems: 'center', marginBottom: 20,
  },
  profileAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  profileAvatarText: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  profileAge: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  divBadge: { marginTop: 6, alignSelf: 'flex-start', borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3 },
  divBadgeText: { fontSize: 12, fontWeight: '700' },

  programCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  programTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 8 },
  progressBarBg: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#16A34A', borderRadius: 4 },
  progressLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },

  sessionCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10,
    borderLeftWidth: 3, borderLeftColor: '#16A34A',
  },
  sessionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  sessionDate: { fontSize: 13, color: '#16A34A', marginTop: 4, fontWeight: '600' },
  sessionLocation: { fontSize: 13, color: '#6B7280', marginTop: 3 },
  sessionDuration: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },

  attendanceSummary: {
    backgroundColor: '#1a2744', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20,
  },
  attendancePct: { fontSize: 48, fontWeight: '900', color: '#16A34A' },
  attendanceLabel: { fontSize: 14, color: '#94A3B8', marginTop: 2 },
  attendanceCount: { fontSize: 13, color: '#CBD5E1', marginTop: 4, marginBottom: 12 },
  bigProgressBg: { width: '100%', height: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 5, overflow: 'hidden' },
  bigProgressFill: { height: '100%', backgroundColor: '#16A34A', borderRadius: 5 },

  attendanceRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 10,
  },
  attendedIcon: { fontSize: 16 },
  missedIcon: { fontSize: 16 },
  attendanceRowText: { fontSize: 14, color: '#374151', flex: 1 },
  attendanceRating: { fontSize: 13, color: '#F59E0B' },

  noteCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10,
    borderLeftWidth: 3, borderLeftColor: '#1a2744',
  },
  noteText: { fontSize: 14, color: '#374151', lineHeight: 21 },
  noteMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 6 },

  paymentRow: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    marginBottom: 8, alignItems: 'center', justifyContent: 'space-between',
  },
  paymentAmount: { fontSize: 16, fontWeight: '800', color: '#111827' },
  paymentDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  paymentStatus: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 },
  paymentStatusText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },

  payBtn: { backgroundColor: '#16A34A', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  payBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
