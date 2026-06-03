import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, Image, Dimensions, Modal, FlatList} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { supabase } from '../../lib/supabase';
import { Program, EnrollmentStatus, Division, DIVISION_LABELS, DIVISION_COLORS } from '../../types';
import BackHeader from '../../components/common/BackHeader';

const DEFAULT_SESSION_TIME = '09:00';
function buildTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 6; h <= 22; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 22) slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  return slots;
}
const TIME_SLOTS = buildTimeSlots();
const DAY_LABELS: Record<string, string> = {
  monday:'Monday', tuesday:'Tuesday', wednesday:'Wednesday',
  thursday:'Thursday', friday:'Friday',
};

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
  // Session time update state
  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [programDays, setProgramDays] = useState<string[]>([]);
  const [editTimes, setEditTimes] = useState<Record<string,string>>({});
  const [timePickerDay, setTimePickerDay] = useState<string|null>(null);
  const [savingTimes, setSavingTimes] = useState(false);

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

  const openTimeModal = async () => {
    // Load current schedule for this program
    const { data: sched } = await supabase
      .from('program_schedules')
      .select('days_of_week, session_times')
      .eq('program_id', programId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const days: string[] = (sched as any)?.days_of_week ?? [];
    const times: Record<string,string> = (sched as any)?.session_times ?? {};

    // Fill missing days with default time
    const filled: Record<string,string> = {};
    days.forEach((d: string) => { filled[d] = times[d] ?? DEFAULT_SESSION_TIME; });

    // If no schedule found, infer days from future sessions
    if (days.length === 0) {
      const { data: sessions } = await supabase
        .from('program_sessions')
        .select('scheduled_at')
        .eq('program_id', programId)
        .gt('scheduled_at', new Date().toISOString())
        .order('scheduled_at')
        .limit(20);
      const dayNames: Record<number,string> = {1:'monday',2:'tuesday',3:'wednesday',4:'thursday',5:'friday'};
      const seen = new Set<string>();
      (sessions ?? []).forEach((s: any) => {
        const d = new Date(s.scheduled_at).getDay();
        const name = dayNames[d];
        if (name && !seen.has(name)) { seen.add(name); }
      });
      seen.forEach(d => { filled[d] = DEFAULT_SESSION_TIME; });
      setProgramDays(Array.from(seen));
    } else {
      setProgramDays(days);
    }

    setEditTimes(filled);
    setTimeModalVisible(true);
  };

  const saveSessionTimes = async () => {
    setSavingTimes(true);
    const { data, error } = await supabase.rpc('update_future_session_times', {
      p_program_id: programId,
      p_session_times: editTimes,
    });
    setSavingTimes(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setTimeModalVisible(false);
    Alert.alert('✅ Times Updated', `${data ?? 0} future session${data !== 1 ? 's' : ''} updated.`);
    fetchData();
  };

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
            await supabase.from('enrollments').update({ status: 'cancelled' }).eq('id', enrollment.id);
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
    <View style={styles.rootWrapper}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: tabBarPadding }}
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
      <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />
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

      {/* Update Session Times */}
      <TouchableOpacity style={styles.timesBtn} onPress={openTimeModal}>
        <Text style={styles.timesBtnText}>⏰ Update Session Times</Text>
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

      {/* Stats row */}
      <View style={styles.statsGrid}>
        {(Object.entries(counts) as [string, number][]).map(([status, count]) => (
          <View key={status} style={styles.statCard}>
            <Text style={[styles.statNumber, { color: STATUS_COLORS[status]?.text ?? '#7A8FA6' }]}>{count}</Text>
            <Text style={styles.statLabel}>{STATUS_LABELS[status] ?? status}</Text>
          </View>
        ))}
      </View>

      {/* Enrollment list */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👥 Students ({enrollments.length})</Text>

        {enrollments.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>No students enrolled yet.</Text>
          </View>
        ) : (
          enrollments.map((e) => (
            <View key={e.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(e.student.full_name)}</Text>
                </View>
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
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[e.status]?.bg ?? '#F3F4F6' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[e.status]?.text ?? '#6B7280' }]}>
                    {STATUS_LABELS[e.status] ?? e.status}
                  </Text>
                </View>
              </View>

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
                    <TouchableOpacity style={styles.removeChip} onPress={() => cancelEnrollment(e)}>
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

      {/* ── Update Session Times Modal ── */}
      <Modal
        visible={timeModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setTimeModalVisible(false)}
      >
        <View style={styles.tpModal}>
          <View style={styles.tpHandle} />
          <Text style={styles.tpTitle}>⏰ Update Session Times</Text>
          <Text style={styles.tpSubtitle}>Only future sessions will be updated. Past sessions are unchanged.</Text>

          {timePickerDay === null ? (
            <>
              <ScrollView style={{ flex: 1 }}>
                {programDays.map(day => (
                  <TouchableOpacity
                    key={day}
                    style={styles.tpDayRow}
                    onPress={() => setTimePickerDay(day)}
                  >
                    <Text style={styles.tpDayLabel}>{DAY_LABELS[day] ?? day}</Text>
                    <View style={styles.tpTimeChip}>
                      <Text style={styles.tpTimeChipText}>{editTimes[day] ?? DEFAULT_SESSION_TIME}</Text>
                      <Text style={styles.tpTimeChipCaret}> ▾</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {programDays.length === 0 && (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Text style={{ color: '#7A8FA6', fontSize: 14, textAlign: 'center' }}>
                      No schedule found for this program. Generate a schedule first.
                    </Text>
                  </View>
                )}
              </ScrollView>
              <View style={styles.tpActions}>
                <TouchableOpacity style={styles.tpCancel} onPress={() => setTimeModalVisible(false)}>
                  <Text style={styles.tpCancelText}>Cancel</Text>
                </TouchableOpacity>
                {programDays.length > 0 && (
                  <TouchableOpacity
                    style={[styles.tpSave, savingTimes && { opacity: 0.5 }]}
                    onPress={saveSessionTimes}
                    disabled={savingTimes}
                  >
                    <Text style={styles.tpSaveText}>{savingTimes ? 'Saving…' : '✅ Save Times'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.tpPickerLabel}>{DAY_LABELS[timePickerDay] ?? timePickerDay} — pick a time</Text>
              <FlatList
                data={TIME_SLOTS}
                keyExtractor={item => item}
                contentContainerStyle={{ paddingBottom: 40 }}
                renderItem={({ item }) => {
                  const isSelected = (editTimes[timePickerDay] ?? DEFAULT_SESSION_TIME) === item;
                  return (
                    <TouchableOpacity
                      style={[styles.tpSlot, isSelected && styles.tpSlotActive]}
                      onPress={() => {
                        setEditTimes(t => ({ ...t, [timePickerDay!]: item }));
                        setTimePickerDay(null);
                      }}
                    >
                      <Text style={[styles.tpSlotText, isSelected && styles.tpSlotTextActive]}>{item}</Text>
                      {isSelected && <Text style={styles.tpCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                }}
              />
              <TouchableOpacity style={styles.tpCancel} onPress={() => setTimePickerDay(null)}>
                <Text style={styles.tpCancelText}>← Back</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  rootWrapper: { flex: 1, backgroundColor: '#0B1628' },
  container: { flex: 1, backgroundColor: '#0B1628' },
  waitCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(17,30,51,0.85)',
    borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', gap: 12,
  },
  waitPos: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0284C7', alignItems: 'center', justifyContent: 'center' },
  waitPosText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  attendanceBtn: { backgroundColor: '#16A34A', margin: 16, marginBottom: 0, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  attendanceBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  header: { backgroundColor: 'rgba(17,30,51,0.85)', padding: 24, paddingTop: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.10)' },
  programTitle: { fontSize: 22, fontWeight: '700', color: '#F0F6FC', marginBottom: 4 },
  programMeta: { fontSize: 14, color: '#7A8FA6', textTransform: 'capitalize' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 10 },
  statCard: { width: '30%', backgroundColor: 'rgba(17,30,51,0.85)', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  statNumber: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 11, color: '#7A8FA6', marginTop: 4, textAlign: 'center' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#F0F6FC', marginBottom: 12 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { color: '#7A8FA6', fontSize: 14 },
  card: { backgroundColor: 'rgba(17,30,51,0.85)', borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', overflow: 'hidden' },
  cardTop: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1E3A5F', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: '#F0F6FC', fontWeight: '700', fontSize: 16 },
  info: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '600', color: '#F0F6FC', marginBottom: 4 },
  metaRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  skillLevel: { fontSize: 12, color: '#7A8FA6', textTransform: 'capitalize' },
  enrollDate: { fontSize: 12, color: '#4B6278' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, flexShrink: 0 },
  statusText: { fontSize: 12, fontWeight: '600' },
  actions: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.10)' },
  actionScroll: { paddingHorizontal: 14, paddingVertical: 10, gap: 8, paddingBottom: 80 },
  actionChip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  actionChipText: { fontSize: 12, fontWeight: '600' },
  removeChip: { borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  removeChipText: { fontSize: 12, fontWeight: '600', color: '#DC2626' },
  enrollToggleBtn: { backgroundColor: 'rgba(22,163,74,0.15)', margin: 16, marginBottom: 8, marginTop: 16, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(22,163,74,0.40)' },
  enrollToggleBtnText: { color: '#16A34A', fontSize: 14, fontWeight: '700' },
  enrollCard: { backgroundColor: 'rgba(17,30,51,0.85)', margin: 16, marginTop: 0, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  enrollLabel: { fontSize: 13, fontWeight: '600', color: '#F0F6FC', marginBottom: 8 },
  enrollEmpty: { fontSize: 13, color: '#7A8FA6', textAlign: 'center', paddingVertical: 12 },
  studentPicker: { maxHeight: 200, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 8, marginBottom: 10 },
  studentOption: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  studentOptionSelected: { backgroundColor: 'rgba(22,163,74,0.20)' },
  studentOptionText: { fontSize: 14, color: '#F0F6FC' },
  studentOptionTextSelected: { color: '#16A34A', fontWeight: '700' },
  enrollBtn: { backgroundColor: '#16A34A', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  enrollBtnDisabled: { opacity: 0.5 },
  enrollBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  cycleDateBtn: { backgroundColor: 'rgba(59,130,246,0.12)', margin: 16, marginBottom: 8, marginTop: 8, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(59,130,246,0.30)' },
  cycleDateBtnText: { color: '#3B82F6', fontSize: 14, fontWeight: '600' },

  timesBtn: { backgroundColor: 'rgba(139,92,246,0.12)', margin: 16, marginBottom: 8, marginTop: 0, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(139,92,246,0.30)' },
  timesBtnText: { color: '#A78BFA', fontSize: 14, fontWeight: '600', textAlign: 'center' },

  // Time update modal
  tpModal: { flex: 1, backgroundColor: '#0B1628', paddingTop: 8 },
  tpHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.20)', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  tpTitle: { fontSize: 18, fontWeight: '800', color: '#F0F6FC', textAlign: 'center', marginBottom: 4, paddingHorizontal: 24 },
  tpSubtitle: { fontSize: 12, color: '#7A8FA6', textAlign: 'center', marginBottom: 16, paddingHorizontal: 24 },
  tpDayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  tpDayLabel: { fontSize: 16, fontWeight: '600', color: '#F0F6FC' },
  tpTimeChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(139,92,246,0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(139,92,246,0.35)' },
  tpTimeChipText: { fontSize: 15, fontWeight: '700', color: '#A78BFA' },
  tpTimeChipCaret: { fontSize: 13, color: '#A78BFA' },
  tpPickerLabel: { fontSize: 16, fontWeight: '700', color: '#F0F6FC', textAlign: 'center', marginBottom: 8, paddingHorizontal: 24 },
  tpSlot: { paddingVertical: 16, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tpSlotActive: { backgroundColor: 'rgba(139,92,246,0.15)' },
  tpSlotText: { fontSize: 17, color: '#CBD5E1', fontWeight: '500' },
  tpSlotTextActive: { color: '#A78BFA', fontWeight: '700' },
  tpCheck: { fontSize: 16, color: '#A78BFA', fontWeight: '800' },
  tpActions: { flexDirection: 'row', gap: 12, padding: 20 },
  tpCancel: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 16, alignItems: 'center' },
  tpCancelText: { color: '#F0F6FC', fontSize: 16, fontWeight: '700' },
  tpSave: { flex: 1, backgroundColor: '#16A34A', borderRadius: 14, padding: 16, alignItems: 'center' },
  tpSaveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
