import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Switch, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { CoachNote, Profile } from '../../types';
import BackHeader from '../../components/common/BackHeader';

interface NoteWithCoach extends CoachNote {
  coach?: { full_name: string } | null;
}

interface Props {
  navigation: any;
  route?: { params?: { studentId?: string; studentName?: string } };
}

export default function CoachNotesScreen({ navigation, route }: Props) {
  const targetStudentId = route?.params?.studentId;
  const targetStudentName = route?.params?.studentName;
  const { profile: coachProfile } = useAuth();

  const [students, setStudents] = useState<Profile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Profile | null>(null);
  const [notes, setNotes] = useState<NoteWithCoach[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchStudents = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .order('full_name');
    if (data) setStudents(data as Profile[]);
  };

  const fetchNotes = async (studentId: string) => {
    const { data } = await supabase
      .from('coach_notes')
      .select('*, coach:coach_id(full_name)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    if (data) setNotes(data as NoteWithCoach[]);
  };

  const load = async () => {
    setLoading(true);
    await fetchStudents();
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (targetStudentId && students.length > 0) {
      const s = students.find(x => x.id === targetStudentId);
      if (s) selectStudent(s);
    }
  }, [targetStudentId, students]);

  const selectStudent = async (student: Profile) => {
    setSelectedStudent(student);
    await fetchNotes(student.id);
  };

  const handleAddNote = async () => {
    if (!coachProfile || !selectedStudent || !noteText.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from('coach_notes').insert({
      student_id: selectedStudent.id,
      coach_id: coachProfile.id,
      note: noteText.trim(),
      is_private: isPrivate,
    });
    setSubmitting(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setNoteText('');
      setIsPrivate(false);
      setModalVisible(false);
      await fetchNotes(selectedStudent.id);
    }
  };

  const handleDeleteNote = (note: NoteWithCoach) => {
    Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('coach_notes').delete().eq('id', note.id);
          setNotes(prev => prev.filter(n => n.id !== note.id));
        },
      },
    ]);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <View style={styles.container}>
      <BackHeader title="Coach Notes" />
      <View style={styles.body}>
        {/* Student list panel */}
        <View style={styles.studentPanel}>
          <Text style={styles.panelTitle}>Students</Text>
          {loading ? (
            <ActivityIndicator color="#16A34A" />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {students.map(s => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.studentRow, selectedStudent?.id === s.id && styles.studentRowActive]}
                  onPress={() => selectStudent(s)}
                >
                  <View style={styles.studentAvatar}>
                    <Text style={styles.studentAvatarText}>{s.full_name.charAt(0)}</Text>
                  </View>
                  <Text
                    style={[styles.studentName, selectedStudent?.id === s.id && styles.studentNameActive]}
                    numberOfLines={1}
                  >
                    {s.full_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Notes panel */}
        <View style={styles.notesPanel}>
          {!selectedStudent ? (
            <View style={styles.selectPrompt}>
              <Text style={styles.selectPromptIcon}>👈</Text>
              <Text style={styles.selectPromptText}>Select a student</Text>
            </View>
          ) : (
            <>
              <View style={styles.notesPanelHeader}>
                <Text style={styles.notesPanelTitle} numberOfLines={1}>{selectedStudent.full_name}</Text>
                <TouchableOpacity
                  style={styles.addNoteBtn}
                  onPress={() => setModalVisible(true)}
                >
                  <Text style={styles.addNoteBtnText}>+ Note</Text>
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.notesList}>
                {notes.length === 0 ? (
                  <Text style={styles.emptyNotes}>No notes yet.</Text>
                ) : (
                  notes.map(note => (
                    <View key={note.id} style={[styles.noteCard, note.is_private && styles.noteCardPrivate]}>
                      <View style={styles.noteTop}>
                        <View style={styles.noteTopLeft}>
                          {note.is_private && (
                            <View style={styles.privateBadge}><Text style={styles.privateBadgeText}>🔒 Private</Text></View>
                          )}
                        </View>
                        <TouchableOpacity onPress={() => handleDeleteNote(note)}>
                          <Text style={styles.deleteBtn}>🗑</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.noteText}>{note.note}</Text>
                      <Text style={styles.noteMeta}>
                        {note.coach?.full_name ?? 'Coach'} · {formatDate(note.created_at)}
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>
            </>
          )}
        </View>
      </View>

      {/* Add Note Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Note – {selectedStudent?.full_name}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Write your note here..."
              placeholderTextColor="#9CA3AF"
              value={noteText}
              onChangeText={setNoteText}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              autoFocus
            />
            <View style={styles.privateRow}>
              <Text style={styles.privateLabel}>Private (not visible to student)</Text>
              <Switch
                value={isPrivate}
                onValueChange={setIsPrivate}
                trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
                thumbColor={isPrivate ? '#16A34A' : '#9CA3AF'}
              />
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setModalVisible(false); setNoteText(''); setIsPrivate(false); }}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, !noteText.trim() && styles.modalSubmitBtnDisabled]}
                onPress={handleAddNote}
                disabled={submitting || !noteText.trim()}
              >
                {submitting
                  ? <ActivityIndicator color="#FFFFFF" />
                  : <Text style={styles.modalSubmitBtnText}>Save Note</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  body: { flex: 1, flexDirection: 'row' },
  studentPanel: {
    width: 130, backgroundColor: '#FFFFFF', borderRightWidth: 1, borderRightColor: '#F3F4F6', paddingTop: 12,
  },
  panelTitle: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', paddingHorizontal: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  studentRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, gap: 8 },
  studentRowActive: { backgroundColor: '#ECFDF5' },
  studentAvatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
  },
  studentAvatarText: { fontSize: 12, fontWeight: '700', color: '#374151' },
  studentName: { fontSize: 12, color: '#374151', flex: 1 },
  studentNameActive: { fontWeight: '700', color: '#16A34A' },
  notesPanel: { flex: 1, paddingTop: 12 },
  selectPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  selectPromptIcon: { fontSize: 36, marginBottom: 8 },
  selectPromptText: { fontSize: 14, color: '#9CA3AF' },
  notesPanelHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 12,
  },
  notesPanelTitle: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1 },
  addNoteBtn: { backgroundColor: '#16A34A', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  addNoteBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  notesList: { padding: 12, gap: 10, paddingBottom: 30 },
  emptyNotes: { textAlign: 'center', color: '#9CA3AF', marginTop: 20 },
  noteCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  noteCardPrivate: { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' },
  noteTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  noteTopLeft: {},
  privateBadge: { backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  privateBadgeText: { fontSize: 11, fontWeight: '600', color: '#92400E' },
  deleteBtn: { fontSize: 18 },
  noteText: { fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 10 },
  noteMeta: { fontSize: 11, color: '#9CA3AF' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 16 },
  modalInput: {
    backgroundColor: '#F9FAFB', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB',
    padding: 14, fontSize: 14, color: '#111827', minHeight: 120, marginBottom: 16,
  },
  privateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  privateLabel: { fontSize: 14, color: '#374151' },
  modalBtns: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: {
    flex: 1, borderRadius: 10, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  modalCancelBtnText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  modalSubmitBtn: { flex: 2, backgroundColor: '#16A34A', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  modalSubmitBtnDisabled: { backgroundColor: '#A7F3D0' },
  modalSubmitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
