import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, Alert, Image, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Program, SkillLevel, Division, DIVISION_LABELS, DIVISION_COLORS } from '../../types';
import ScreenHeader from '../../components/common/ScreenHeader';

const DIVISIONS: Division[] = ['amateur', 'semi_pro', 'pro'];

export default function ProgramsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const tabBarPadding = useTabBarPadding();
  const { profile } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [activeEnrollmentExists, setActiveEnrollmentExists] = useState(false);
  const [filter, setFilter] = useState<Division | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const isCoachOrAdmin = ['coach', 'admin', 'super_admin'].includes(profile?.role ?? '');

  // Returns true if the student is eligible for a given program.
  // Coaches/admins bypass this check entirely.
  const isEligible = (program: Program): boolean => {
    if (isCoachOrAdmin) return true;
    const progDiv = (program as any).division ?? 'amateur';
    const studentDiv = (profile as any)?.division ?? 'amateur';
    if (progDiv !== studentDiv) return false;
    if (progDiv === 'amateur') {
      const progSkill = (program as any).skill_level;
      const studentSkill = (profile as any)?.skill_level;
      if (progSkill && studentSkill && progSkill !== studentSkill) return false;
    }
    return true;
  };

  const fetchData = async () => {
    const [progRes, enrollRes, activeRes, pendingRes, completedRes] = await Promise.all([
      supabase.from('programs').select('*').eq('is_active', true),
      supabase.from('enrollments').select('program_id').eq('student_id', profile!.id).eq('status', 'active'),
      supabase.from('enrollments').select('id, program_id, programs!inner(is_active, end_date)')
        .eq('student_id', profile!.id)
        .in('status', ['pending_payment', 'pending_next_cycle', 'active'])
        .eq('programs.is_active', true),
      supabase.from('enrollments').select('program_id').eq('student_id', profile!.id).in('status', ['pending_payment', 'pending_next_cycle']),
      supabase.from('enrollments').select('program_id').eq('student_id', profile!.id).eq('status', 'completed'),
    ]);

    if (progRes.data) setPrograms(progRes.data);
    if (enrollRes.data) setEnrolledIds(enrollRes.data.map((e) => e.program_id));
    if (pendingRes.data) setPendingIds(pendingRes.data.map((e) => e.program_id));
    if (completedRes.data) setCompletedIds(completedRes.data.map((e) => e.program_id));
    setActiveEnrollmentExists((activeRes.data?.length ?? 0) > 0);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => { if (profile) fetchData(); }, [profile]);

  const handleEnrollPress = (programId: string) => {
    navigation.navigate('ProgramDetail', { programId });
  };

  // For students: hide programs they're ineligible for (unless already enrolled/pending/completed in one)
  const eligiblePrograms = programs.filter((p) =>
    isEligible(p) ||
    enrolledIds.includes(p.id) ||
    pendingIds.includes(p.id) ||
    completedIds.includes(p.id)
  );

  const filtered = filter === 'all'
    ? eligiblePrograms
    : eligiblePrograms.filter((p) => (p as any).division === filter);

  return (
    <View style={styles.container}>
      <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: tabBarPadding }}
        style={{ flex: 1 }}
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
            const isPending = pendingIds.includes(program.id);
            const isCompleted = completedIds.includes(program.id);

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
                  {isPending && !enrolled && (
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingBadgeText}>⏳ Pending</Text>
                    </View>
                  )}
                  {isCompleted && !enrolled && !isPending && (
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedBadgeText}>✓ Completed</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.cardTitle}>{program.title}</Text>
                {program.description && (
                  <Text style={styles.cardDesc} numberOfLines={2}>{program.description}</Text>
                )}

                <View style={styles.cardFooter}>
                  <Text style={styles.cardMeta}>⏱ {program.duration_weeks ?? '—'} weeks</Text>
                  {(program as any).price_gbp != null
                    ? <Text style={styles.cardPrice}>£{parseFloat((program as any).price_gbp).toFixed(2)}</Text>
                    : <Text style={styles.cardPriceFree}>Free</Text>
                  }
                </View>

                {/* CTA area */}
                {enrolled ? null : isPending ? null : isCompleted ? (
                  <TouchableOpacity
                    style={styles.reenrollButton}
                    onPress={() => handleEnrollPress(program.id)}
                  >
                    <Text style={styles.reenrollButtonText}>🔄 Re-Enroll</Text>
                  </TouchableOpacity>
                ) : activeEnrollmentExists ? (
                  <View style={[styles.enrollButton, styles.enrollButtonLocked]}>
                    <Text style={styles.enrollButtonLockedText}>🔒 Already enrolled in a program</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.enrollButton}
                    onPress={() => handleEnrollPress(program.id)}
                  >
                    <Text style={styles.enrollButtonText}>Join Waiting List</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}

          {filtered.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No programs available for your level.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1628' },
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  filters: { backgroundColor: 'transparent' },
  filtersContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.08)' },
  chipActive: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  chipText: { fontSize: 13, color: '#A0B0C8', fontWeight: '500' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '600' },
  list: { padding: 16 },
  card: { backgroundColor: 'rgba(17,30,51,0.85)', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  levelText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  enrolledBadge: { backgroundColor: 'rgba(22,163,74,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  enrolledText: { fontSize: 12, fontWeight: '600', color: '#4ADE80' },
  pendingBadge: { backgroundColor: 'rgba(217,119,6,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pendingBadgeText: { fontSize: 12, fontWeight: '600', color: '#FBBF24' },
  completedBadge: { backgroundColor: 'rgba(99,102,241,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  completedBadgeText: { fontSize: 12, fontWeight: '600', color: '#A5B4FC' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#F0F6FC', marginBottom: 6 },
  cardDesc: { fontSize: 14, color: '#7A8FA6', lineHeight: 20, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  cardMeta: { fontSize: 13, color: '#7A8FA6' },
  cardPrice: { fontSize: 15, fontWeight: '700', color: '#4ADE80' },
  cardPriceFree: { fontSize: 13, color: '#7A8FA6' },
  enrollButton: { backgroundColor: '#16A34A', borderRadius: 8, padding: 12, alignItems: 'center' },
  enrollButtonLocked: { backgroundColor: 'rgba(255,255,255,0.12)' },
  enrollButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  enrollButtonLockedText: { color: '#A0B0C8', fontWeight: '600', fontSize: 13 },
  reenrollButton: { backgroundColor: 'rgba(99,102,241,0.20)', borderRadius: 8, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(99,102,241,0.40)' },
  reenrollButtonText: { color: '#A5B4FC', fontWeight: '700', fontSize: 14 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#7A8FA6', fontSize: 15 },
});
