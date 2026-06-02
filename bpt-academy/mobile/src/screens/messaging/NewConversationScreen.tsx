import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, Image, Dimensions, SectionList} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Profile } from '../../types';
import BackHeader from '../../components/common/BackHeader';

interface PersonRow {
  id: string;
  full_name: string;
  role: string;
  division?: string | null;
  avatar_url?: string | null;
}

export default function NewConversationScreen({ navigation }: any) {
  const tabBarPadding = useTabBarPadding();
  const { profile } = useAuth();
  const [coaches, setCoaches] = useState<PersonRow[]>([]);
  const [classmates, setClassmates] = useState<PersonRow[]>([]);
  const [allStudents, setAllStudents] = useState<PersonRow[]>([]); // for admins
  const [search, setSearch] = useState('');

  const isCoachOrAdmin =
    profile?.role === 'coach' ||
    profile?.role === 'admin' ||
    profile?.role === 'super_admin';
  const isStudent = profile?.role === 'student';

  useEffect(() => {
    if (!profile) return;
    loadPeople();
  }, [profile?.id]);

  const loadPeople = async () => {
    if (!profile) return;

    // Always load coaches/admins
    const { data: coachData } = await supabase
      .from('profiles')
      .select('id, full_name, role, division, avatar_url')
      .in('role', ['coach', 'admin', 'super_admin'])
      .neq('id', profile.id)
      .order('full_name');
    setCoaches((coachData ?? []) as PersonRow[]);

    if (isCoachOrAdmin) {
      // Admins/coaches see all students
      const { data: studentData } = await supabase
        .from('profiles')
        .select('id, full_name, role, division, avatar_url')
        .eq('role', 'student')
        .neq('id', profile.id)
        .order('full_name');
      setAllStudents((studentData ?? []) as PersonRow[]);
    }

    if (isStudent) {
      // Students see classmates from their active programs
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('program_id')
        .eq('student_id', profile.id)
        .in('status', ['active', 'pending_next_cycle']);

      const programIds = (enrollments ?? []).map((e: any) => e.program_id);

      if (programIds.length > 0) {
        const { data: classmateEnrollments } = await supabase
          .from('enrollments')
          .select('student_id, profile:profiles!student_id(id, full_name, role, division, avatar_url)')
          .in('program_id', programIds)
          .in('status', ['active', 'pending_next_cycle'])
          .neq('student_id', profile.id);

        // Deduplicate by id
        const seen = new Set<string>();
        const unique: PersonRow[] = [];
        for (const e of (classmateEnrollments ?? []) as any[]) {
          const p = e.profile;
          if (p && !seen.has(p.id)) {
            seen.add(p.id);
            unique.push(p as PersonRow);
          }
        }
        unique.sort((a, b) => a.full_name.localeCompare(b.full_name));
        setClassmates(unique);
      }
    }
  };

  const startConversation = async (recipient: PersonRow) => {
    const { data: conversationId, error } = await supabase
      .rpc('create_direct_conversation', { p_recipient_id: recipient.id });

    if (error || !conversationId) {
      Alert.alert('Error', error?.message ?? 'Could not start conversation.');
      return;
    }

    navigation.replace('Chat', {
      conversationId,
      title: recipient.full_name,
    });
  };

  const initials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const filter = (list: PersonRow[]) =>
    search === '' ? list : list.filter(p => p.full_name.toLowerCase().includes(search.toLowerCase()));

  const renderPerson = (person: PersonRow) => (
    <TouchableOpacity
      key={person.id}
      style={styles.card}
      onPress={() => startConversation(person)}
    >
      <View style={[styles.avatar, person.role === 'coach' || person.role === 'admin' ? styles.avatarCoach : styles.avatarStudent]}>
        <Text style={styles.avatarText}>{initials(person.full_name)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{person.full_name}</Text>
        <Text style={styles.role}>
          {person.role === 'super_admin' ? 'Admin' : person.role.charAt(0).toUpperCase() + person.role.slice(1)}
          {person.division ? ` · ${person.division.replace('_', '-')}` : ''}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  const filteredCoaches = filter(coaches);
  const filteredClassmates = filter(classmates);
  const filteredStudents = filter(allStudents);

  return (
    <View style={styles.container}>
      <BackHeader title="New Message" />

      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
          autoFocus
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: tabBarPadding + 20 }}>

        {/* ── Coaches (everyone sees this) ── */}
        {filteredCoaches.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>🎾 Coaches & Staff</Text>
            {filteredCoaches.map(renderPerson)}
          </View>
        )}

        {/* ── Classmates (students only) ── */}
        {isStudent && filteredClassmates.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>👥 Your Classmates</Text>
            <Text style={styles.sectionHint}>Students in your active programs</Text>
            {filteredClassmates.map(renderPerson)}
          </View>
        )}

        {/* ── All Students (coaches/admins only) ── */}
        {isCoachOrAdmin && filteredStudents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>👥 Students</Text>
            {filteredStudents.map(renderPerson)}
          </View>
        )}

        {filteredCoaches.length === 0 && filteredClassmates.length === 0 && filteredStudents.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>No people found.</Text>
          </View>
        )}

        {isStudent && classmates.length === 0 && coaches.length === 0 && search === '' && (
          <View style={styles.hint}>
            <Text style={styles.hintText}>
              You'll see your classmates here once you're enrolled in an active program.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1628' },
  searchBox: { padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  searchInput: { backgroundColor: 'rgba(17,30,51,0.85)', borderRadius: 10, padding: 12, fontSize: 15, color: '#F0F6FC', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#7A8FA6', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  sectionHint: { fontSize: 12, color: '#4B6070', marginBottom: 10 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(17,30,51,0.85)', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarCoach: { backgroundColor: '#16A34A' },
  avatarStudent: { backgroundColor: '#3B82F6' },
  avatarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#F0F6FC' },
  role: { fontSize: 13, color: '#7A8FA6', marginTop: 2 },
  chevron: { fontSize: 22, color: '#4B6070' },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { color: '#7A8FA6', fontSize: 14 },
  hint: { backgroundColor: 'rgba(17,30,51,0.6)', borderRadius: 12, padding: 16, marginTop: 8 },
  hintText: { fontSize: 13, color: '#7A8FA6', lineHeight: 20, textAlign: 'center' },
});
