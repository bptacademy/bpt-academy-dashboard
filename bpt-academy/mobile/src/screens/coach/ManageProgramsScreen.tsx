import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, TextInput, Modal,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Program, SkillLevel } from '../../types';

const SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced', 'competition'];

const LEVEL_COLORS: Record<SkillLevel, string> = {
  beginner: '#3B82F6',
  intermediate: '#F59E0B',
  advanced: '#EF4444',
  competition: '#8B5CF6',
};

export default function ManageProgramsScreen({ navigation }: any) {
  const { profile } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', skill_level: 'beginner' as SkillLevel, duration_weeks: '',
  });

  const fetchPrograms = async () => {
    const { data } = await supabase.from('programs').select('*').order('created_at', { ascending: false });
    if (data) setPrograms(data);
  };

  const onRefresh = async () => { setRefreshing(true); await fetchPrograms(); setRefreshing(false); };
  useEffect(() => { fetchPrograms(); }, []);

  const handleCreate = async () => {
    if (!form.title) { Alert.alert('Error', 'Title is required'); return; }
    const { error } = await supabase.from('programs').insert({
      title: form.title,
      description: form.description,
      skill_level: form.skill_level,
      duration_weeks: form.duration_weeks ? parseInt(form.duration_weeks) : null,
      coach_id: profile!.id,
      is_active: true,
    });
    if (error) { Alert.alert('Error', error.message); return; }
    setModalVisible(false);
    setForm({ title: '', description: '', skill_level: 'beginner', duration_weeks: '' });
    fetchPrograms();
  };

  const toggleActive = async (program: Program) => {
    await supabase.from('programs').update({ is_active: !program.is_active }).eq('id', program.id);
    fetchPrograms();
  };

  return (
    <View style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.header}>
          <Text style={styles.title}>Programs</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.addBtnText}>+ New</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.list}>
          {programs.map((p) => (
            <TouchableOpacity key={p.id} style={styles.card} onPress={() => navigation.navigate('ProgramRoster', { programId: p.id })}>
              <View style={styles.cardHeader}>
                <View style={[styles.levelBadge, { backgroundColor: LEVEL_COLORS[p.skill_level] + '20' }]}>
                  <Text style={[styles.levelText, { color: LEVEL_COLORS[p.skill_level] }]}>
                    {p.skill_level.charAt(0).toUpperCase() + p.skill_level.slice(1)}
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
              {p.description && <Text style={styles.cardDesc} numberOfLines={2}>{p.description}</Text>}
              <Text style={styles.cardMeta}>{p.duration_weeks ?? '—'} weeks</Text>
              <Text style={styles.cardTap}>Tap to view roster →</Text>
            </TouchableOpacity>
          ))}
          {programs.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No programs yet. Create your first one!</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelBtn}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Program</Text>
            <TouchableOpacity onPress={handleCreate}>
              <Text style={styles.saveBtn}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Title *</Text>
            <TextInput style={styles.input} value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} placeholder="Program title" placeholderTextColor="#9CA3AF" />

            <Text style={styles.label}>Description</Text>
            <TextInput style={[styles.input, styles.textarea]} value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} placeholder="What will students learn?" placeholderTextColor="#9CA3AF" multiline numberOfLines={4} />

            <Text style={styles.label}>Skill Level</Text>
            <View style={styles.chipRow}>
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

            <Text style={styles.label}>Duration (weeks)</Text>
            <TextInput style={styles.input} value={form.duration_weeks} onChangeText={(v) => setForm({ ...form, duration_weeks: v })} placeholder="e.g. 8" placeholderTextColor="#9CA3AF" keyboardType="numeric" />
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 48, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 26, fontWeight: '700', color: '#111827' },
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
  cardMeta: { fontSize: 13, color: '#9CA3AF' },
  cardTap: { fontSize: 12, color: '#16A34A', marginTop: 8, fontWeight: '500' },
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
  chip: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#F9FAFB' },
  chipText: { fontSize: 13, color: '#374151' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '600' },
});
