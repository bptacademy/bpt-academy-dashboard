import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Profile, UserRole, SkillLevel, EnrollmentStatus, Division, DIVISION_LABELS } from '../../types';
import BackHeader from '../../components/common/BackHeader';
import { useAuth } from '../../context/AuthContext';

// ─── Goal types ───────────────────────────────────────────────
type GoalCategory = 'technical' | 'tactical' | 'physical' | 'mindset';
type GoalStatus   = 'active' | 'in_progress' | 'achieved';

interface StudentGoal {
  id: string;
  student_id: string;
  coach_id: string;
  category: GoalCategory;
  title: string;
  status: GoalStatus;
  achieved_at: string | null;
  created_at: string;
}

const GOAL_CATEGORIES: { key: GoalCategory; label: string; emoji: string; color: string }[] = [
  { key: 'technical', label: 'Technical',  emoji: '🎯', color: '#2563EB' },
  { key: 'tactical',  label: 'Tactical',   emoji: '🧠', color: '#7C3AED' },
  { key: 'physical',  label: 'Physical',   emoji: '💪', color: '#EA580C' },
  { key: 'mindset',   label: 'Mindset',    emoji: '🧘', color: '#0891B2' },
];

const GOAL_STATUSES: { key: GoalStatus; label: string; color: string; bg: string }[] = [
  { key: 'active',      label: 'Active',      color: '#2563EB', bg: '#EFF6FF' },
  { key: 'in_progress', label: 'In Progress', color: '#D97706', bg: '#FFF7ED' },
  { key: 'achieved',    label: 'Achieved ✓',  color: '#16A34A', bg: '#ECFDF5' },
];

interface EnrollmentWithProgram {
  id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  program: { id: string; title: string; skill_level: string };
  completedModules: number;
  totalModules: number;
}

// super_admin role assignment is done through the Super Admin screen only
const ROLES: UserRole[] = ['student', 'coach', 'admin'];
const SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced'];

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
  const insets = useSafeAreaInsets();
  const { studentId } = route.params;
  const { profile: coachProfile } = useAuth();
  const [student, setStudent] = useState<Profile | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentWithProgram[]>([]);
  const [overallPct, setOverallPct] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ skill_level: '' as SkillLevel, role: '' as UserRole });

  // Goals state
  const [goals, setGoals] = useState<StudentGoal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [goalModal, setGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<StudentGoal | null>(null);
  const [goalForm, setGoalForm] = useState<{ category: GoalCategory; title: string; status: GoalStatus }>({
    category: 'technical', title: '', status: 'active',
  });
  const [goalSaving, setGoalSaving] = useState(false);

  // Manual division override state
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<string>('');
  const [savingOverride, setSavingOverride] = useState(false);

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
      // Initialise division override selectors from current student data
      setSelectedDivision(profileData.division ?? '');
      setSelectedSkillLevel(profileData.skill_level ?? '');
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

  // ── Goals ─────────────────────────────────────────────────
  const fetchGoals = useCallback(async () => {
    setGoalsLoading(true);
    const { data } = await supabase
      .from('student_goals')
      .select('*')
      .eq('student_id', studentId)
      .order('category')
      .order('created_at');
    setGoals(data ?? []);
    setGoalsLoading(false);
  }, [studentId]);

  const openAddGoal = () => {
    setEditingGoal(null);
    setGoalForm({ category: 'technical', title: '', status: 'active' });
    setGoalModal(true);
  };

  const openEditGoal = (goal: StudentGoal) => {
    setEditingGoal(goal);
    setGoalForm({ category: goal.category, title: goal.title, status: goal.status });
    setGoalModal(true);
  };

  const closeGoalModal = () => {
    setGoalModal(false);
    setEditingGoal(null);
  };

  const handleSaveGoal = async () => {
    if (!goalForm.title.trim()) { Alert.alert('Error', 'Goal title is required'); return; }
    setGoalSaving(true);

    const wasAchieved = editingGoal?.status === 'achieved';
    const nowAchieved = goalForm.status === 'achieved';

    if (editingGoal) {
      await supabase.from('student_goals').update({
        category: goalForm.category,
        title: goalForm.title.trim(),
        status: goalForm.status,
        achieved_at: nowAchieved && !wasAchieved ? new Date().toISOString() : editingGoal.achieved_at,
      }).eq('id', editingGoal.id);

      // Notify student if just marked achieved
      if (nowAchieved && !wasAchieved) {
        await supabase.from('notifications').insert({
          recipient_id: studentId,
          title: '🏆 Goal achieved!',
          body: `Your coach marked "${goalForm.title.trim()}" as achieved. Keep it up!`,
          type: 'goal',
          read: false,
        });
      }
    } else {
      await supabase.from('student_goals').insert({
        student_id: studentId,
        coach_id: coachProfile!.id,
        category: goalForm.category,
        title: goalForm.title.trim(),
        status: goalForm.status,
        achieved_at: goalForm.status === 'achieved' ? new Date().toISOString() : null,
      });
    }

    setGoalSaving(false);
    closeGoalModal();
    fetchGoals();
  };

  const handleDeleteGoal = (goal: StudentGoal) => {
    Alert.alert(
      'Delete goal',
      `Delete "${goal.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await supabase.from('student_goals').delete().eq('id', goal.id);
            fetchGoals();
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchData(), fetchGoals()]);
    setRefreshing(false);
  };
  useEffect(() => { fetchData(); fetchGoals(); }, [studentId]);

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

  const handleManualOverride = () => {
    if (!selectedDivision) return;
    if (selectedDivision === 'amateur' && !selectedSkillLevel) {
      Alert.alert('Select skill level', 'Please select Beginner, Intermediate or Advanced for Amateur division.');
      return;
    }
    Alert.alert(
      'Change Division',
      `Move ${student?.full_name} to ${DIVISION_LABELS[selectedDivision as Division]}${selectedSkillLevel && selectedDivision === 'amateur' ? ` · ${selectedSkillLevel}` : ''}? This overrides the automatic promotion system.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: async () => {
          setSavingOverride(true);
          const update: Record<string, string | null> = { division: selectedDivision };
          update.skill_level = selectedDivision === 'amateur' ? selectedSkillLevel : null;
          await supabase.from('profiles').update(update).eq('id', student!.id);
          await supabase.from('notifications').insert({
            recipient_id: student!.id,
            title: '📋 Division updated',
            body: `Your division has been updated to ${DIVISION_LABELS[selectedDivision as Division]}${selectedSkillLevel && selectedDivision === 'amateur' ? ` · ${selectedSkillLevel}` : ''} by your coach.`,
            type: 'promotion_result',
          });
          setSavingOverride(false);
          Alert.alert('✅ Done', 'Division updated successfully.');
          fetchData();
        }},
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
      <BackHeader title={student.full_name} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
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
          <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>Account Info</Text>
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
          <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>Overall Progress</Text>
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
          <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>Programs ({enrollments.length})</Text>
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

        {/* Student Goals */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Development Goals</Text>
            <TouchableOpacity style={styles.addGoalBtn} onPress={openAddGoal}>
              <Text style={styles.addGoalBtnText}>+ Add Goal</Text>
            </TouchableOpacity>
          </View>
          {goalsLoading ? (
            <ActivityIndicator size="small" color="#16A34A" style={{ marginTop: 8 }} />
          ) : goals.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No goals set yet. Tap "+ Add Goal" to get started.</Text>
            </View>
          ) : (
            GOAL_CATEGORIES.map(({ key, label, emoji, color }) => {
              const catGoals = goals.filter((g) => g.category === key);
              if (catGoals.length === 0) return null;
              return (
                <View key={key} style={styles.goalCategory}>
                  <Text style={[styles.goalCategoryHeader, { color }]}>{emoji} {label}</Text>
                  {catGoals.map((goal) => {
                    const st = GOAL_STATUSES.find((s) => s.key === goal.status)!;
                    return (
                      <TouchableOpacity
                        key={goal.id}
                        style={[styles.goalCard, goal.status === 'achieved' && styles.goalCardAchieved]}
                        onPress={() => openEditGoal(goal)}
                        activeOpacity={0.75}
                      >
                        <View style={styles.goalCardLeft}>
                          <Text style={[
                            styles.goalTitle,
                            goal.status === 'achieved' && { color: '#16A34A', textDecorationLine: 'line-through' }
                          ]}>
                            {goal.title}
                          </Text>
                          {goal.achieved_at && (
                            <Text style={styles.goalAchievedAt}>
                              ✓ {new Date(goal.achieved_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </Text>
                          )}
                        </View>
                        <View style={[styles.goalStatusBadge, { backgroundColor: st.bg }]}>
                          <Text style={[styles.goalStatusText, { color: st.color }]}>{st.label}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })
          )}
        </View>

        {/* Coach Notes */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>Coach Notes</Text>
          <TouchableOpacity
            style={styles.promoBtn}
            onPress={() => navigation.navigate('CoachNotes', { studentId: student.id, studentName: student.full_name })}
          >
            <Text style={styles.promoBtnText}>📝 View / Add Notes</Text>
            <Text style={styles.promoBtnChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Promotion management */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>Promotion Cycle</Text>
          <TouchableOpacity
            style={styles.promoBtn}
            onPress={() => navigation.navigate('PromotionManage', { studentId: student.id, studentName: student.full_name })}
          >
            <Text style={styles.promoBtnText}>🎯 Manage Promotion Cycle</Text>
            <Text style={styles.promoBtnChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Manual Division Override */}
        <View style={styles.overrideSection}>
          <Text style={styles.overrideTitle}>⚙️ Manual Division Override</Text>
          <Text style={styles.overrideSubtitle}>Override automatic promotion — use with caution</Text>

          <Text style={styles.overrideLabel}>Division</Text>
          <View style={styles.divisionGrid}>
            {(['amateur', 'semi_pro', 'pro'] as const).map(div => (
              <TouchableOpacity
                key={div}
                style={[styles.divChip, selectedDivision === div && styles.divChipActive]}
                onPress={() => { setSelectedDivision(div); setSelectedSkillLevel(''); }}
              >
                <Text style={[styles.divChipText, selectedDivision === div && styles.divChipTextActive]}>
                  {DIVISION_LABELS[div]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedDivision === 'amateur' && (
            <>
              <Text style={styles.overrideLabel}>Skill Level</Text>
              <View style={styles.divisionGrid}>
                {(['beginner', 'intermediate', 'advanced'] as const).map(lvl => (
                  <TouchableOpacity
                    key={lvl}
                    style={[styles.divChip, selectedSkillLevel === lvl && styles.divChipActive]}
                    onPress={() => setSelectedSkillLevel(lvl)}
                  >
                    <Text style={[styles.divChipText, selectedSkillLevel === lvl && styles.divChipTextActive]}>
                      {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.overrideBtn, (!selectedDivision || savingOverride) && styles.overrideBtnDisabled]}
            onPress={handleManualOverride}
            disabled={!selectedDivision || savingOverride}
          >
            <Text style={styles.overrideBtnText}>
              {savingOverride ? 'Saving...' : 'Apply Division Change'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Direct message */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>Messaging</Text>
          <TouchableOpacity
            style={styles.promoBtn}
            onPress={async () => {
              if (!coachProfile) return;
              // Use atomic RPC — creates conversation + adds both members in one call,
              // also returns existing conversation id if one already exists.
              const { data: conversationId, error } = await supabase
                .rpc('create_direct_conversation', { p_recipient_id: student.id });

              if (error || !conversationId) {
                Alert.alert('Error', 'Could not start conversation.');
                return;
              }

              navigation.navigate('Chat', {
                conversationId,
                title: student.full_name,
              });
            }}
          >
            <Text style={styles.promoBtnText}>💬 Send Message</Text>
            <Text style={styles.promoBtnChevron}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Goal modal */}
      <Modal visible={goalModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeGoalModal}>
        <ScrollView style={styles.modal} keyboardShouldPersistTaps="handled">
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeGoalModal}>
              <Text style={styles.cancelBtn}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingGoal ? 'Edit Goal' : 'New Goal'}</Text>
            <TouchableOpacity onPress={handleSaveGoal} disabled={goalSaving}>
              <Text style={[styles.saveBtn, goalSaving && { opacity: 0.4 }]}>
                {goalSaving ? 'Saving…' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {/* Category */}
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.chipGrid}>
              {GOAL_CATEGORIES.map(({ key, label, emoji, color }) => {
                const selected = goalForm.category === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.selectChip, selected && { backgroundColor: color, borderColor: color }]}
                    onPress={() => setGoalForm({ ...goalForm, category: key })}
                  >
                    <Text style={[styles.selectChipText, selected && styles.selectChipTextActive]}>
                      {emoji} {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Title */}
            <Text style={styles.fieldLabel}>Goal</Text>
            <TextInput
              style={styles.goalInput}
              value={goalForm.title}
              onChangeText={(v) => setGoalForm({ ...goalForm, title: v })}
              placeholder="e.g. Vibora to the double glass"
              placeholderTextColor="#9CA3AF"
              autoFocus={!editingGoal}
            />

            {/* Status */}
            <Text style={styles.fieldLabel}>Status</Text>
            <View style={styles.chipGrid}>
              {GOAL_STATUSES.map(({ key, label, color, bg }) => {
                const selected = goalForm.status === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.selectChip, selected && { backgroundColor: color, borderColor: color }]}
                    onPress={() => setGoalForm({ ...goalForm, status: key })}
                  >
                    <Text style={[styles.selectChipText, selected && styles.selectChipTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {goalForm.status === 'achieved' && !editingGoal?.achieved_at && (
              <View style={styles.achievedHint}>
                <Text style={styles.achievedHintText}>
                  🏆 Saving as achieved will notify the student immediately.
                </Text>
              </View>
            )}
            {editingGoal && goalForm.status === 'achieved' && editingGoal.status !== 'achieved' && (
              <View style={styles.achievedHint}>
                <Text style={styles.achievedHintText}>
                  🏆 Marking as achieved will notify the student immediately.
                </Text>
              </View>
            )}

            {/* Delete */}
            {editingGoal && (
              <TouchableOpacity
                style={styles.deleteGoalBtn}
                onPress={() => { closeGoalModal(); handleDeleteGoal(editingGoal); }}
              >
                <Text style={styles.deleteGoalBtnText}>🗑 Delete Goal</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </Modal>

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
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },

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
  // Goals
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  addGoalBtn: { backgroundColor: '#16A34A', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6 },
  addGoalBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  goalCategory: { marginBottom: 14 },
  goalCategoryHeader: { fontSize: 13, fontWeight: '800', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  goalCard: {
    backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, marginBottom: 6,
    borderWidth: 1, borderColor: '#E5E7EB',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  goalCardAchieved: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  goalCardLeft: { flex: 1, marginRight: 10 },
  goalTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  goalAchievedAt: { fontSize: 11, color: '#16A34A', marginTop: 2 },
  goalStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, flexShrink: 0 },
  goalStatusText: { fontSize: 12, fontWeight: '700' },
  goalInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    padding: 14, fontSize: 15, color: '#111827',
    marginBottom: 20, backgroundColor: '#F9FAFB',
  },
  achievedHint: {
    backgroundColor: '#FEF9C3', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#FDE68A', marginBottom: 16,
  },
  achievedHintText: { fontSize: 13, color: '#92400E', fontWeight: '500' },
  deleteGoalBtn: {
    marginTop: 16, backgroundColor: '#FEF2F2', borderRadius: 10,
    padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA',
  },
  deleteGoalBtnText: { color: '#DC2626', fontWeight: '700', fontSize: 15 },

  promoBtn: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  promoBtnText: { fontSize: 15, fontWeight: '600', color: '#16A34A' },
  promoBtnChevron: { fontSize: 22, color: '#D1D5DB' },

  // Manual Division Override
  overrideSection: { backgroundColor: '#FFFBEB', borderRadius: 14, padding: 16, margin: 16, marginTop: 0, borderWidth: 1, borderColor: '#FDE68A' },
  overrideTitle: { fontSize: 15, fontWeight: '700', color: '#92400E', marginBottom: 2 },
  overrideSubtitle: { fontSize: 12, color: '#B45309', marginBottom: 14 },
  overrideLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  divisionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  divChip: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#F9FAFB' },
  divChipActive: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  divChipText: { fontSize: 13, color: '#374151' },
  divChipTextActive: { color: '#FFFFFF', fontWeight: '600' },
  overrideBtn: { backgroundColor: '#D97706', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  overrideBtnDisabled: { opacity: 0.5 },
  overrideBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
