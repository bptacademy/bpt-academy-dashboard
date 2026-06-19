import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, TextInput, Modal, ActivityIndicator, Image, Dimensions} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Program, ProgramTemplate, SkillLevel, Division, DIVISION_LABELS, DIVISION_COLORS } from '../../types';
import ScreenHeader from '../../components/common/ScreenHeader';

type CoachProfile = { id: string; full_name: string; };

// Find (or create) the public catalog template for a (division, skill_level)
// pair, returning its id so a child-program can link to it.
async function resolveTemplateId(division: Division, skillLevel: SkillLevel | null): Promise<string | null> {
  let query = supabase.from('program_templates').select('id').eq('division', division);
  query = skillLevel == null ? query.is('skill_level', null) : query.eq('skill_level', skillLevel);
  const { data: existing } = await query.maybeSingle();
  if (existing?.id) return existing.id;

  const title = DIVISION_LABELS[division]
    + (skillLevel ? ` · ${skillLevel.charAt(0).toUpperCase()}${skillLevel.slice(1)}` : '');
  const { data: created } = await supabase
    .from('program_templates')
    .insert({ division, skill_level: skillLevel, title })
    .select('id')
    .single();
  return created?.id ?? null;
}

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
  price_gbp: string;
  sessions_per_week: number;
  selectedCoachIds: string[];
};

const EMPTY_FORM: FormState = {
  title: '', description: '', division: 'amateur', skill_level: 'beginner',
  duration_weeks: '', price_gbp: '', sessions_per_week: 2, selectedCoachIds: [],
};

export default function ManageProgramsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const tabBarPadding = useTabBarPadding();
  const { profile } = useAuth();
  const [programs, setPrograms]             = useState<Program[]>([]);
  const [templates, setTemplates]           = useState<ProgramTemplate[]>([]);
  const [programCoaches, setProgramCoaches] = useState<Record<string, CoachProfile[]>>({});
  const [availableCoaches, setAvailableCoaches] = useState<CoachProfile[]>([]);
  const [refreshing, setRefreshing]         = useState(false);
  const [modalVisible, setModalVisible]     = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [form, setForm]                     = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving]                 = useState(false);

  const fetchPrograms = async () => {
    const [progRes, tplRes, coachAssignRes, availRes] = await Promise.all([
      supabase.from('programs').select('*').order('created_at', { ascending: false }),
      supabase.from('program_templates').select('*'),
      supabase.from('program_coaches').select('program_id, coach:profiles!coach_id(id, full_name)'),
      supabase.from('profiles').select('id, full_name').in('role', ['admin', 'coach']).order('full_name'),
    ]);

    if (progRes.data) setPrograms(progRes.data);
    if (tplRes.data) setTemplates(tplRes.data as ProgramTemplate[]);
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

  // Create a new child-program (group) under a specific parent template —
  // prefills the division/level/price so it links to the same parent.
  const openCreateUnder = (t: ProgramTemplate) => {
    const groupCount = programs.filter((p) => (p as any).template_id === t.id).length;
    setEditingProgram(null);
    setForm({
      ...EMPTY_FORM,
      division: t.division,
      skill_level: (t.skill_level ?? 'beginner') as SkillLevel,
      title: `${t.title} — Group ${groupCount + 1}`,
      price_gbp: t.price_gbp != null ? String(t.price_gbp) : '',
    });
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
      price_gbp: (p as any).price_gbp != null ? String((p as any).price_gbp) : '',
      sessions_per_week: (p as any).sessions_per_week ?? 2,
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

    const division = form.division;
    const skillLevel = form.division === 'amateur' ? form.skill_level : null;

    // Link this child-program to its public catalog parent (availability-first
    // flow). One template per (division, skill_level); create it if missing.
    const templateId = await resolveTemplateId(division, skillLevel);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      division,
      skill_level: skillLevel,
      template_id: templateId,
      duration_weeks: form.duration_weeks ? parseInt(form.duration_weeks) : null,
      price_gbp: form.price_gbp ? parseFloat(form.price_gbp) : null,
      sessions_per_week: form.sessions_per_week,
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

    await supabase.from('program_coaches').delete().eq('program_id', programId);
    if (form.selectedCoachIds.length > 0) {
      await supabase.from('program_coaches').insert(
        form.selectedCoachIds.map((coachId) => ({ program_id: programId, coach_id: coachId }))
      );
    }

    if (!editingProgram && form.duration_weeks && parseInt(form.duration_weeks) > 0) {
      const totalSessions = parseInt(form.duration_weeks) * form.sessions_per_week;
      const { count } = await supabase
        .from('modules')
        .select('*', { count: 'exact', head: true })
        .eq('program_id', programId);
      if (!count || count === 0) {
        const modules = Array.from({ length: totalSessions }, (_, i) => ({
          program_id: programId,
          title: `Session ${i + 1}`,
          order_index: i + 1,
        }));
        await supabase.from('modules').insert(modules);
      }
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

  const renderProgramCard = (p: Program) => {
    return (
      <View key={p.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{p.title}</Text>
          <TouchableOpacity
            style={[styles.statusBadge, p.is_active ? styles.activeStatus : styles.inactiveStatus]}
            onPress={() => toggleActive(p)}
          >
            <Text style={[styles.statusText, p.is_active ? styles.activeText : styles.inactiveText]}>
              {p.is_active ? 'Active' : 'Inactive'}
            </Text>
          </TouchableOpacity>
        </View>

        {p.description ? <Text style={styles.cardDesc} numberOfLines={2}>{p.description}</Text> : null}
        <View style={styles.cardMetaRow}>
          <Text style={styles.cardMeta}>⏱ {p.duration_weeks ?? '—'} weeks · {(p as any).sessions_per_week ?? 2}x/week</Text>
          {(p as any).price_gbp != null
            ? <Text style={styles.cardPrice}>£{parseFloat((p as any).price_gbp).toFixed(2)}</Text>
            : <Text style={styles.cardPriceFree}>Free</Text>}
        </View>

        {(programCoaches[p.id] ?? []).length > 0 && (
          <View style={styles.coachRow}>
            <Text style={styles.coachRowLabel}>👨‍🏫</Text>
            <Text style={styles.coachNames}>
              {(programCoaches[p.id] ?? []).map((c) => c.full_name).join(' · ')}
            </Text>
          </View>
        )}

        {/* Action grid — 3 per row, wraps cleanly so labels stay readable */}
        <View style={styles.cardActions}>
          <TouchableOpacity style={[styles.gridBtn, styles.rosterBtn]} onPress={() => navigation.navigate('ProgramRoster', { programId: p.id })}>
            <Text style={styles.rosterBtnText}>👥 Roster</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.gridBtn, styles.modulesBtn]} onPress={() => navigation.navigate('ProgramModules', { programId: p.id, programTitle: p.title })}>
            <Text style={styles.modulesBtnText}>📋 Modules</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.gridBtn, styles.scheduleBtn]} onPress={() => navigation.navigate('ScheduleGenerator', { programId: p.id, programTitle: p.title, maxStudents: p.max_students, durationWeeks: (p as any).duration_weeks ?? null, sessionsPerWeek: (p as any).sessions_per_week ?? null })}>
            <Text style={styles.scheduleBtnText}>📅 Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.gridBtn, styles.matchesBtn]} onPress={() => navigation.navigate('RecommendedStudents', { programId: p.id, programTitle: p.title })}>
            <Text style={styles.matchesBtnText}>🎯 Matches</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.gridBtn, styles.editBtn]} onPress={() => openEdit(p)}>
            <Text style={styles.editBtnText}>✏️ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.gridBtn, styles.deleteBtn]} onPress={() => handleDelete(p)}>
            <Text style={styles.deleteBtnText}>🗑 Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Group child-programs under their parent template for a clear parent → child view.
  const sortedTemplates = [...templates].sort((a, b) =>
    (DIVISION_LABELS[a.division] + (a.skill_level ?? '')).localeCompare(DIVISION_LABELS[b.division] + (b.skill_level ?? '')));
  const groupsFor = (templateId: string) => programs.filter((p) => (p as any).template_id === templateId);
  const untemplated = programs.filter((p) => !(p as any).template_id);

  return (
    <View style={styles.container}>
      <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <ScreenHeader title="Programs" />
        <View style={styles.addRow}>
          <Text style={styles.addRowHint}>Parent levels · add groups beneath each</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
            <Text style={styles.addBtnText}>+ New Level</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.list}>
          {sortedTemplates.map((t) => {
            const color = DIVISION_COLORS[t.division] ?? '#6B7280';
            const groups = groupsFor(t.id);
            const sub = t.skill_level ? ` · ${t.skill_level.charAt(0).toUpperCase() + t.skill_level.slice(1)}` : '';
            return (
              <View key={t.id} style={styles.templateSection}>
                <View style={styles.templateHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={[styles.levelBadge, { backgroundColor: color + '20', alignSelf: 'flex-start' }]}>
                      <Text style={[styles.levelText, { color }]}>{DIVISION_LABELS[t.division]}{sub}</Text>
                    </View>
                    <Text style={styles.templateTitle}>{t.title}</Text>
                    <Text style={styles.templateSub}>{groups.length} group{groups.length === 1 ? '' : 's'} · parent program</Text>
                  </View>
                  <TouchableOpacity style={styles.addGroupBtn} onPress={() => openCreateUnder(t)}>
                    <Text style={styles.addGroupBtnText}>＋ Add group</Text>
                  </TouchableOpacity>
                </View>

                {groups.length === 0 ? (
                  <TouchableOpacity style={styles.emptyGroup} onPress={() => openCreateUnder(t)}>
                    <Text style={styles.emptyGroupText}>No groups yet — tap “＋ Add group” to create one under this level.</Text>
                  </TouchableOpacity>
                ) : (
                  groups.map(renderProgramCard)
                )}
              </View>
            );
          })}

          {untemplated.length > 0 && (
            <View style={styles.templateSection}>
              <Text style={styles.templateTitle}>Other</Text>
              {untemplated.map(renderProgramCard)}
            </View>
          )}

          {templates.length === 0 && programs.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No programs yet. Tap “+ New Level” to create your first one!</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create / Edit modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
        <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
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

            <Text style={styles.label}>Sessions per week</Text>
            <Text style={styles.sublabel}>How many training sessions per week</Text>
            <View style={styles.chipRow}>
              {[1, 2, 3, 4].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.chip, form.sessions_per_week === n && { backgroundColor: '#16A34A', borderColor: '#16A34A' }]}
                  onPress={() => setForm({ ...form, sessions_per_week: n })}
                >
                  <Text style={[styles.chipText, form.sessions_per_week === n && styles.chipTextActive]}>
                    {n}x / week
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Price (£)</Text>
            <View style={styles.priceInputRow}>
              <View style={styles.pricePrefix}>
                <Text style={styles.pricePrefixText}>£</Text>
              </View>
              <TextInput
                style={styles.priceInput}
                value={form.price_gbp}
                onChangeText={(v) => setForm({ ...form, price_gbp: v })}
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
              />
            </View>

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
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  addRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  addRowHint: { flex: 1, fontSize: 12, color: '#6B7280', marginRight: 10 },
  addBtn: { backgroundColor: '#16A34A', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  list: { padding: 16, paddingBottom: 80 },

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
  cardMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardMeta: { fontSize: 13, color: '#9CA3AF' },
  cardPrice: { fontSize: 15, fontWeight: '700', color: '#16A34A' },
  cardPriceFree: { fontSize: 13, color: '#9CA3AF' },

  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  // 3 per row (flexBasis 31% + grow), wraps to a tidy 2-row grid; labels stay on one line.
  gridBtn: { flexBasis: '31%', flexGrow: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  rosterBtn: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
  rosterBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  scheduleBtn: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  scheduleBtnText: { fontSize: 13, fontWeight: '600', color: '#2563EB' },
  matchesBtn: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  matchesBtnText: { fontSize: 13, fontWeight: '600', color: '#059669' },
  modulesBtn: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
  modulesBtnText: { fontSize: 13, fontWeight: '600', color: '#D97706' },
  editBtn: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  editBtnText: { fontSize: 13, fontWeight: '600', color: '#2563EB' },
  deleteBtn: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  deleteBtnText: { fontSize: 13, fontWeight: '600', color: '#DC2626' },

  // Parent-template sections
  templateSection: { marginBottom: 22 },
  templateHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  templateTitle: { fontSize: 17, fontWeight: '800', color: '#F0F6FC', marginTop: 6 },
  templateSub: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  addGroupBtn: { backgroundColor: '#2563EB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, marginTop: 4 },
  addGroupBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  emptyGroup: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: '#D1D5DB', padding: 16 },
  emptyGroupText: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 18 },

  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#9CA3AF', fontSize: 14 },

  modalContainer: { flex: 1, backgroundColor: '#0B1628' },
  modal: { flex: 1, backgroundColor: 'transparent' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.10)' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#F0F6FC' },
  cancelBtn: { fontSize: 16, color: '#A0B0C8' },
  saveBtn: { fontSize: 16, color: '#16A34A', fontWeight: '700' },
  form: { padding: 20, gap: 4 },
  label: { fontSize: 14, fontWeight: '600', color: '#F0F6FC', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 14, fontSize: 16, color: '#F0F6FC', marginBottom: 16, backgroundColor: 'rgba(17,30,51,0.85)' },
  textarea: { height: 100, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  subLevelRow: { marginLeft: 12, borderLeftWidth: 3, borderLeftColor: '#3B82F6', paddingLeft: 12 },
  chip: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.06)' },
  chipText: { fontSize: 13, color: '#CBD5E1' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '600' },
  deleteModalBtn: { marginTop: 24, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' },
  deleteModalBtnText: { color: '#DC2626', fontWeight: '700', fontSize: 15 },

  coachRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  coachRowLabel: { fontSize: 14 },
  coachNames: { fontSize: 13, color: '#374151', fontWeight: '500', flex: 1 },

  sublabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 10, marginTop: -2 },
  noCoachText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16 },
  coachPickerList: { gap: 8, marginBottom: 16 },
  coachPickerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(17,30,51,0.85)' },
  coachPickerRowSelected: { borderColor: '#16A34A', backgroundColor: 'rgba(22,163,74,0.15)' },
  coachPickerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  coachPickerAvatarSelected: { backgroundColor: '#16A34A' },
  coachPickerAvatarText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  coachPickerName: { flex: 1, fontSize: 14, color: '#CBD5E1', fontWeight: '500' },
  coachPickerNameSelected: { color: '#4ADE80', fontWeight: '700' },
  coachPickerCheck: { fontSize: 16, color: '#16A34A', fontWeight: '700', width: 20, textAlign: 'center' },

  priceInputRow: { flexDirection: 'row', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 10, overflow: 'hidden', marginBottom: 16, backgroundColor: 'rgba(17,30,51,0.85)' },
  pricePrefix: { backgroundColor: 'rgba(255,255,255,0.10)', paddingHorizontal: 14, justifyContent: 'center' },
  pricePrefixText: { fontSize: 16, fontWeight: '700', color: '#CBD5E1' },
  priceInput: { flex: 1, padding: 14, fontSize: 16, color: '#F0F6FC' },
});
