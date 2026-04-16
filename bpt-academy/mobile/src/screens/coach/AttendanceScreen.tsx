import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Switch, Image, Dimensions} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { SessionAttendance, Profile, ProgramSession } from '../../types';
import BackHeader from '../../components/common/BackHeader';

interface StudentRow {
  profile: Profile;
  attendance: SessionAttendance | null;
}

export default function AttendanceScreen({ route }: any) {
  const insets = useSafeAreaInsets();
  const { sessionId, sessionTitle } = route.params;
  const [session, setSession] = useState<ProgramSession | null>(null);
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Multi-select state
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Deadline / auto-complete state
  const [attendanceDeadline, setAttendanceDeadline] = useState<Date | null>(null);
  const [autoCompleted, setAutoCompleted] = useState(false);
  const [attendanceCompleted, setAttendanceCompleted] = useState(false);

  const load = async () => {
    setLoading(true);

    const { data: sessionData } = await supabase
      .from('program_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    if (sessionData) {
      setSession(sessionData as ProgramSession);
      if ((sessionData as any).attendance_deadline) {
        setAttendanceDeadline(new Date((sessionData as any).attendance_deadline));
      }
      setAutoCompleted((sessionData as any).auto_completed ?? false);
      setAttendanceCompleted((sessionData as any).attendance_completed ?? false);
    }

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('student_id, profiles:student_id(id, full_name, avatar_url, skill_level, role, phone, date_of_birth, emergency_contact, created_at, updated_at)')
      .eq('program_id', sessionData?.program_id ?? '')
      .eq('status', 'active');

    const { data: existing } = await supabase
      .from('session_attendance')
      .select('*')
      .eq('session_id', sessionId);

    const attendanceMap: Record<string, SessionAttendance> = {};
    (existing ?? []).forEach((a: SessionAttendance) => { attendanceMap[a.student_id] = a; });

    const studentRows: StudentRow[] = (enrollments ?? []).map((e: any) => ({
      profile: (Array.isArray(e.profiles) ? e.profiles[0] : e.profiles) as Profile,
      attendance: attendanceMap[e.student_id] ?? null,
    }));

    setRows(studentRows);
    setSelected(new Set());
    setSelectMode(false);
    setLoading(false);
  };

  useEffect(() => { load(); }, [sessionId]);

  // When a student is marked attended, complete their next pending module
  const completeNextModule = async (studentId: string, programId: string) => {
    // Get all modules for this program in order
    const { data: modules } = await supabase
      .from('modules')
      .select('id')
      .eq('program_id', programId)
      .order('order_index', { ascending: true });
    if (!modules?.length) return;

    // Get already completed modules for this student
    const { data: completed } = await supabase
      .from('student_progress')
      .select('module_id')
      .eq('student_id', studentId)
      .eq('completed', true)
      .in('module_id', modules.map((m: { id: string }) => m.id));

    const completedIds = new Set((completed ?? []).map((p: { module_id: string }) => p.module_id));
    const nextModule = modules.find((m: { id: string }) => !completedIds.has(m.id));
    if (!nextModule) return;

    // Upsert progress for next module
    await supabase.from('student_progress').upsert({
      student_id: studentId,
      module_id: nextModule.id,
      completed: true,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'student_id,module_id' });
  };

  const toggleAttendance = async (row: StudentRow) => {
    setSaving(row.profile.id);
    const nowAttended = !(row.attendance?.attended ?? false);
    if (row.attendance) {
      await supabase.from('session_attendance').update({ attended: nowAttended }).eq('id', row.attendance.id);
    } else {
      await supabase.from('session_attendance').insert({ session_id: sessionId, student_id: row.profile.id, attended: nowAttended });
    }

    // If marking as present, complete their next module
    if (nowAttended && session?.program_id) {
      await completeNextModule(row.profile.id, session.program_id);
    }

    setRows(prev => prev.map(r =>
      r.profile.id === row.profile.id
        ? { ...r, attendance: r.attendance
            ? { ...r.attendance, attended: nowAttended }
            : { id: '', session_id: sessionId, student_id: row.profile.id, attended: nowAttended, created_at: new Date().toISOString() }
          }
        : r
    ));
    setSaving(null);
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(rows.map(r => r.profile.id)));
  const clearSelection = () => setSelected(new Set());

  const bulkMark = async (attended: boolean) => {
    if (selected.size === 0) return;
    const label = attended ? 'present' : 'absent';
    Alert.alert(
      `Mark ${selected.size} student${selected.size !== 1 ? 's' : ''} as ${label}?`,
      '',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setSaving('bulk');
            const upserts = [...selected].map(studentId => ({
              session_id: sessionId,
              student_id: studentId,
              attended,
            }));
            await supabase.from('session_attendance').upsert(upserts, { onConflict: 'session_id,student_id' });
            // Complete next module for each attended student
            if (attended && session?.program_id) {
              await Promise.all([...selected].map(sid => completeNextModule(sid, session!.program_id)));
            }
            await load();
            setSaving(null);
          },
        },
      ]
    );
  };

  const markAll = async (attended: boolean) => {
    Alert.alert(
      attended ? 'Mark All Present' : 'Mark All Absent',
      `Mark all ${rows.length} students as ${attended ? 'present' : 'absent'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setSaving('all');
            const upserts = rows.map(r => ({ session_id: sessionId, student_id: r.profile.id, attended }));
            await supabase.from('session_attendance').upsert(upserts, { onConflict: 'session_id,student_id' });
            // Complete next module for all students if marking present
            if (attended && session?.program_id) {
              await Promise.all(rows.map(r => completeNextModule(r.profile.id, session!.program_id)));
            }
            // Mark session attendance as completed by coach
            await supabase.from('program_sessions')
              .update({ attendance_completed: true, auto_completed: false })
              .eq('id', sessionId);
            await load();
            setSaving(null);
          },
        },
      ]
    );
  };

  const presentCount = rows.filter(r => r.attendance?.attended).length;
  const isBulkSaving = saving === 'bulk' || saving === 'all';

  return (
    <View style={styles.container}>
      <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />

      <BackHeader title={sessionTitle ?? 'Attendance'} />

      {/* Deadline banner */}
      {attendanceDeadline && !attendanceCompleted && (() => {
        const now = new Date();
        const hoursLeft = (attendanceDeadline.getTime() - now.getTime()) / (1000 * 60 * 60);
        const isUrgent = hoursLeft <= 4 && hoursLeft > 0;
        const isPast = hoursLeft <= 0;
        if (isPast) return null;
        return (
          <View style={[styles.deadlineBanner, isUrgent && styles.deadlineBannerUrgent]}>
            <Text style={styles.deadlineBannerText}>
              {isUrgent
                ? `🚨 Last chance — closes in ${Math.ceil(hoursLeft)}h`
                : `⏰ Attendance closes in ${Math.ceil(hoursLeft)}h`}
            </Text>
          </View>
        );
      })()}

      {/* Auto-completed banner */}
      {autoCompleted && (
        <View style={styles.autoCompletedBanner}>
          <Text style={styles.autoCompletedText}>
            🔒 Attendance was auto-completed — all students marked present
          </Text>
        </View>
      )}

      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{rows.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#4ADE80' }]}>{presentCount}</Text>
          <Text style={styles.summaryLabel}>Present</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#F87171' }]}>{rows.length - presentCount}</Text>
          <Text style={styles.summaryLabel}>Absent</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#FBBF24' }]}>
            {rows.length > 0 ? Math.round((presentCount / rows.length) * 100) : 0}%
          </Text>
          <Text style={styles.summaryLabel}>Rate</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.actionBar}>
          {!selectMode ? (
            <>
              <TouchableOpacity style={styles.actionBtn} onPress={() => markAll(true)}>
                <Text style={styles.actionBtnText}>✅ All Present</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOutline]} onPress={() => markAll(false)}>
                <Text style={styles.actionBtnTextOutline}>❌ All Absent</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnBlue]} onPress={() => setSelectMode(true)}>
                <Text style={styles.actionBtnText}>☑ Select</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, selected.size === 0 && styles.actionBtnDisabled]}
                onPress={() => bulkMark(true)}
                disabled={selected.size === 0}
              >
                <Text style={styles.actionBtnText}>✅ Present ({selected.size})</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnOutline, selected.size === 0 && styles.actionBtnDisabled]}
                onPress={() => bulkMark(false)}
                disabled={selected.size === 0}
              >
                <Text style={styles.actionBtnTextOutline}>❌ Absent ({selected.size})</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnGray]} onPress={() => { setSelectMode(false); clearSelection(); }}>
                <Text style={styles.actionBtnText}>✕ Done</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {selectMode && (
          <View style={styles.selectBar}>
            <TouchableOpacity onPress={selectAll}>
              <Text style={styles.selectBarBtn}>Select all ({rows.length})</Text>
            </TouchableOpacity>
            <Text style={styles.selectBarSep}>·</Text>
            <TouchableOpacity onPress={clearSelection}>
              <Text style={styles.selectBarBtn}>Clear</Text>
            </TouchableOpacity>
            <Text style={styles.selectBarCount}>{selected.size} selected</Text>
          </View>
        )}

        {isBulkSaving && <ActivityIndicator size="large" color="#16A34A" style={styles.loader} />}

        {loading ? (
          <ActivityIndicator size="large" color="#16A34A" style={styles.loader} />
        ) : rows.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No students enrolled in this program.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {rows.map(row => {
              const isPresent = row.attendance?.attended ?? false;
              const isSelected = selected.has(row.profile.id);
              return (
                <TouchableOpacity
                  key={row.profile.id}
                  style={[
                    styles.row,
                    isPresent && styles.rowPresent,
                    selectMode && isSelected && styles.rowSelected,
                  ]}
                  onPress={() => { if (selectMode) toggleSelect(row.profile.id); }}
                  activeOpacity={selectMode ? 0.7 : 1}
                >
                  {selectMode && (
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Text style={styles.checkboxTick}>✓</Text>}
                    </View>
                  )}
                  <View style={[styles.avatar, { backgroundColor: isPresent ? '#ECFDF5' : '#F3F4F6' }]}>
                    <Text style={styles.avatarText}>{row.profile.full_name?.charAt(0) ?? '?'}</Text>
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowName}>{row.profile.full_name}</Text>
                    <Text style={[styles.rowStatus, { color: isPresent ? '#16A34A' : '#EF4444' }]}>
                      {isPresent ? '● Present' : '● Absent'}
                    </Text>
                  </View>
                  {!selectMode && (
                    saving === row.profile.id
                      ? <ActivityIndicator size="small" color="#16A34A" />
                      : (
                        <Switch
                          value={isPresent}
                          onValueChange={() => toggleAttendance(row)}
                          trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
                          thumbColor={isPresent ? '#16A34A' : '#9CA3AF'}
                        />
                      )
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  summaryBar: { flexDirection: 'row', backgroundColor: '#111827', paddingVertical: 18 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  summaryLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  actionBar: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  actionBtn: { flex: 1, backgroundColor: '#16A34A', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  actionBtnOutline: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  actionBtnBlue: { backgroundColor: '#3B82F6' },
  actionBtnGray: { backgroundColor: '#6B7280' },
  actionBtnDisabled: { opacity: 0.4 },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  actionBtnTextOutline: { fontSize: 12, fontWeight: '700', color: '#374151' },
  selectBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: '#EFF6FF', borderBottomWidth: 1, borderBottomColor: '#DBEAFE', gap: 8,
  },
  selectBarBtn: { fontSize: 13, fontWeight: '700', color: '#2563EB' },
  selectBarSep: { color: '#9CA3AF' },
  selectBarCount: { flex: 1, textAlign: 'right', fontSize: 13, fontWeight: '600', color: '#374151' },
  loader: { marginTop: 40 },
  emptyCard: { margin: 20, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  emptyText: { color: '#6B7280', fontSize: 14 },
  list: { padding: 12, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', gap: 10 },
  rowPresent: { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' },
  rowSelected: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  checkboxSelected: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  checkboxTick: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700', color: '#374151' },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  rowStatus: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  deadlineBanner: {
    backgroundColor: '#FFFBEB', borderBottomWidth: 1, borderBottomColor: '#FDE68A',
    padding: 12, alignItems: 'center',
  },
  deadlineBannerUrgent: { backgroundColor: '#FEF2F2', borderBottomColor: '#FECACA' },
  deadlineBannerText: { fontSize: 13, fontWeight: '600', color: '#92400E' },
  autoCompletedBanner: {
    backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
    padding: 12, alignItems: 'center',
  },
  autoCompletedText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
});
