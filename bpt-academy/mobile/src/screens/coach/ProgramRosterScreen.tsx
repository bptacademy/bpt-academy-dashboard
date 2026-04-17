import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, Image, Dimensions} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { supabase } from '../../lib/supabase';
import { Program, EnrollmentStatus, Division, DIVISION_LABELS, DIVISION_COLORS } from '../../types';
import BackHeader from '../../components/common/BackHeader';
import BackButton from '../../components/common/BackButton';

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

const STATUS_LABELS: Record<string, string> = {
  active:              'Active',
  pending_payment:     'Pending Payment',
  pending_next_cycle:  'Next Cycle',
  waitlisted:          'Waitlisted',
  completed:           'Completed',
  cancelled:           'Cancelled',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active:              { bg: '#ECFDF5', text: '#16A34A' },
  waitlisted:          { bg: '#FFFBEB', text: '#D97706' },
  completed:           { bg: '#EFF6FF', text: '#2563EB' },
  cancelled:           { bg: '#FEF2F2', text: '#DC2626' },
  pending_payment:     { bg: '#FEF3C7', text: '#D97706' },
  pending_next_cycle:  { bg: '#EFF6FF', text: '#2563EB' },
};

export default function ProgramRosterScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const tabBarPadding = useTabBarPadding();
  const { programId } = route.params;
  const [program, setProgram] = useState<Program | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showEnroll, setShowEnroll] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<{id: string, full_name: string}[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [waitlist, setWaitlist] = useState<{id:string;position:number;joined_at:string;student:{id:string;full_name:string}}[]>([]);

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

    // Fetch waiting list for current month
    const month = new Date().toISOString().slice(0, 7);
    const { data: wlData } = await supabase
      .from('program_waiting_list')
      .select('id, position, joined_at, student:profiles!student_id(id, full_name)')
      .eq('program_id', programId)
      .eq('month', month)
      .order('position', { ascending: true });
    if (wlData) setWaitlist(wlData as any);
  };

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  // Confirm payment → move to pending_next_cycle + notify student
  const confirmPayment = async (enrollment: EnrollmentRow) => {
    Alert.alert(
      'Confirm Payment',
      `Confirm bank transfer received from ${enrollment.student.full_name}? They will be placed in the next program cycle.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Payment',
          onPress: async () => {
            // Get next_cycle_start_date for this program
            const { data: prog } = await supabase
              .from('programs')
              .select('next_cycle_start_date, title')
              .eq('id', programId)
              .single();

            await supabase.from('enrollments').update({
              status: 'pending_next_cycle',
              payment_confirmed: true,
              payment_status: 'paid',
            }).eq('id', enrollment.id);

            const startMsg = prog?.next_cycle_start_date
              ? `Your sessions start on ${new Date(prog.next_cycle_start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.`
              : 'Your coach will confirm your start date soon.';

            await supabase.from('notifications').insert({
              recipient_id: enrollment.student.id,
              title: '✅ Payment Confirmed!',
              body: `Your enrollment in ${prog?.title ?? 'the program'} is confirmed. ${startMsg}`,
              type: 'enrollment',
              data: { program_id: programId },
            });

            fetchData();
          },
        },
      ]
    );
  };

  // Set next cycle start date for the program
  const setNextCycleDate = async () => {
    const { data: prog } = await supabase
      .from('programs')
      .select('next_cycle_start_date')
      .eq('id', programId)
      .single();

    const current = prog?.next_cycle_start_date ?? '';
    Alert.prompt(
      'Set Next Cycle Start Date',
      'Enter date (YYYY-MM-DD):',
      async (dateStr) => {
        if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          Alert.alert('Invalid date', 'Please use YYYY-MM-DD format.');
          return;
        }
        await supabase.from('programs').update({ next_cycle_start_date: dateStr }).eq('id', programId);

        // Notify all pending_next_cycle students of the confirmed date
        const { data: pending } = await supabase
          .from('enrollments')
          .select('student_id')
          .eq('program_id', programId)
          .eq('status', 'pending_next_cycle');

        if (pending && pending.length > 0) {
          const formatted = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
          await supabase.from('notifications').insert(
            pending.map((p: any) => ({
              recipient_id: p.student_id,
              title: '📅 Your start date is confirmed',
              body: `Your program sessions will begin on ${formatted}. We'll see you on the court!`,
              type: 'enrollment',
              data: { program_id: programId, cycle_start: dateStr },
            }))
          );
        }

        Alert.alert('✅ Done', `Next cycle set to ${dateStr}.`);
        fetchData();
      },
      'plain-text',
      current,
    );
  };
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

  const STATUSES: EnrollmentStatus[] = ['active', 'pending_payment', 'pending_next_cycle', 'waitlisted', 'completed', 'cancelled'];

  const counts = {
    active:             enrollments.filter((e) => e.status === 'active').length,
    pending_payment:    enrollments.filter((e) => e.status === 'pending_payment').length,
    pending_next_cycle: enrollments.filter((e) => e.status === 'pending_next_cycle').length,
    waitlisted:         enrollments.filter((e) => e.status === 'waitlisted').length,
    completed:          enrollments.filter((e) => e.status === 'completed').length,
    cancelled:          enrollments.filter((e) => e.status === 'cancelled').length,
  };

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: tabBarPadding }}
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

      {/* Next Cycle Date */}
      <TouchableOpacity style={styles.cycleDateBtn} onPress={setNextCycleDate}>
        <Text style={styles.cycleDateBtnText}>
          📅 Next Cycle Start:{' '}
          {(program as any)?.next_cycle_start_date
            ? new Date((program as any).next_cycle_start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : 'Not set — tap to set'}
        </Text>
      </TouchableOpacity>

      {/* Pending Payment section */}
      {enrollments.filter(e => e.status === 'pending_payment').length > 0 && (
        <View style={styles.section}>
          <Text style={styles.pendingTitle}>⏳ Awaiting Payment Confirmation ({enrollments.filter(e => e.status === 'pending_payment').length})</Text>
          {enrollments.filter(e => e.status === 'pending_payment').map((e) => (
            <View key={e.id} style={styles.pendingCard}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(e.student.full_name)}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.studentName}>{e.student.full_name}</Text>
                  <Text style={styles.enrollDate}>Bank transfer pending verification</Text>
                </View>
                <TouchableOpacity style={styles.confirmBtn} onPress={() => confirmPayment(e)}>
                  <Text style={styles.confirmBtnText}>✓ Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

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

      {/* Waiting List */}
      {waitlist.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Waiting List ({waitlist.length})</Text>
          {waitlist.map((w) => (
            <View key={w.id} style={styles.waitCard}>
              <View style={styles.waitPos}>
                <Text style={styles.waitPosText}>#{w.position}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.studentName}>{(w.student as any).full_name}</Text>
                <Text style={styles.enrollDate}>
                  Joined {new Date(w.joined_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Stats row — 2 rows of 3 */}
      <View style={styles.statsGrid}>
        {(Object.entries(counts) as [string, number][]).map(([status, count]) => (
          <View key={status} style={styles.statCard}>
            <Text style={[styles.statNumber, { color: STATUS_COLORS[status]?.text ?? '#6B7280' }]}>{count}</Text>
            <Text style={styles.statLabel}>{STATUS_LABELS[status] ?? status}</Text>
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
                  <Text style={[styles.statusText, { color: STATUS_COLORS[e.status]?.text ?? '#6B7280' }]}>
                    {STATUS_LABELS[e.status] ?? e.status}
                  </Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionScroll}>
                  {STATUSES.filter((s) => s !== e.status).map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.actionChip, { borderColor: STATUS_COLORS[s]?.text ?? '#6B7280' }]}
                      onPress={() => updateStatus(e, s)}
                    >
                      <Text style={[styles.actionChipText, { color: STATUS_COLORS[s]?.text ?? '#6B7280' }]}>
                        → {STATUS_LABELS[s] ?? s}
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
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  waitCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9FF',
    borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#BAE6FD', gap: 12,
  },
  waitPos: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#0284C7', alignItems: 'center', justifyContent: 'center',
  },
  waitPosText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  attendanceBtn: { backgroundColor: '#16A34A', margin: 16, marginBottom: 0, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  attendanceBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  header: { backgroundColor: '#111827', padding: 24, paddingTop: 16 },
  programTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  programMeta: { fontSize: 14, color: '#9CA3AF', textTransform: 'capitalize' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 10 },
  statCard: { width: '30%', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  statNumber: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#F0F6FC', marginBottom: 12 },
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
  actionScroll: { paddingHorizontal: 14, paddingVertical: 10, gap: 8, paddingBottom: 80,},
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
  cycleDateBtn: { backgroundColor: 'rgba(59,130,246,0.12)', margin: 16, marginBottom: 8, marginTop: 8, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(59,130,246,0.30)' },
  cycleDateBtnText: { color: '#3B82F6', fontSize: 14, fontWeight: '600' },
  pendingTitle: { fontSize: 15, fontWeight: '700', color: '#D97706', marginBottom: 10 },
  pendingCard: { backgroundColor: '#FFFBEB', borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#FDE68A', overflow: 'hidden' },
  confirmBtn: { backgroundColor: '#16A34A', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  confirmBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
