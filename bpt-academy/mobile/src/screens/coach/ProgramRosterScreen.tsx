import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Program, EnrollmentStatus, Division, DIVISION_LABELS, DIVISION_COLORS } from '../../types';
import BackHeader from '../../components/common/BackHeader';

interface EnrollmentRow {
  id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  student: {
    id: string;
    full_name: string;
    skill_level?: string;
    phone?: string;
  };
}

const STATUS_COLORS: Record<EnrollmentStatus, { bg: string; text: string }> = {
  active:     { bg: '#ECFDF5', text: '#16A34A' },
  waitlisted: { bg: '#FFFBEB', text: '#D97706' },
  completed:  { bg: '#EFF6FF', text: '#2563EB' },
  cancelled:  { bg: '#FEF2F2', text: '#DC2626' },
};

export default function ProgramRosterScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { programId } = route.params;
  const [program, setProgram] = useState<Program | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showEnroll, setShowEnroll] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<{id: string, full_name: string}[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  const fetchData = async () => {
    const [progRes, enrollRes] = await Promise.all([
      supabase.from('programs').select('*').eq('id', programId).single(),
      supabase
        .from('enrollments')
        .select('id, status, enrolled_at, student:profiles!student_id(id, full_name, skill_level, phone)')
        .eq('program_id', programId)
        .order('enrolled_at', { ascending: false }),
    ]);
    if (progRes.data) setProgram(progRes.data);
    if (enrollRes.data) setEnrollments(enrollRes.data as any);
  };

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };
  useEffect(() => { fetchData(); }, [programId]);

  const loadAvailableStudents = async () => {
    const enrolledIds = enrollments.map(e => e.student.id);
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'student')
      .order('full_name');
    if (data) {
      setAvailableStudents(data.filter(s => !enrolledIds.includes(s.id)));
    }
  };

  const handleEnroll = async () => {
    if (!selectedStudentId) return;
    setEnrolling(true);
    const { error } = await supabase.from('enrollments').upsert({
      student_id: selectedStudentId,
      program_id: programId,
      status: 'active',
    }, { onConflict: 'student_id,program_id' });
    if (error) { Alert.alert('Error', error.message); }
    else {
      setSelectedStudentId('');
      setShowEnroll(false);
      fetchData();
    }
    setEnrolling(false);
  };

  const updateStatus = (enrollment: EnrollmentRow, newStatus: EnrollmentStatus) => {
    Alert.alert(
      'Update status',
      `Change ${enrollment.student.full_name} to "${newStatus}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            await supabase.from('enrollments').update({ status: newStatus }).eq('id', enrollment.id);
            fetchData();
          },
        },
      ]
    );
  };

  const cancelEnrollment = (enrollment: EnrollmentRow) => {
    Alert.alert(
      'Cancel enrollment',
      `Cancel ${enrollment.student.full_name}'s enrollment? They will immediately lose access to this program.`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Enrollment',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('enrollments')
              .update({ status: 'cancelled' })
              .eq('id', enrollment.id);
            fetchData();
          },
        },
      ]
    );
  };

  const initials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const STATUSES: EnrollmentStatus[] = ['active', 'waitlisted', 'completed', 'cancelled'];

  const counts = {
    active:     enrollments.filter((e) => e.status === 'active').length,
    waitlisted: enrollments.filter((e) => e.status === 'waitlisted').length,
    completed:  enrollments.filter((e) => e.status === 'completed').length,
    cancelled:  enrollments.filter((e) => e.status === 'cancelled').length,
  };

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <BackHeader title={program?.title ?? 'Roster'} dark />
      {/* Program header */}
      <View style={styles.header}>
        <Text style={styles.programTitle}>{program?.title ?? 'Program'}</Text>
        <Text style={styles.programMeta}>
          {(() => {
            const div = ((program as any)?.division ?? 'amateur') as Division;
            const sub = program?.skill_level ? ` · ${program.skill_level.charAt(0).toUpperCase() + program.skill_level.slice(1)}` : '';
            return `${DIVISION_LABELS[div]}${sub} · ${program?.duration_weeks ?? '—'} weeks`;
          })()}
        </Text>
      </View>

      {/* Take attendance button */}
      <TouchableOpacity
        style={styles.attendanceBtn}
        onPress={async () => {
          // Find or create a session for today
          const today = new Date().toISOString().split('T')[0];
          const { data: existing } = await supabase
            .from('program_sessions')
            .select('id, title')
            .eq('program_id', programId)
            .gte('scheduled_at', today + 'T00:00:00')
            .lte('scheduled_at', today + 'T23:59:59')
            .limit(1)
            .maybeSingle();

          if (existing) {
            navigation.navigate('Attendance', { sessionId: existing.id, sessionTitle: existing.title ?? "Today's Session" });
          } else {
            // Create a session for today on the fly
            const { data: newSession } = await supabase
              .from('program_sessions')
              .insert({
                program_id: programId,
                title: `Session – ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`,
                scheduled_at: new Date().toISOString(),
                duration_minutes: 60,
              })
              .select('id, title')
              .single();
            if (newSession) {
              navigation.navigate('Attendance', { sessionId: newSession.id, sessionTitle: newSession.title });
            }
          }
        }}
      >
        <Text style={styles.attendanceBtnText}>📋 Take Attendance — Today</Text>
      </TouchableOpacity>

      {/* Enroll student */}
      <TouchableOpacity style={styles.enrollToggleBtn} onPress={() => { loadAvailableStudents(); setShowEnroll(v => !v); }}>
        <Text style={styles.enrollToggleBtnText}>+ Enroll a Student</Text>
      </TouchableOpacity>

      {showEnroll && (
        <View style={styles.enrollCard}>
          <Text style={styles.enrollLabel}>Select Student</Text>
          {availableStudents.length === 0 ? (
            <Text style={styles.enrollEmpty}>All students are already enrolled.</Text>
          ) : (
            <>
              <ScrollView style={styles.studentPicker} nestedScrollEnabled>
                {availableStudents.map(s => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.studentOption, selectedStudentId === s.id && styles.studentOptionSelected]}
                    onPress={() => setSelectedStudentId(s.id)}
                  >
                    <Text style={[styles.studentOptionText, selectedStudentId === s.id && styles.studentOptionTextSelected]}>
                      {s.full_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={[styles.enrollBtn, (!selectedStudentId || enrolling) && styles.enrollBtnDisabled]}
                onPress={handleEnroll}
                disabled={!selectedStudentId || enrolling}
              >
                <Text style={styles.enrollBtnText}>{enrolling ? 'Enrolling...' : 'Enroll Student'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Stats row */}
      <View style={styles.statsRow}>
        {(Object.entries(counts) as [EnrollmentStatus, number][]).map(([status, count]) => (
          <View key={status} style={styles.statCard}>
            <Text style={[styles.statNumber, { color: STATUS_COLORS[status].text }]}>{count}</Text>
            <Text style={styles.statLabel}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
          </View>
        ))}
      </View>

      {/* Enrollment list */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          👥 Students ({enrollments.length})
        </Text>

        {enrollments.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>No students enrolled yet.</Text>
          </View>
        ) : (
          enrollments.map((e) => (
            <View key={e.id} style={styles.card}>
              <View style={styles.cardTop}>
                {/* Avatar */}
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(e.student.full_name)}</Text>
                </View>

                {/* Info */}
                <View style={styles.info}>
                  <Text style={styles.studentName}>{e.student.full_name}</Text>
                  <View style={styles.metaRow}>
                    {e.student.skill_level && (
                      <Text style={styles.skillLevel}>
                        {e.student.skill_level.charAt(0).toUpperCase() + e.student.skill_level.slice(1)}
                      </Text>
                    )}
                    <Text style={styles.enrollDate}>
                      Enrolled {new Date(e.enrolled_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                </View>

                {/* Status badge */}
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[e.status].bg }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[e.status].text }]}>
                    {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                  </Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionScroll}>
                  {STATUSES.filter((s) => s !== e.status).map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.actionChip, { borderColor: STATUS_COLORS[s].text }]}
                      onPress={() => updateStatus(e, s)}
                    >
                      <Text style={[styles.actionChipText, { color: STATUS_COLORS[s].text }]}>
                        → {s.charAt(0).toUpperCase() + s.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {e.status !== 'cancelled' && (
                    <TouchableOpacity
                      style={styles.removeChip}
                      onPress={() => cancelEnrollment(e)}
                    >
                      <Text style={styles.removeChipText}>✕ Cancel</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  attendanceBtn: { backgroundColor: '#16A34A', margin: 16, marginBottom: 0, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  attendanceBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  header: { backgroundColor: '#111827', padding: 24, paddingTop: 16 },
  programTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  programMeta: { fontSize: 14, color: '#9CA3AF', textTransform: 'capitalize' },
  statsRow: { flexDirection: 'row', padding: 16, gap: 10 },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  statNumber: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2, textTransform: 'capitalize' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 12 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { color: '#9CA3AF', fontSize: 14 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  cardTop: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  info: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  metaRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  skillLevel: { fontSize: 12, color: '#6B7280', textTransform: 'capitalize' },
  enrollDate: { fontSize: 12, color: '#9CA3AF' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, flexShrink: 0 },
  statusText: { fontSize: 12, fontWeight: '600' },
  actions: { borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  actionScroll: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  actionChip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  actionChipText: { fontSize: 12, fontWeight: '600' },
  removeChip: { borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  removeChipText: { fontSize: 12, fontWeight: '600', color: '#DC2626' },
  enrollToggleBtn: { backgroundColor: '#ECFDF5', margin: 16, marginBottom: 8, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#BBF7D0' },
  enrollToggleBtnText: { color: '#16A34A', fontSize: 14, fontWeight: '700' },
  enrollCard: { backgroundColor: '#FFFFFF', margin: 16, marginTop: 0, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  enrollLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  enrollEmpty: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 12 },
  studentPicker: { maxHeight: 200, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, marginBottom: 10 },
  studentOption: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  studentOptionSelected: { backgroundColor: '#ECFDF5' },
  studentOptionText: { fontSize: 14, color: '#374151' },
  studentOptionTextSelected: { color: '#16A34A', fontWeight: '700' },
  enrollBtn: { backgroundColor: '#16A34A', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  enrollBtnDisabled: { opacity: 0.5 },
  enrollBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
