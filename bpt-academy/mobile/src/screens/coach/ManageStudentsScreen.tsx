import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, TextInput, Image, Dimensions} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../types';
import ScreenHeader from '../../components/common/ScreenHeader';

const LEVEL_COLORS: Record<string, string> = {
  beginner: '#3B82F6',
  intermediate: '#F59E0B',
  advanced: '#EF4444',
  competition: '#8B5CF6',
};

export default function ManageStudentsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const tabBarPadding = useTabBarPadding();
  const [students, setStudents] = useState<Profile[]>([]);
  const [filtered, setFiltered] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchStudents = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');
    if (data) { setStudents(data); setFiltered(data); }
  };

  const onRefresh = async () => { setRefreshing(true); await fetchStudents(); setRefreshing(false); };
  useEffect(() => { fetchStudents(); }, []);

  useEffect(() => {
    if (search === '') { setFiltered(students); return; }
    setFiltered(students.filter((s) =>
      s.full_name.toLowerCase().includes(search.toLowerCase())
    ));
  }, [search, students]);

  const initials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: tabBarPadding }}
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScreenHeader title="Students" />

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search students..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.list}>
        {filtered.map((student) => (
          <TouchableOpacity
            key={student.id}
            style={styles.card}
            onPress={() => navigation.navigate('StudentDetail', { studentId: student.id })}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(student.full_name)}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{student.full_name}</Text>
              <View style={styles.tags}>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>{student.role.charAt(0).toUpperCase() + student.role.slice(1)}</Text>
                </View>
                {student.skill_level && (
                  <View style={[styles.levelBadge, { backgroundColor: (LEVEL_COLORS[student.skill_level] ?? '#6B7280') + '20' }]}>
                    <Text style={[styles.levelText, { color: LEVEL_COLORS[student.skill_level] ?? '#6B7280' }]}>
                      {student.skill_level.charAt(0).toUpperCase() + student.skill_level.slice(1)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No students found.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { padding: 24, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 26, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  searchContainer: { padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  searchInput: { backgroundColor: '#F3F4F6', borderRadius: 10, padding: 12, fontSize: 15, color: '#111827' },
  list: { padding: 16  paddingBottom: 80,},
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  tags: { flexDirection: 'row', gap: 6 },
  roleBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  roleText: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  levelText: { fontSize: 11, fontWeight: '600' },
  chevron: { fontSize: 22, color: '#D1D5DB' },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#9CA3AF', fontSize: 14 },
});
