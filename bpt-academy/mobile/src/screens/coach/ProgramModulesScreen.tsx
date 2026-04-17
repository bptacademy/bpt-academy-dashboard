import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal, RefreshControl, Image, Dimensions} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { supabase } from '../../lib/supabase';
import BackHeader from '../../components/common/BackHeader';
import { Module } from '../../types';
import BackButton from '../../components/common/BackButton';

export default function ProgramModulesScreen({ route }: any) {
  const insets = useSafeAreaInsets();
  const tabBarPadding = useTabBarPadding();
  const { programId, programTitle } = route.params;
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal state — used for both add and edit
  const [modalVisible, setModalVisible] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null); // null = adding new
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

  const openAdd = () => {
    setEditingModule(null);
    setEditTitle('');
    setEditDescription('');
    setModalVisible(true);
  };

  const openEdit = (mod: Module) => {
    setEditingModule(mod);
    setEditTitle(mod.title);
    setEditDescription(mod.description ?? '');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingModule(null);
    setEditTitle('');
    setEditDescription('');
  };

  const handleSave = async () => {
    if (!editTitle.trim()) { Alert.alert('Error', 'Module title is required'); return; }
    setSaving(true);

    if (editingModule) {
      // Update existing
      const { error } = await supabase
        .from('modules')
        .update({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
        })
        .eq('id', editingModule.id);
      setSaving(false);
      if (error) { Alert.alert('Error', error.message); return; }
    } else {
      // Insert new — order_index = current max + 1
      const nextIndex = modules.length > 0
        ? Math.max(...modules.map(m => m.order_index ?? 0)) + 1
        : 1;
      const { error } = await supabase
        .from('modules')
        .insert({
          program_id: programId,
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          order_index: nextIndex,
        });
      setSaving(false);
      if (error) { Alert.alert('Error', error.message); return; }
    }

    closeModal();
    fetchModules();
  };

  const handleDelete = (mod: Module) => {
    Alert.alert(
      'Delete Module',
      `Remove "${mod.title}" from this program? Student progress for this module will also be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('modules').delete().eq('id', mod.id);
            if (error) { Alert.alert('Error', error.message); return; }
            fetchModules();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
      <BackButton />

      <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />

        <BackHeader title="Modules" />
        <ActivityIndicator size="large" color="#16A34A" style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BackHeader title={`${programTitle ?? 'Program'} — Modules`} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarPadding }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.hint}>
          Tap a module to edit it. Long press to delete. Use the + button to add new modules.
        </Text>

        {modules.map((mod, idx) => {
          const hasDesc = !!mod.description;
          return (
            <TouchableOpacity
              key={mod.id}
              style={[styles.moduleCard, hasDesc && styles.moduleCardFilled]}
              onPress={() => openEdit(mod)}
              onLongPress={() => handleDelete(mod)}
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
                    <Text style={styles.moduleDescEmpty}>No description — tap to add</Text>
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
              Tap the + button below to add your first module.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Module FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Add / Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal}>
              <Text style={styles.cancelBtn}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingModule ? 'Edit Module' : 'Add Module'}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.saveBtn, saving && { opacity: 0.4 }]}>
                {saving ? 'Saving…' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Module Title *</Text>
            <TextInput
              style={styles.input}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="e.g. Session 3 — Volleys"
              placeholderTextColor="#9CA3AF"
              autoFocus={!editingModule}
            />

            <Text style={styles.fieldLabel}>Goal / Description</Text>
            <Text style={styles.fieldHint}>
              What will students practise and learn in this session?
            </Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="e.g. Focus on net positioning and volley technique. By the end of this session students should be able to execute a controlled cross-court volley."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            {/* Preview */}
            <View style={styles.previewBox}>
              <Text style={styles.previewLabel}>👁 Student preview</Text>
              <Text style={styles.previewTitle}>{editTitle || 'Module title'}</Text>
              {editDescription ? (
                <Text style={styles.previewDesc}>{editDescription}</Text>
              ) : (
                <Text style={styles.previewDescEmpty}>No description yet.</Text>
              )}
            </View>

            {/* Delete option when editing */}
            {editingModule && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => { closeModal(); handleDelete(editingModule); }}
              >
                <Text style={styles.deleteBtnText}>🗑 Delete this module</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loader: { marginTop: 60 },
  content: { padding: 16 },

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

  fab: {
    position: 'absolute', bottom: 30, right: 24,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 6, elevation: 5,
  },
  fabIcon: { fontSize: 32, color: '#FFFFFF', lineHeight: 36 },

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
    borderWidth: 1, borderColor: '#BBF7D0', marginBottom: 24,
  },
  previewLabel: { fontSize: 11, fontWeight: '700', color: '#16A34A', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  previewTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
  previewDesc: { fontSize: 14, color: '#374151', lineHeight: 20 },
  previewDescEmpty: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' },

  deleteBtn: {
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 14,
    alignItems: 'center', marginBottom: 40,
    borderWidth: 1, borderColor: '#FECACA',
  },
  deleteBtnText: { color: '#DC2626', fontWeight: '600', fontSize: 15 },
});
