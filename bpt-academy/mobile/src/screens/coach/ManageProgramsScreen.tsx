import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Program, SkillLevel, Division, DIVISION_LABELS, DIVISION_COLORS } from '../../types';
import ScreenHeader from '../../components/common/ScreenHeader';

type CoachProfile = { id: string; full_name: string; };

const SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced'];
const DIVISIONS: Division[] = ['amateur', 'semi_pro', 'pro'];
const LEVEL_COLORS: Record<SkillLevel, string> = {
  beginner: '#3B82F6',
  intermediate: '#F59E0B',
  advanced: '#EF4444',
};

type FormState = {
  title: string;
  description: string;
  division: Division;
  skill_level: SkillLevel;
  duration_weeks: string;
  selectedCoachIds: string[];
};

const EMPTY_FORM: FormState = {
  title: '', description: '', division: 'amateur', skill_level: 'beginner',
  duration_weeks: '', selectedCoachIds: [],
};

export default function ManageProgramsScreen({ navigation }: any) {
  const { profile } = useAuth();
  const [programs, setPrograms]             = useState<Program[]>([]);
  const [programCoaches, setProgramCoaches] = useState<Record<string, CoachProfile[]>>({});
  const [availableCoaches, setAvailableCoaches] = useState<CoachProfile[]>([]);
  const [refreshing, setRefreshing]         = useState(false);
  const [modalVisible, setModalVisible]     = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [form, setForm]                     = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving]                 = useState(false);

  const fetchPrograms = async () => {
    const [progRes, coachAssignRes, availRes] = await Promise.all([
      supabase.from('programs').select('*').order('created_at', { ascending: false }),
      supabase.from('program_coaches').select('program_id, coach:profiles!coach_id(id, full_name)'),
      supabase.from('profiles').select('id, full_name').in('role', ['admin', 'coach']).order('full_name'),
    ]);

    if (progRes.data) setPrograms(progRes.data);
    if (availRes.data) setAvailableCoaches(availRes.data as CoachProfile[]);

    if (coachAssignRes.data) {
      const map: Record<string, CoachProfile[]> = {};
      coachAssignRes.data.forEach((row: any) => {
        if (!map[row.program_id]) map[row.program_id] = [];
        if (row.coach) map[row.program_id].push(row.coach);
      });
      setProgramCoaches(map);
    }
  };

  const onRefresh = async () => { setRefreshing(true); await fetchPrograms(); setRefreshing(false); };
  useEffect(() => { fetchPrograms(); }, []);

  const openCreate = () => {
    setEditingProgram(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEdit = (p: Program) => {
    setEditingProgram(p);
    setForm({
      title: p.title ?? '',
      description: p.description ?? '',
      division: ((p as any).division ?? 'amateur') as Division,
      skill_level: (p.skill_level ?? 'beginner') as SkillLevel,
      duration_weeks: p.duration_weeks ? String(p.duration_weeks) : '',
      selectedCoachIds: (programCoaches[p.id] ?? []).map((c) => c.id),
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingProgram(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { Alert.alert('Error', 'Title is required'); return; }
    setSaving(true);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      division: form.division,
      skill_level: form.division === 'amateur' ? form.skill_level : null,
      duration_weeks: form.duration_weeks ? parseInt(form.duration_weeks) : null,
    };

    let programId: string;

    if (editingProgram) {
      const { error } = await supabase.from('programs').update(payload).eq('id', editingProgram.id);
      if (error) { Alert.alert('Error', error.message); setSaving(false); return; }
      programId = editingProgram.id;
    } else {
      const { data, error } = await supabase.from('programs').insert({
        ...payload,
        coach_id: profile!.id,
        is_active: true,
      }).select('id').single();
      if (error || !data) { Alert.alert('Error', error?.message); setSaving(false); return; }
      programId = data.id;
    }

    // Sync coach assignments — delete all then re-insert selected
    await supabase.from('program_coaches').delete().eq('program_id', programId);
    if (form.selectedCoachIds.length > 0) {
      await supabase.from('program_coaches').insert(
        form.selectedCoachIds.map((coachId) => ({ program_id: programId, coach_id: coachId }))
      );
    }

    setSaving(false);
    closeModal();
    fetchPrograms();
  };

  const handleDelete = (p: Program) => {
    Alert.alert(
      'Delete Program',
      `Delete "${p.title}"? This cannot be undone and will remove all enrollments.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await supabase.from('programs').delete().eq('id', p.id);
            fetchPrograms();
          },
        },
      ],
    );
  };

  const toggleActive = async (p: Program) => {
    await supabase.from('programs').update({ is_active: !p.is_active }).eq('id', p.id);
    fetchPrograms();
  };

  const isEditing = !!editingProgram;

  return (
    <View style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <ScreenHeader title="Programs" />
        <View style={styles.addRow}>
          <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
            <Text style={styles.addBtnText}>+ New Program</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.list}>
          {programs.map((p) => {
            const div = ((p as any).division ?? 'amateur') as Division;
            const color = DIVISION_COLORS[div];
            return (
              <View key={p.id} style={styles.card}>
                {/* Header row */}
                <View style={styles.cardHeader}>
                  <View style={[styles.levelBadge, { backgroundColor: color + '20' }]}>
                    <Text style={[styles.levelText, { color }]}>
                      {DIVISION_LABELS[div]}
                      {div === 'amateur' && p.skill_level
                        ? ` · ${p.skill_level.charAt(0).toUpperCase() + p.skill_level.slice(1)}`
                        : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.statusBadge, p.is_active ? styles.activeStatus : styles.inactiveStatus]}
                    onPress={() => toggleActive(p)}
                  >
                    <Text style={[styles.statusText, p.is_active ? styles.activeText : styles.inactiveText]}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.cardTitle}>{p.title}</Text>
                {p.description ? <Text style={styles.cardDesc} numberOfLines={2}>{p.description}</Text> : null}
                <Text style={styles.cardMeta}>{p.duration_weeks ?? '—'} weeks</Text>

                {/* Coaches */}
                {(programCoaches[p.id] ?? []).length > 0 && (
                  <View style={styles.coachRow}>
                    <Text style={styles.coachRowLabel}>👨‍🏫</Text>
                    <Text style={styles.coachNames}>
                      {(programCoaches[p.id] ?? []).map((c) => c.full_name).join(' · ')}
                    </Text>
                  </View>
                )}

                {/* Action buttons */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.rosterBtn}
                    onPress={() => navigation.navigate('ProgramRoster', { programId: p.id })}
                  >
                    <Text style={styles.rosterBtnText}>👥 Roster</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => openEdit(p)}
                  >
                    <Text style={styles.editBtnText}>✏️ Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(p)}
                  >
                    <Text style={styles.deleteBtnText}>🗑</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
          {programs.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No programs yet. Create your first one!</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create / Edit modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modal} keyboardShouldPersistTaps="handled">
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal}>
              <Text style={styles.cancelBtn}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{isEditing ? 'Edit Program' : 'New Program'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.saveBtn, saving && { opacity: 0.5 }]}>
                {saving ? 'Saving…' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={form.title}
              onChangeText={(v) => setForm({ ...form, title: v })}
              placeholder="Program title"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={form.description}
              onChangeText={(v) => setForm({ ...form, description: v })}
              placeholder="What will students learn?"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>Division</Text>
            <View style={styles.chipRow}>
              {DIVISIONS.map((div) => {
                const color = DIVISION_COLORS[div];
                const selected = form.division === div;
                return (
                  <TouchableOpacity
                    key={div}
                    style={[styles.chip, selected && { backgroundColor: color, borderColor: color }]}
                    onPress={() => setForm({ ...form, division: div })}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                      {DIVISION_LABELS[div]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {form.division === 'amateur' && (
              <>
                <Text style={styles.label}>Amateur Level</Text>
                <View style={[styles.chipRow, styles.subLevelRow]}>
                  {SKILL_LEVELS.map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[styles.chip, form.skill_level === level && { backgroundColor: LEVEL_COLORS[level], borderColor: LEVEL_COLORS[level] }]}
                      onPress={() => setForm({ ...form, skill_level: level })}
                    >
                      <Text style={[styles.chipText, form.skill_level === level && styles.chipTextActive]}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.label}>Duration (weeks)</Text>
            <TextInput
              style={styles.input}
              value={form.duration_weeks}
              onChangeText={(v) => setForm({ ...form, duration_weeks: v })}
              placeholder="e.g. 8"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Coaches</Text>
            <Text style={styles.sublabel}>Select one or more coaches responsible for this program.</Text>
            {availableCoaches.length === 0 ? (
              <Text style={styles.noCoachText}>No coaches found in the system.</Text>
            ) : (
              <View style={styles.coachPickerList}>
                {availableCoaches.map((coach) => {
                  const selected = form.selectedCoachIds.includes(coach.id);
                  const toggle = () => {
                    const next = selected
                      ? form.selectedCoachIds.filter((id) => id !== coach.id)
                      : [...form.selectedCoachIds, coach.id];
                    setForm({ ...form, selectedCoachIds: next });
                  };
                  return (
                    <TouchableOpacity
                      key={coach.id}
                      style={[styles.coachPickerRow, selected && styles.coachPickerRowSelected]}
                      onPress={toggle}
                    >
                      <View style={[styles.coachPickerAvatar, selected && styles.coachPickerAvatarSelected]}>
                        <Text style={styles.coachPickerAvatarText}>
                          {coach.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </Text>
                      </View>
                      <Text style={[styles.coachPickerName, selected && styles.coachPickerNameSelected]}>
                        {coach.full_name}
                      </Text>
                      <Text style={styles.coachPickerCheck}>{selected ? '✓' : ''}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Delete button inside edit modal */}
            {isEditing && (
              <TouchableOpacity
                style={styles.deleteModalBtn}
                onPress={() => { closeModal(); handleDelete(editingProgram!); }}
              >
                <Text style={styles.deleteModalBtnText}>🗑 Delete Program</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  addRow: { flexDirection: 'row', justifyContent: 'flex-end', padding: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  addBtn: { backgroundColor: '#16A34A', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  list: { padding: 16 },

  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  levelText: { fontSize: 12, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  activeStatus: { backgroundColor: '#ECFDF5' },
  inactiveStatus: { backgroundColor: '#F3F4F6' },
  statusText: { fontSize: 12, fontWeight: '600' },
  activeText: { color: '#16A34A' },
  inactiveText: { color: '#6B7280' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardDesc: { fontSize: 14, color: '#6B7280', marginBottom: 6 },
  cardMeta: { fontSize: 13, color: '#9CA3AF', marginBottom: 12 },

  cardActions: { flexDirection: 'row', gap: 8 },
  rosterBtn: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  rosterBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  editBtn: { flex: 1, backgroundColor: '#EFF6FF', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  editBtnText: { fontSize: 13, fontWeight: '600', color: '#2563EB' },
  deleteBtn: { width: 38, backgroundColor: '#FEF2F2', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  deleteBtnText: { fontSize: 14 },

  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#9CA3AF', fontSize: 14 },

  modal: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  cancelBtn: { fontSize: 16, color: '#6B7280' },
  saveBtn: { fontSize: 16, color: '#16A34A', fontWeight: '700' },
  form: { padding: 20, gap: 4 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 14, fontSize: 16, color: '#111827', marginBottom: 16, backgroundColor: '#F9FAFB' },
  textarea: { height: 100, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  subLevelRow: { marginLeft: 12, borderLeftWidth: 3, borderLeftColor: '#3B82F6', paddingLeft: 12 },
  chip: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#F9FAFB' },
  chipText: { fontSize: 13, color: '#374151' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '600' },
  deleteModalBtn: { marginTop: 24, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' },
  deleteModalBtnText: { color: '#DC2626', fontWeight: '700', fontSize: 15 },

  // Coach display on card
  coachRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  coachRowLabel: { fontSize: 14 },
  coachNames: { fontSize: 13, color: '#374151', fontWeight: '500', flex: 1 },

  // Coach picker in modal
  sublabel: { fontSize: 12, color: '#6B7280', marginBottom: 10, marginTop: -2 },
  noCoachText: { fontSize: 13, color: '#9CA3AF', marginBottom: 16 },
  coachPickerList: { gap: 8, marginBottom: 16 },
  coachPickerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  coachPickerRowSelected: { borderColor: '#16A34A', backgroundColor: '#ECFDF5' },
  coachPickerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  coachPickerAvatarSelected: { backgroundColor: '#16A34A' },
  coachPickerAvatarText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  coachPickerName: { flex: 1, fontSize: 14, color: '#374151', fontWeight: '500' },
  coachPickerNameSelected: { color: '#166534', fontWeight: '700' },
  coachPickerCheck: { fontSize: 16, color: '#16A34A', fontWeight: '700', width: 20, textAlign: 'center' },
});
