import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Switch,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { SessionAttendance, Profile, ProgramSession } from '../../types';
import BackHeader from '../../components/common/BackHeader';

interface Props {
  navigation: any;
  route: { params: { sessionId: string; sessionTitle?: string } };
}

interface StudentRow {
  profile: Profile;
  attendance: SessionAttendance | null;
}

export default function AttendanceScreen({ navigation, route }: any) {
  const { sessionId, sessionTitle } = route.params;
  const { profile: coachProfile } = useAuth();
  const [session, setSession] = useState<ProgramSession | null>(null);
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);

    // Fetch session info
    const { data: sessionData } = await supabase
      .from('program_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    if (sessionData) setSession(sessionData as ProgramSession);

    // Fetch enrolled students
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('student_id, profiles:student_id(id, full_name, avatar_url, skill_level, role, phone, date_of_birth, emergency_contact, created_at, updated_at)')
      .eq('program_id', sessionData?.program_id ?? '')
      .eq('status', 'active');

    // Fetch existing attendance
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
    setLoading(false);
  };

  useEffect(() => { load(); }, [sessionId]);

  const toggleAttendance = async (row: StudentRow) => {
    setSaving(row.profile.id);
    const nowAttended = !(row.attendance?.attended ?? false);

    if (row.attendance) {
      // Update
      const { error } = await supabase
        .from('session_attendance')
        .update({ attended: nowAttended })
        .eq('id', row.attendance.id);
      if (!error) {
        setRows(prev => prev.map(r =>
          r.profile.id === row.profile.id
            ? { ...r, attendance: { ...r.attendance!, attended: nowAttended } }
            : r,
        ));
      }
    } else {
      // Insert
      const { data, error } = await supabase
        .from('session_attendance')
        .insert({
          session_id: sessionId,
          student_id: row.profile.id,
          attended: nowAttended,
        })
        .select()
        .single();
      if (!error && data) {
        setRows(prev => prev.map(r =>
          r.profile.id === row.profile.id
            ? { ...r, attendance: data as SessionAttendance }
            : r,
        ));
      }
    }
    setSaving(null);
  };

  const markAll = async (attended: boolean) => {
    Alert.alert(
      attended ? 'Mark All Present' : 'Mark All Absent',
      `Mark all students as ${attended ? 'present' : 'absent'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setSaving('all');
            const upserts = rows.map(r => ({
              session_id: sessionId,
              student_id: r.profile.id,
              attended,
            }));
            await supabase.from('session_attendance').upsert(upserts, { onConflict: 'session_id,student_id' });
            await load();
            setSaving(null);
          },
        },
      ],
    );
  };

  const presentCount = rows.filter(r => r.attendance?.attended).length;

  return (
    <View style={styles.container}>
      <BackHeader title={sessionTitle ?? 'Attendance'} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Summary bar */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{rows.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#16A34A' }]}>{presentCount}</Text>
            <Text style={styles.summaryLabel}>Present</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#EF4444' }]}>{rows.length - presentCount}</Text>
            <Text style={styles.summaryLabel}>Absent</Text>
          </View>
        </View>

        {/* Quick actions */}
        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => markAll(true)}>
            <Text style={styles.quickBtnText}>✅ Mark All Present</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickBtn, styles.quickBtnOutline]} onPress={() => markAll(false)}>
            <Text style={[styles.quickBtnText, styles.quickBtnTextOutline]}>❌ Mark All Absent</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#16A34A" style={styles.loader} />
        ) : rows.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No students enrolled in this session's program.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {rows.map(row => (
              <View key={row.profile.id} style={styles.row}>
                <View style={[styles.avatar, { backgroundColor: row.attendance?.attended ? '#ECFDF5' : '#F3F4F6' }]}>
                  <Text style={styles.avatarText}>{row.profile.full_name?.charAt(0) ?? '?'}</Text>
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName}>{row.profile.full_name}</Text>
                  <Text style={styles.rowSub}>{row.profile.skill_level ?? 'student'}</Text>
                </View>
                {saving === row.profile.id
                  ? <ActivityIndicator size="small" color="#16A34A" />
                  : (
                    <Switch
                      value={row.attendance?.attended ?? false}
                      onValueChange={() => toggleAttendance(row)}
                      trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
                      thumbColor={row.attendance?.attended ? '#16A34A' : '#9CA3AF'}
                    />
                  )}
              </View>
            ))}
          </View>
        )}
        {saving === 'all' && <ActivityIndicator size="large" color="#16A34A" style={styles.loader} />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  summaryBar: {
    flexDirection: 'row', backgroundColor: '#111827', paddingVertical: 20,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  summaryLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  quickRow: { flexDirection: 'row', padding: 16, gap: 10 },
  quickBtn: {
    flex: 1, backgroundColor: '#16A34A', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  quickBtnOutline: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  quickBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  quickBtnTextOutline: { color: '#374151' },
  loader: { marginTop: 40 },
  emptyCard: {
    margin: 20, backgroundColor: '#FFFFFF', borderRadius: 14,
    padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB',
  },
  emptyText: { color: '#6B7280', fontSize: 14 },
  list: { padding: 16, gap: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', gap: 12,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#374151' },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  rowSub: { fontSize: 12, color: '#9CA3AF', textTransform: 'capitalize', marginTop: 2 },
});
