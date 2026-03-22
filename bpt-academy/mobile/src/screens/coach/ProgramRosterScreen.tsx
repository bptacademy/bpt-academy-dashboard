import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Program, EnrollmentStatus } from '../../types';
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
  const { programId } = route.params;
  const [program, setProgram] = useState<Program | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

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

  const removeStudent = (enrollment: EnrollmentRow) => {
    Alert.alert(
      'Remove student',
      `Remove ${enrollment.student.full_name} from this program?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('enrollments').delete().eq('id', enrollment.id);
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
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <BackHeader title={program?.title ?? 'Roster'} dark />
      {/* Program header */}
      <View style={styles.header}>
        <Text style={styles.programTitle}>{program?.title ?? 'Program'}</Text>
        <Text style={styles.programMeta}>
          {program?.skill_level?.charAt(0).toUpperCase()}{program?.skill_level?.slice(1)} · {program?.duration_weeks ?? '—'} weeks
        </Text>
      </View>

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
                  <TouchableOpacity
                    style={styles.removeChip}
                    onPress={() => removeStudent(e)}
                  >
                    <Text style={styles.removeChipText}>✕ Remove</Text>
                  </TouchableOpacity>
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
});
