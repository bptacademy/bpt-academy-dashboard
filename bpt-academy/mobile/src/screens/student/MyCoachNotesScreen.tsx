import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Image, Dimensions,
} from 'react-native';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { CoachNote } from '../../types';
import ScreenHeader from '../../components/common/ScreenHeader';

const { width: SW, height: SH } = Dimensions.get('window');

interface NoteWithCoach extends CoachNote {
  coach?: { full_name: string } | null;
}

export default function MyCoachNotesScreen() {
  const tabBarPadding = useTabBarPadding();
  const { profile } = useAuth();
  const [notes, setNotes] = useState<NoteWithCoach[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isStudent = profile?.role === 'student';

  const fetchNotes = async () => {
    if (!profile || !isStudent) return;
    const { data } = await supabase
      .from('coach_notes')
      .select('*, coach:coach_id(full_name)')
      .eq('student_id', profile.id)
      .eq('is_private', false)
      .order('created_at', { ascending: false });
    if (data) setNotes(data as NoteWithCoach[]);
  };

  const load = async () => {
    setLoading(true);
    await fetchNotes();
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotes();
    setRefreshing(false);
  };

  useEffect(() => { load(); }, [profile]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  if (!isStudent) {
    return (
      <View style={styles.root}>
        <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />
        <ScreenHeader title="Coach Notes" />
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🎾</Text>
          <Text style={styles.emptyTitle}>Not available</Text>
          <Text style={styles.emptyText}>Coach notes are only visible to students.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Dark background — same as all other screens */}
      <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />

      <ScreenHeader title="Coach Notes" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarPadding }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#22C55E"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#22C55E" style={styles.loader} />
        ) : notes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>No notes yet</Text>
            <Text style={styles.emptyText}>Your coach hasn't left any notes for you yet.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.countLabel}>{notes.length} note{notes.length !== 1 ? 's' : ''} from your coaches</Text>
            {notes.map(note => (
              <View key={note.id} style={styles.noteCard}>
                <View style={styles.noteHeader}>
                  <View style={styles.coachBadge}>
                    <Text style={styles.coachInitial}>
                      {note.coach?.full_name?.charAt(0) ?? '?'}
                    </Text>
                  </View>
                  <View style={styles.noteHeaderText}>
                    <Text style={styles.coachName}>{note.coach?.full_name ?? 'Coach'}</Text>
                    <Text style={styles.noteDate}>{formatDate(note.created_at)}</Text>
                  </View>
                </View>
                <Text style={styles.noteBody}>{note.note}</Text>
                {note.updated_at !== note.created_at && (
                  <Text style={styles.editedLabel}>Edited {formatDate(note.updated_at)}</Text>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#0B1628' },
  bgImage: { position: 'absolute', top: 0, left: 0, width: SW, height: SH },
  content: { padding: 20 },
  loader:  { marginTop: 60 },

  emptyCard: {
    backgroundColor: 'rgba(17,30,51,0.85)', borderRadius: 14, padding: 40,
    alignItems: 'center', borderWidth: 1, borderColor: '#1E3050', margin: 20,
  },
  emptyIcon:  { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#F0F6FC', marginBottom: 6 },
  emptyText:  { fontSize: 13, color: '#7A8FA6', textAlign: 'center' },

  countLabel: { fontSize: 13, color: '#7A8FA6', marginBottom: 14 },

  noteCard: {
    backgroundColor: 'rgba(17,30,51,0.85)', borderRadius: 14, padding: 18,
    marginBottom: 14, borderWidth: 1, borderColor: '#1E3050',
  },
  noteHeader:     { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  coachBadge: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#16A34A',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  coachInitial:   { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  noteHeaderText: { flex: 1 },
  coachName:      { fontSize: 15, fontWeight: '700', color: '#F0F6FC' },
  noteDate:       { fontSize: 12, color: '#7A8FA6', marginTop: 2 },
  noteBody:       { fontSize: 14, color: '#CBD5E1', lineHeight: 22 },
  editedLabel:    { fontSize: 11, color: '#7A8FA6', marginTop: 10, fontStyle: 'italic' },
});
