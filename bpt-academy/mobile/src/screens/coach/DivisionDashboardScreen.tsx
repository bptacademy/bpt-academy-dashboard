import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Division, DIVISION_LABELS, DIVISION_COLORS } from '../../types';
import ScreenHeader from '../../components/common/ScreenHeader';

const ALL_DIVISIONS: Division[] = ['amateur', 'semi_pro', 'pro', 'junior_9_11', 'junior_12_15', 'junior_15_18'];

interface DivisionStat {
  division: Division;
  studentCount: number;
  enrollmentCount: number;
  revenue: number;
}

export default function DivisionDashboardScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<DivisionStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totals, setTotals] = useState({ students: 0, enrollments: 0, revenue: 0 });

  const fetchStats = async () => {
    // Fetch all data in one go rather than per-division queries
    const [studentsRes, enrollmentsRes, paymentsRes] = await Promise.all([
      // Students per division
      supabase.from('profiles')
        .select('id, division')
        .eq('role', 'student')
        .in('division', ALL_DIVISIONS),

      // Active enrollments joined to programs to get division
      supabase.from('enrollments')
        .select('id, program:program_id(division)')
        .eq('status', 'active'),

      // Confirmed payments joined to enrollments → programs to get division
      supabase.from('payments')
        .select('amount_gbp, enrollment:enrollment_id(program:program_id(division))')
        .eq('status', 'confirmed'),
    ]);

    const students = studentsRes.data ?? [];
    const enrollments = enrollmentsRes.data ?? [];
    const payments = paymentsRes.data ?? [];

    const results: DivisionStat[] = ALL_DIVISIONS.map((div) => {
      const studentCount = students.filter((s: any) => s.division === div).length;

      const enrollmentCount = enrollments.filter((e: any) => {
        return (e.program as any)?.division === div;
      }).length;

      const revenue = payments
        .filter((p: any) => (p.enrollment as any)?.program?.division === div)
        .reduce((sum: number, p: any) => sum + (p.amount_gbp ?? 0), 0);

      return { division: div, studentCount, enrollmentCount, revenue };
    });

    setStats(results);
    setTotals({
      students: results.reduce((s, r) => s + r.studentCount, 0),
      enrollments: results.reduce((s, r) => s + r.enrollmentCount, 0),
      revenue: results.reduce((s, r) => s + r.revenue, 0),
    });
  };

  const load = async () => { setLoading(true); await fetchStats(); setLoading(false); };
  const onRefresh = async () => { setRefreshing(true); await fetchStats(); setRefreshing(false); };
  useEffect(() => { load(); }, []);

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScreenHeader title="Divisions" />

      {/* Academy totals */}
      <View style={styles.totalsRow}>
        <View style={styles.totalCard}>
          <Text style={styles.totalNum}>{totals.students}</Text>
          <Text style={styles.totalLabel}>Students</Text>
        </View>
        <View style={styles.totalCard}>
          <Text style={styles.totalNum}>{totals.enrollments}</Text>
          <Text style={styles.totalLabel}>Enrollments</Text>
        </View>
        <View style={styles.totalCard}>
          <Text style={styles.totalNum}>£{totals.revenue.toFixed(0)}</Text>
          <Text style={styles.totalLabel}>Revenue</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#16A34A" style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.grid}>
          {stats.map((s) => {
            const color = DIVISION_COLORS[s.division];
            return (
              <TouchableOpacity
                key={s.division}
                style={[styles.card, { borderLeftColor: color, borderLeftWidth: 4 }]}
                onPress={() => navigation.navigate('Students', { divisionFilter: s.division })}
              >
                <View style={[styles.divBadge, { backgroundColor: color + '20' }]}>
                  <Text style={[styles.divLabel, { color }]}>{DIVISION_LABELS[s.division]}</Text>
                </View>
                <View style={styles.cardStats}>
                  <View style={styles.cardStat}>
                    <Text style={styles.cardStatNum}>{s.studentCount}</Text>
                    <Text style={styles.cardStatLabel}>Students</Text>
                  </View>
                  <View style={styles.cardStat}>
                    <Text style={styles.cardStatNum}>{s.enrollmentCount}</Text>
                    <Text style={styles.cardStatLabel}>Enrolled</Text>
                  </View>
                  <View style={styles.cardStat}>
                    <Text style={styles.cardStatNum}>£{s.revenue.toFixed(0)}</Text>
                    <Text style={styles.cardStatLabel}>Revenue</Text>
                  </View>
                </View>
                <Text style={styles.cardTap}>View students →</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  totalsRow: { flexDirection: 'row', padding: 16, gap: 10 },
  totalCard: { flex: 1, backgroundColor: '#111827', borderRadius: 14, padding: 16, alignItems: 'center' },
  totalNum: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  totalLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  grid: { padding: 16, gap: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  divBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, marginBottom: 12 },
  divLabel: { fontSize: 14, fontWeight: '700' },
  cardStats: { flexDirection: 'row', gap: 24, marginBottom: 10 },
  cardStat: {},
  cardStatNum: { fontSize: 22, fontWeight: '700', color: '#111827' },
  cardStatLabel: { fontSize: 12, color: '#6B7280' },
  cardTap: { fontSize: 12, color: '#16A34A', fontWeight: '500' },
});
