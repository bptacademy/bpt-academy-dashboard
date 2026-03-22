import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, Modal, TextInput,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Profile, UserRole, SkillLevel, EnrollmentStatus } from '../../types';

interface EnrollmentWithProgram {
  id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  program: { id: string; title: string; skill_level: string };
  completedModules: number;
  totalModules: number;
}

const ROLES: UserRole[] = ['student', 'coach', 'admin'];
const SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced', 'competition'];

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  student: { bg: '#EFF6FF', text: '#2563EB' },
  coach:   { bg: '#FFF7ED', text: '#EA580C' },
  admin:   { bg: '#F0FDF4', text: '#16A34A' },
  parent:  { bg: '#FAF5FF', text: '#7C3AED' },
};

const STATUS_COLORS: Record<EnrollmentStatus, { bg: string; text: string }> = {
  active:     { bg: '#ECFDF5', text: '#16A34A' },
  waitlisted: { bg: '#FFFBEB', text: '#D97706' },
  completed:  { bg: '#EFF6FF', text: '#2563EB' },
  cancelled:  { bg: '#FEF2F2', text: '#DC2626' },
};

const SKILL_COLORS: Record<string, string> = {
  beginner:     '#3B82F6',
  intermediate: '#F59E0B',
  advanced:     '#EF4444',
  competition:  '#8B5CF6',
};

export default function StudentDetailScreen({ route, navigation }: any) {
  const { studentId } = route.params;
  const [student, setStudent] = useState<Profile | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentWithProgram[]>([]);
  const [overallPct, setOverallPct] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ skill_level: '' as SkillLevel, role: '' as UserRole });

  const fetchData = async () => {
    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', studentId)
      .single();
    if (profileData) {
      setStudent(profileData);
      setEditForm({ skill_level: profileData.skill_level ?? 'beginner', role: profileData.role });
    }

    // Fetch enrollments with program info
    const { data: enrollData } = await supabase
      .from('enrollments')
      .select('id, status, enrolled_at, program:programs(id, title, skill_level)')
      .eq('student_id', studentId)
      .order('enrolled_at', { ascending: false });

    if (enrollData) {
      const withProgress = await Promise.all(
        enrollData.map(async (e: any) => {
          const { data: modules } = await supabase
            .from('modules')
            .select('id')
            .eq('program_id', e.program.id);

          const { data: progress } = await supabase
            .from('student_progress')
            .select('id')
            .eq('student_id', studentId)
            .eq('completed', true)
            .in('module_id', modules?.map((m: any) => m.id) ?? []);

          return {
            ...e,
            completedModules: progress?.length ?? 0,
            totalModules: modules?.length ?? 0,
          };
        })
      );
      setEnrollments(withProgress);

      // Overall progress
      const total = withProgress.reduce((a, e) => a + e.totalModules, 0);
      const done = withProgress.reduce((a, e) => a + e.completedModules, 0);
      setOverallPct(total > 0 ? Math.round((done / total) * 100) : 0);
    }
  };

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };
  useEffect(() => { fetchData(); }, [studentId]);

  const handleSaveEdit = async () => {
    const { error } = await supabase
      .from('profiles')
      .update({ skill_level: editForm.skill_level, role: editForm.role })
      .eq('id', studentId);
    if (error) { Alert.alert('Error', error.message); return; }
    setEditModal(false);
    fetchData();
    Alert.alert('Updated ✅', 'Profile has been updated.');
  };

  const handleRemoveEnrollment = (enrollment: EnrollmentWithProgram) => {
    Alert.alert(
      'Remove from program',
      `Remove ${student?.full_name} from "${enrollment.program.title}"?`,
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

  const handleChangeEnrollmentStatus = (enrollment: EnrollmentWithProgram, newStatus: EnrollmentStatus) => {
    Alert.alert(
      'Change status',
      `Set ${student?.full_name} to "${newStatus}" in "${enrollment.program.title}"?`,
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

  const initials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  if (!student) return (
    <View style={styles.loading}>
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.hero}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials(student.full_name)}</Text>
          </View>
          <Text style={styles.name}>{student.full_name}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: ROLE_COLORS[student.role]?.bg ?? '#F3F4F6' }]}>
              <Text style={[styles.badgeText, { color: ROLE_COLORS[student.role]?.text ?? '#374151' }]}>
                {student.role.charAt(0).toUpperCase() + student.role.slice(1)}
              </Text>
            </View>
            {student.skill_level && (
              <View style={[styles.badge, { backgroundColor: (SKILL_COLORS[student.skill_level] ?? '#6B7280') + '20' }]}>
                <Text style={[styles.badgeText, { color: SKILL_COLORS[student.skill_level] ?? '#6B7280' }]}>
                  {student.skill_level.charAt(0).toUpperCase() + student.skill_level.slice(1)}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.editBtn} onPress={() => setEditModal(true)}>
            <Text style={styles.editBtnText}>✏️ Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Account info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Info</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Phone</Text>
              <Text style={styles.rowValue}>{student.phone ?? '—'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Member since</Text>
              <Text style={styles.rowValue}>
                {new Date(student.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            </View>
          </View>
        </View>

        {/* Overall progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overall Progress</Text>
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>{enrollments.length} program{enrollments.length !== 1 ? 's' : ''} enrolled</Text>
              <Text style={styles.progressPct}>{overallPct}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${overallPct}%` }]} />
            </View>
          </View>
        </View>

        {/* Enrollments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Programs ({enrollments.length})</Text>
          {enrollments.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Not enrolled in any programs yet.</Text>
            </View>
          ) : (
            enrollments.map((e) => {
              const pct = e.totalModules > 0 ? Math.round((e.completedModules / e.totalModules) * 100) : 0;
              const STATUSES: EnrollmentStatus[] = ['active', 'waitlisted', 'completed', 'cancelled'];
              return (
                <View key={e.id} style={styles.enrollCard}>
                  {/* Program name + status */}
                  <View style={styles.enrollHeader}>
                    <Text style={styles.enrollTitle} numberOfLines={1}>{e.program.title}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[e.status].bg }]}>
                      <Text style={[styles.statusText, { color: STATUS_COLORS[e.status].text }]}>
                        {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                      </Text>
                    </View>
                  </View>

                  {/* Mini progress bar */}
                  <View style={styles.miniBar}>
                    <View style={[styles.miniBarFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={styles.miniBarLabel}>{e.completedModules}/{e.totalModules} modules · {pct}%</Text>

                  {/* Actions */}
                  <View style={styles.enrollActions}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.enrollActionScroll}>
                      {STATUSES.filter((s) => s !== e.status).map((s) => (
                        <TouchableOpacity
                          key={s}
                          style={[styles.statusChip, { borderColor: STATUS_COLORS[s].text }]}
                          onPress={() => handleChangeEnrollmentStatus(e, s)}
                        >
                          <Text style={[styles.statusChipText, { color: STATUS_COLORS[s].text }]}>
                            → {s.charAt(0).toUpperCase() + s.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity style={styles.removeChip} onPress={() => handleRemoveEnrollment(e)}>
                        <Text style={styles.removeChipText}>✕ Remove</Text>
                      </TouchableOpacity>
                    </ScrollView>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Edit modal */}
      <Modal visible={editModal} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditModal(false)}>
              <Text style={styles.cancelBtn}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={handleSaveEdit}>
              <Text style={styles.saveBtn}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {/* Skill level */}
            <Text style={styles.fieldLabel}>Skill Level</Text>
            <View style={styles.chipGrid}>
              {SKILL_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.selectChip,
                    editForm.skill_level === level && { backgroundColor: SKILL_COLORS[level], borderColor: SKILL_COLORS[level] },
                  ]}
                  onPress={() => setEditForm({ ...editForm, skill_level: level })}
                >
                  <Text style={[styles.selectChipText, editForm.skill_level === level && styles.selectChipTextActive]}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Role */}
            <Text style={styles.fieldLabel}>Role</Text>
            <View style={styles.chipGrid}>
              {ROLES.map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.selectChip,
                    editForm.role === role && { backgroundColor: ROLE_COLORS[role]?.text, borderColor: ROLE_COLORS[role]?.text },
                  ]}
                  onPress={() => setEditForm({ ...editForm, role })}
                >
                  <Text style={[styles.selectChipText, editForm.role === role && styles.selectChipTextActive]}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⚠️ Changing a role to "Coach" or "Admin" will give them access to the admin dashboard.
              </Text>
            </View>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#6B7280', fontSize: 15 },

  // Hero
  hero: { backgroundColor: '#111827', alignItems: 'center', paddingTop: 32, paddingBottom: 28, paddingHorizontal: 24 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 30, fontWeight: '700', color: '#FFFFFF' },
  name: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 10 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 },
  badgeText: { fontSize: 13, fontWeight: '600' },
  editBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  editBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  // Sections
  section: { padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },

  // Info card
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  rowLabel: { fontSize: 15, color: '#374151' },
  rowValue: { fontSize: 15, color: '#6B7280' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 16 },

  // Progress
  progressCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressLabel: { fontSize: 14, color: '#374151' },
  progressPct: { fontSize: 15, fontWeight: '700', color: '#16A34A' },
  progressBar: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4 },
  progressFill: { height: '100%', backgroundColor: '#16A34A', borderRadius: 4 },

  // Enrollment cards
  enrollCard: { backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  enrollHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, paddingBottom: 8 },
  enrollTitle: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, flexShrink: 0 },
  statusText: { fontSize: 12, fontWeight: '600' },
  miniBar: { height: 4, backgroundColor: '#E5E7EB', marginHorizontal: 14, borderRadius: 2 },
  miniBarFill: { height: '100%', backgroundColor: '#16A34A', borderRadius: 2 },
  miniBarLabel: { fontSize: 12, color: '#9CA3AF', paddingHorizontal: 14, marginTop: 4, marginBottom: 10 },
  enrollActions: { borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  enrollActionScroll: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  statusChip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  statusChipText: { fontSize: 12, fontWeight: '600' },
  removeChip: { borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  removeChipText: { fontSize: 12, fontWeight: '600', color: '#DC2626' },

  empty: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  emptyText: { color: '#9CA3AF', fontSize: 14 },

  // Edit modal
  modal: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  cancelBtn: { fontSize: 16, color: '#6B7280' },
  saveBtn: { fontSize: 16, color: '#16A34A', fontWeight: '700' },
  modalBody: { padding: 24 },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10, marginTop: 8 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  selectChip: { borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 9, backgroundColor: '#F9FAFB' },
  selectChipText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  selectChipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  warningBox: { backgroundColor: '#FFFBEB', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#FDE68A' },
  warningText: { fontSize: 13, color: '#92400E', lineHeight: 20 },
});
