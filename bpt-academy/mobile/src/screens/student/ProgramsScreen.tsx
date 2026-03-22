import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Program, SkillLevel, Division, DIVISION_LABELS, DIVISION_COLORS } from '../../types';
import ScreenHeader from '../../components/common/ScreenHeader';

const DIVISIONS: Division[] = ['amateur', 'semi_pro', 'pro'];

export default function ProgramsScreen({ navigation }: any) {
  const { profile } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [activeEnrollmentExists, setActiveEnrollmentExists] = useState(false);
  const [filter, setFilter] = useState<Division | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    const [progRes, enrollRes, activeRes] = await Promise.all([
      supabase.from('programs').select('*').eq('is_active', true),
      supabase.from('enrollments').select('program_id').eq('student_id', profile!.id).eq('status', 'active'),
      supabase.from('enrollments').select('id').eq('student_id', profile!.id).eq('status', 'active'),
    ]);
    if (progRes.data) setPrograms(progRes.data);
    if (enrollRes.data) setEnrolledIds(enrollRes.data.map((e) => e.program_id));
    setActiveEnrollmentExists((activeRes.data?.length ?? 0) > 0);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => { if (profile) fetchData(); }, [profile]);

  const handleEnrollPress = (programId: string) => {
    // Always go to ProgramDetail — payment + enrollment logic lives there
    navigation.navigate('ProgramDetail', { programId });
  };

  const filtered = filter === 'all' ? programs : programs.filter((p) => (p as any).division === filter);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScreenHeader title="Programs" />

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={styles.filtersContent}>
        <TouchableOpacity
          style={[styles.chip, filter === 'all' && styles.chipActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.chipText, filter === 'all' && styles.chipTextActive]}>All</Text>
        </TouchableOpacity>
        {DIVISIONS.map((div) => (
          <TouchableOpacity
            key={div}
            style={[styles.chip, filter === div && { backgroundColor: DIVISION_COLORS[div], borderColor: DIVISION_COLORS[div] }]}
            onPress={() => setFilter(div)}
          >
            <Text style={[styles.chipText, filter === div && styles.chipTextActive]}>
              {DIVISION_LABELS[div]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Program list */}
      <View style={styles.list}>
        {filtered.map((program) => {
          const enrolled = enrolledIds.includes(program.id);
          return (
            <TouchableOpacity
              key={program.id}
              style={styles.card}
              onPress={() => navigation.navigate('ProgramDetail', { programId: program.id })}
            >
              <View style={styles.cardHeader}>
                {(() => {
                  const div = ((program as any).division ?? 'amateur') as Division;
                  const color = DIVISION_COLORS[div] ?? '#6B7280';
                  const label = DIVISION_LABELS[div] ?? div;
                  const sub = program.skill_level
                    ? ` · ${program.skill_level.charAt(0).toUpperCase() + program.skill_level.slice(1)}`
                    : '';
                  return (
                    <View style={[styles.levelBadge, { backgroundColor: color + '20' }]}>
                      <Text style={[styles.levelText, { color }]}>{label}{sub}</Text>
                    </View>
                  );
                })()}
                {enrolled && (
                  <View style={styles.enrolledBadge}>
                    <Text style={styles.enrolledText}>✓ Enrolled</Text>
                  </View>
                )}
              </View>

              <Text style={styles.cardTitle}>{program.title}</Text>
              {program.description && (
                <Text style={styles.cardDesc} numberOfLines={2}>{program.description}</Text>
              )}

              <View style={styles.cardFooter}>
                <Text style={styles.cardMeta}>⏱ {program.duration_weeks ?? '—'} weeks</Text>
                <Text style={styles.cardMeta}>👤 BPT Academy</Text>
              </View>

              {!enrolled && (
                <TouchableOpacity
                  style={[styles.enrollButton, activeEnrollmentExists && styles.enrollButtonLocked]}
                  onPress={() => handleEnrollPress(program.id)}
                >
                  <Text style={styles.enrollButtonText}>
                    {activeEnrollmentExists ? '🔒 View Program' : 'Pay & Enroll'}
                  </Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        })}

        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No programs found.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { padding: 24, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 26, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  filters: { backgroundColor: '#FFFFFF' },
  filtersContent: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  chip: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F9FAFB' },
  chipActive: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  chipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '600' },
  list: { padding: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  levelText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  enrolledBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  enrolledText: { fontSize: 12, fontWeight: '600', color: '#16A34A' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 },
  cardDesc: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  cardMeta: { fontSize: 13, color: '#6B7280' },
  enrollButton: { backgroundColor: '#16A34A', borderRadius: 8, padding: 12, alignItems: 'center' },
  enrollButtonLocked: { backgroundColor: '#9CA3AF' },
  enrollButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#9CA3AF', fontSize: 15 },
});
