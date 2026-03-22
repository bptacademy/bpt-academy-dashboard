import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Profile } from '../../types';
import BackHeader from '../../components/common/BackHeader';

export default function NewConversationScreen({ navigation }: any) {
  const { profile } = useAuth();
  const [people, setPeople] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Coaches/admins see all students; students see coaches/admins
    const isAdmin = profile?.role === 'admin' || profile?.role === 'coach';
    const fetchRoles = isAdmin ? ['student'] : ['coach', 'admin'];

    supabase
      .from('profiles')
      .select('*')
      .in('role', fetchRoles)
      .neq('id', profile!.id)
      .order('full_name')
      .then(({ data }) => { if (data) setPeople(data); });
  }, [profile]);

  const startConversation = async (recipient: Profile) => {
    // Check if direct conversation already exists between these two
    const { data: existingMembers } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('profile_id', profile!.id);

    const myConvIds = existingMembers?.map((m) => m.conversation_id) ?? [];

    let existingConvId: string | null = null;
    if (myConvIds.length > 0) {
      const { data: sharedMembers } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('profile_id', recipient.id)
        .in('conversation_id', myConvIds);

      if (sharedMembers && sharedMembers.length > 0) {
        existingConvId = sharedMembers[0].conversation_id;
      }
    }

    if (existingConvId) {
      navigation.replace('Chat', {
        conversationId: existingConvId,
        title: recipient.full_name,
      });
      return;
    }

    // Create new conversation
    const { data: conv, error } = await supabase
      .from('conversations')
      .insert({ is_group: false, created_by: profile!.id })
      .select()
      .single();

    if (error || !conv) { Alert.alert('Error', error?.message); return; }

    await supabase.from('conversation_members').insert([
      { conversation_id: conv.id, profile_id: profile!.id },
      { conversation_id: conv.id, profile_id: recipient.id },
    ]);

    navigation.replace('Chat', {
      conversationId: conv.id,
      title: recipient.full_name,
    });
  };

  const initials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const filtered = people.filter((p) =>
    search === '' || p.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const isAdmin = profile?.role === 'admin' || profile?.role === 'coach';

  return (
    <ScrollView style={styles.container}>
      <BackHeader title="New Message" />
      <View style={styles.header}>
        <Text style={styles.title}>New Message</Text>
        <Text style={styles.subtitle}>
          {isAdmin ? 'Select a student to message' : 'Select a coach to message'}
        </Text>
      </View>

      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.list}>
        {filtered.map((person) => (
          <TouchableOpacity
            key={person.id}
            style={styles.card}
            onPress={() => startConversation(person)}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(person.full_name)}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{person.full_name}</Text>
              <Text style={styles.role}>
                {person.role.charAt(0).toUpperCase() + person.role.slice(1)}
                {person.skill_level ? ` · ${person.skill_level.charAt(0).toUpperCase() + person.skill_level.slice(1)}` : ''}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>No people found.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { padding: 24, paddingTop: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  searchBox: { padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  searchInput: { backgroundColor: '#F3F4F6', borderRadius: 10, padding: 12, fontSize: 15, color: '#111827' },
  list: { padding: 16 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB', gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#111827' },
  role: { fontSize: 13, color: '#6B7280', marginTop: 2, textTransform: 'capitalize' },
  chevron: { fontSize: 22, color: '#D1D5DB' },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { color: '#9CA3AF', fontSize: 14 },
});
