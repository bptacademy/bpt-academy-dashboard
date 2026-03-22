import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Enrollment, Module, StudentProgress } from '../../types';
import ScreenHeader from '../../components/common/ScreenHeader';

interface ProgramWithProgress extends Enrollment {
  modules: (Module & { progress?: StudentProgress })[];
  completedCount: number;
  totalCount: number;
}

export default function ProgressScreen() {
  const { profile } = useAuth();
  const [programs, setPrograms] = useState<ProgramWithProgress[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!profile) return;

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('*, program:programs(*)')
      .eq('student_id', profile.id)
      .eq('status', 'active');

    if (!enrollments) return;

    const withProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        const { data: modules } = await supabase
          .from('modules')
          .select('*')
          .eq('program_id', enrollment.program_id)
          .order('order_index');

        const { data: progressData } = await supabase
          .from('student_progress')
          .select('*')
          .eq('student_id', profile.id)
          .in('module_id', modules?.map((m) => m.id) ?? []);

        const progressMap = new Map(progressData?.map((p) => [p.module_id, p]) ?? []);
        const modulesWithProgress = (modules ?? []).map((m) => ({
          ...m,
          progress: progressMap.get(m.id),
        }));

        return {
          ...enrollment,
          modules: modulesWithProgress,
          completedCount: modulesWithProgress.filter((m) => m.progress?.completed).length,
          totalCount: modulesWithProgress.length,
        };
      })
    );

    setPrograms(withProgress);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => { fetchData(); }, [profile]);

  const overallCompleted = programs.reduce((a, p) => a + p.completedCount, 0);
  const overallTotal = programs.reduce((a, p) => a + p.totalCount, 0);
  const overallPct = overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScreenHeader title="Progress" />

      {/* Overall card */}
      <View style={styles.overallCard}>
        <Text style={styles.overallLabel}>Overall Completion</Text>
        <Text style={styles.overallPct}>{overallPct}%</Text>
        <View style={styles.bigBar}>
          <View style={[styles.bigBarFill, { width: `${overallPct}%` }]} />
        </View>
        <Text style={styles.overallSub}>{overallCompleted} of {overallTotal} modules complete</Text>
      </View>

      {/* Per-program breakdown */}
      <View style={styles.section}>
        {programs.map((p) => {
          const pct = p.totalCount > 0 ? Math.round((p.completedCount / p.totalCount) * 100) : 0;
          return (
            <View key={p.id} style={styles.programCard}>
              <View style={styles.programHeader}>
                <Text style={styles.programTitle}>{(p.program as any)?.title}</Text>
                <Text style={styles.programPct}>{pct}%</Text>
              </View>

              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${pct}%` }]} />
              </View>

              <Text style={styles.moduleCount}>{p.completedCount}/{p.totalCount} modules</Text>

              {/* Module list */}
              <View style={styles.modules}>
                {p.modules.map((m) => (
                  <View key={m.id} style={styles.moduleRow}>
                    <View style={[styles.moduleCheck, m.progress?.completed && styles.moduleCheckDone]}>
                      {m.progress?.completed && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                    <View style={styles.moduleInfo}>
                      <Text style={[styles.moduleName, m.progress?.completed && styles.moduleNameDone]}>
                        {m.title}
                      </Text>
                      {m.progress?.score != null && (
                        <Text style={styles.moduleScore}>Score: {m.progress.score}%</Text>
                      )}
                    </View>
                  </View>
                ))}
                {p.modules.length === 0 && (
                  <Text style={styles.noModules}>No modules yet</Text>
                )}
              </View>
            </View>
          );
        })}

        {programs.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Enroll in a program to track your progress.</Text>
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
  overallCard: {
    margin: 16, backgroundColor: '#16A34A', borderRadius: 16, padding: 24, alignItems: 'center',
  },
  overallLabel: { color: '#DCFCE7', fontSize: 14, fontWeight: '600' },
  overallPct: { color: '#FFFFFF', fontSize: 48, fontWeight: '700', marginVertical: 8 },
  bigBar: { width: '100%', height: 8, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4 },
  bigBarFill: { height: '100%', backgroundColor: '#FFFFFF', borderRadius: 4 },
  overallSub: { color: '#DCFCE7', fontSize: 13, marginTop: 8 },
  section: { padding: 16 },
  programCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  programHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  programTitle: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1 },
  programPct: { fontSize: 16, fontWeight: '700', color: '#16A34A' },
  progressBar: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: '#16A34A', borderRadius: 3 },
  moduleCount: { fontSize: 12, color: '#6B7280', marginBottom: 14 },
  modules: { gap: 10 },
  moduleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  moduleCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  moduleCheckDone: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  checkMark: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  moduleInfo: { flex: 1 },
  moduleName: { fontSize: 14, color: '#374151' },
  moduleNameDone: { color: '#9CA3AF', textDecorationLine: 'line-through' },
  moduleScore: { fontSize: 12, color: '#16A34A', fontWeight: '600' },
  noModules: { color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#9CA3AF', fontSize: 15, textAlign: 'center' },
});
