import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal, RefreshControl,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import BackHeader from '../../components/common/BackHeader';
import { Module } from '../../types';

export default function ProgramModulesScreen({ route }: any) {
  const { programId, programTitle } = route.params;
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit modal state
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const fetchModules = useCallback(async () => {
    const { data } = await supabase
      .from('modules')
      .select('*')
      .eq('program_id', programId)
      .order('order_index');
    setModules(data ?? []);
    setLoading(false);
  }, [programId]);

  useEffect(() => { fetchModules(); }, [fetchModules]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchModules();
    setRefreshing(false);
  };

  const openEdit = (mod: Module) => {
    setEditingModule(mod);
    setEditTitle(mod.title);
    setEditDescription(mod.description ?? '');
  };

  const closeEdit = () => {
    setEditingModule(null);
    setEditTitle('');
    setEditDescription('');
  };

  const handleSave = async () => {
    if (!editingModule) return;
    if (!editTitle.trim()) { Alert.alert('Error', 'Title is required'); return; }
    setSaving(true);
    const { error } = await supabase
      .from('modules')
      .update({
        title: editTitle.trim(),
        description: editDescription.trim() || null,
      })
      .eq('id', editingModule.id);

    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    closeEdit();
    fetchModules();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <BackHeader title="Modules" />
        <ActivityIndicator size="large" color="#16A34A" style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BackHeader title={`${programTitle} — Modules`} />

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.hint}>
          Tap any module to add or edit its title and goal description. Students will see this when they tap the module.
        </Text>

        {modules.map((mod, idx) => {
          const hasDesc = !!mod.description;
          return (
            <TouchableOpacity
              key={mod.id}
              style={[styles.moduleCard, hasDesc && styles.moduleCardFilled]}
              onPress={() => openEdit(mod)}
              activeOpacity={0.75}
            >
              <View style={styles.moduleLeft}>
                <View style={[styles.moduleIndex, hasDesc && styles.moduleIndexFilled]}>
                  <Text style={[styles.moduleIndexText, hasDesc && styles.moduleIndexTextFilled]}>
                    {idx + 1}
                  </Text>
                </View>
                <View style={styles.moduleInfo}>
                  <Text style={styles.moduleTitle}>{mod.title}</Text>
                  {hasDesc ? (
                    <Text style={styles.moduleDesc} numberOfLines={2}>{mod.description}</Text>
                  ) : (
                    <Text style={styles.moduleDescEmpty}>No description yet — tap to add</Text>
                  )}
                </View>
              </View>
              <Text style={styles.editIcon}>✏️</Text>
            </TouchableOpacity>
          );
        })}

        {modules.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No modules yet</Text>
            <Text style={styles.emptyNote}>
              Modules are auto-generated when you create a program with a set duration and sessions per week.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Edit modal */}
      <Modal
        visible={!!editingModule}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeEdit}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeEdit}>
              <Text style={styles.cancelBtn}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Module</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.saveBtn, saving && { opacity: 0.4 }]}>
                {saving ? 'Saving…' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Module Title</Text>
            <TextInput
              style={styles.input}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="e.g. Session 3 — Volleys"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.fieldLabel}>Goal / Description</Text>
            <Text style={styles.fieldHint}>
              Explain what this session is about — what students will practise and what they should take away. Students can read this before and after the session.
            </Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="e.g. Focus on net positioning and volley technique. By the end of this session students should be able to execute a controlled cross-court volley from the kitchen line."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <View style={styles.previewBox}>
              <Text style={styles.previewLabel}>👁 Student preview</Text>
              <Text style={styles.previewTitle}>{editTitle || 'Module title'}</Text>
              {editDescription ? (
                <Text style={styles.previewDesc}>{editDescription}</Text>
              ) : (
                <Text style={styles.previewDescEmpty}>No description yet.</Text>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loader: { marginTop: 60 },
  content: { padding: 16, paddingBottom: 40 },

  hint: {
    fontSize: 13, color: '#6B7280', marginBottom: 16,
    backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#DBEAFE',
  },

  moduleCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  moduleCardFilled: { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' },
  moduleLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: 12 },
  moduleIndex: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  moduleIndexFilled: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  moduleIndexText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  moduleIndexTextFilled: { color: '#FFFFFF' },
  moduleInfo: { flex: 1 },
  moduleTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 3 },
  moduleDesc: { fontSize: 13, color: '#374151', lineHeight: 18 },
  moduleDescEmpty: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' },
  editIcon: { fontSize: 16, marginLeft: 8 },

  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 40,
    alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB',
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptyNote: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },

  // Modal
  modal: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  cancelBtn: { fontSize: 16, color: '#6B7280' },
  saveBtn: { fontSize: 16, color: '#16A34A', fontWeight: '700' },
  modalBody: { padding: 20 },

  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  fieldHint: { fontSize: 12, color: '#6B7280', marginBottom: 8, lineHeight: 18 },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    padding: 14, fontSize: 15, color: '#111827',
    marginBottom: 20, backgroundColor: '#F9FAFB',
  },
  textarea: { height: 140, textAlignVertical: 'top' },

  previewBox: {
    backgroundColor: '#F0FDF4', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#BBF7D0', marginBottom: 40,
  },
  previewLabel: { fontSize: 11, fontWeight: '700', color: '#16A34A', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  previewTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
  previewDesc: { fontSize: 14, color: '#374151', lineHeight: 20 },
  previewDescEmpty: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' },
});
