import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, Image, Dimensions} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Profile } from '../../types';
import BackHeader from '../../components/common/BackHeader';
import BackButton from '../../components/common/BackButton';

export default function NewConversationScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const tabBarPadding = useTabBarPadding();
  const { profile } = useAuth();
  const [people, setPeople] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!profile) return;

    // Use actual DB role (not effectiveRole) so admins always see students
    const isAdmin = profile.role === 'admin' || profile.role === 'coach';
    const fetchRoles = isAdmin ? ['student'] : ['coach', 'admin'];

    supabase
      .from('profiles')
      .select('id, full_name, role, skill_level, division, avatar_url')
      .in('role', fetchRoles)
      .neq('id', profile.id)
      .order('full_name')
      .then(({ data, error }) => {
        if (error) console.warn('NewConversation fetch error:', error.message);
        if (data) setPeople(data as Profile[]);
      });
  }, [profile?.id, profile?.role]);

  const startConversation = async (recipient: Profile) => {
    // Use atomic RPC — creates conversation + adds both members in one call,
    // also returns existing conversation id if one already exists.
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
                {(person as any).division ? ` · ${(person as any).division.replace('_', '-')}` : ''}
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
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { padding: 24, paddingTop: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  searchBox: { padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  searchInput: { backgroundColor: '#F3F4F6', borderRadius: 10, padding: 12, fontSize: 15, color: '#111827' },
  list: { padding: 16  paddingBottom: 80,},
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
