import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import BackHeader from '../../components/common/BackHeader';

type ReportMode = 'weekly' | 'monthly';

interface MetricCard {
  label: string;
  value: string;
  icon: string;
  sub?: string;
}

interface DivisionRevenue {
  division: string;
  revenue: number;
  count: number;
}

interface DivisionActivity {
  division: string;
  studentCount: number;
}

interface TopStudent {
  id: string;
  full_name: string;
  ranking_points: number;
  division: string;
}

function getDateRange(mode: ReportMode): { start: string; end: string } {
  const now = new Date();
  if (mode === 'weekly') {
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    return {
      start: start.toISOString(),
      end: now.toISOString(),
    };
  } else {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }
}

function formatCurrency(amount: number): string {
  return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDivisionLabel(division: string): string {
  const labels: Record<string, string> = {
    amateur: 'Amateur',
    semi_pro: 'Semi-Pro',
    pro: 'Pro',
    junior_9_11: 'Junior 9–11',
    junior_12_15: 'Junior 12–15',
    junior_15_18: 'Junior 15–18',
  };
  return labels[division] ?? division;
}

export default function ReportsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();

  const [mode, setMode] = useState<ReportMode>('weekly');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [totalStudents, setTotalStudents] = useState(0);
  const [newEnrollments, setNewEnrollments] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null);

  const [divisionRevenue, setDivisionRevenue] = useState<DivisionRevenue[]>([]);
  const [divisionActivity, setDivisionActivity] = useState<DivisionActivity[]>([]);
  const [topStudents, setTopStudents] = useState<TopStudent[]>([]);

  const fetchReports = useCallback(async (selectedMode: ReportMode) => {
    const { start, end } = getDateRange(selectedMode);

    // 1. Total students
    const { count: studentCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student');

    setTotalStudents(studentCount ?? 0);

    // 2. New enrollments in period
    const { count: enrollCount } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .gte('enrolled_at', start)
      .lte('enrolled_at', end);

    setNewEnrollments(enrollCount ?? 0);

    // 3. Revenue in period
    const { data: payments } = await supabase
      .from('payments')
      .select('amount_gbp')
      .eq('status', 'confirmed')
      .gte('created_at', start)
      .lte('created_at', end);

    const totalRevenue = (payments ?? []).reduce(
      (sum: number, p: any) => sum + (p.amount_gbp ?? 0),
      0
    );
    setRevenue(totalRevenue);

    // 4. Attendance rate in period
    const { count: totalAttendance } = await supabase
      .from('session_attendance')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', start)
      .lte('created_at', end);

    const { count: presentCount } = await supabase
      .from('session_attendance')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'present')
      .gte('created_at', start)
      .lte('created_at', end);

    if (totalAttendance && totalAttendance > 0) {
      setAttendanceRate(Math.round(((presentCount ?? 0) / totalAttendance) * 100));
    } else {
      setAttendanceRate(null);
    }

    // 5. Revenue breakdown by division
    // Fetch confirmed payments in period with enrollment → program → division
    const { data: paymentData } = await supabase
      .from('payments')
      .select('amount_gbp, enrollment:enrollments(program:programs(division))')
      .eq('status', 'confirmed')
      .gte('created_at', start)
      .lte('created_at', end);

    const revByDiv: Record<string, { revenue: number; count: number }> = {};
    (paymentData ?? []).forEach((p: any) => {
      const div: string = p.enrollment?.program?.division ?? 'unknown';
      if (!revByDiv[div]) revByDiv[div] = { revenue: 0, count: 0 };
      revByDiv[div].revenue += p.amount_gbp ?? 0;
      revByDiv[div].count += 1;
    });

    setDivisionRevenue(
      Object.entries(revByDiv)
        .map(([division, { revenue, count }]) => ({ division, revenue, count }))
        .sort((a, b) => b.revenue - a.revenue)
    );

    // 6. Student activity per division
    const { data: studentsByDiv } = await supabase
      .from('profiles')
      .select('division')
      .eq('role', 'student');

    const actByDiv: Record<string, number> = {};
    (studentsByDiv ?? []).forEach((s: any) => {
      const div = s.division ?? 'unknown';
      actByDiv[div] = (actByDiv[div] ?? 0) + 1;
    });

    setDivisionActivity(
      Object.entries(actByDiv)
        .map(([division, studentCount]) => ({ division, studentCount }))
        .sort((a, b) => b.studentCount - a.studentCount)
    );

    // 7. Top performing students
    const { data: topData } = await supabase
      .from('profiles')
      .select('id, full_name, ranking_points, division')
      .eq('role', 'student')
      .order('ranking_points', { ascending: false })
      .limit(5);

    setTopStudents((topData ?? []) as TopStudent[]);
  }, []);

  const load = async (selectedMode: ReportMode) => {
    setLoading(true);
    await fetchReports(selectedMode);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReports(mode);
    setRefreshing(false);
  };

  useEffect(() => { load(mode); }, [mode]);

  const metrics: MetricCard[] = [
    {
      icon: '🎓',
      label: 'Total Students',
      value: totalStudents.toString(),
      sub: 'All active students',
    },
    {
      icon: '📋',
      label: 'New Enrollments',
      value: newEnrollments.toString(),
      sub: mode === 'weekly' ? 'Last 7 days' : 'This month',
    },
    {
      icon: '💷',
      label: 'Revenue',
      value: formatCurrency(revenue),
      sub: 'Confirmed payments',
    },
    {
      icon: '✅',
      label: 'Attendance Rate',
      value: attendanceRate !== null ? `${attendanceRate}%` : '—',
      sub: 'Sessions attended',
    },
  ];

  const modeLabel = mode === 'weekly' ? 'Weekly' : 'Monthly';
  const now = new Date();
  const periodLabel =
    mode === 'weekly'
      ? `${new Date(now.getTime() - 7 * 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
      : now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <View style={styles.container}>
      <BackHeader title="Academy Reports" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16A34A" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero / period label */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>📊 {modeLabel} Report</Text>
          <Text style={styles.heroPeriod}>{periodLabel}</Text>

          {/* Toggle */}
          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'weekly' && styles.toggleBtnActive]}
              onPress={() => setMode('weekly')}
            >
              <Text style={[styles.toggleText, mode === 'weekly' && styles.toggleTextActive]}>
                Weekly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'monthly' && styles.toggleBtnActive]}
              onPress={() => setMode('monthly')}
            >
              <Text style={[styles.toggleText, mode === 'monthly' && styles.toggleTextActive]}>
                Monthly
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#16A34A" style={{ marginTop: 60 }} />
        ) : (
          <>
            {/* Key Metrics */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Key Metrics</Text>
              <View style={styles.metricsGrid}>
                {metrics.map((m) => (
                  <View key={m.label} style={styles.metricCard}>
                    <Text style={styles.metricIcon}>{m.icon}</Text>
                    <Text style={styles.metricValue}>{m.value}</Text>
                    <Text style={styles.metricLabel}>{m.label}</Text>
                    {m.sub && <Text style={styles.metricSub}>{m.sub}</Text>}
                  </View>
                ))}
              </View>
            </View>

            {/* Revenue by Division */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💷 Revenue by Division</Text>
              {divisionRevenue.length === 0 ? (
                <Text style={styles.emptyText}>No revenue data for this period.</Text>
              ) : (
                divisionRevenue.map((d) => (
                  <View key={d.division} style={styles.rowCard}>
                    <View style={styles.rowCardLeft}>
                      <Text style={styles.rowCardTitle}>{formatDivisionLabel(d.division)}</Text>
                      <Text style={styles.rowCardSub}>{d.count} payment{d.count !== 1 ? 's' : ''}</Text>
                    </View>
                    <Text style={styles.rowCardValue}>{formatCurrency(d.revenue)}</Text>
                  </View>
                ))
              )}
            </View>

            {/* Student Activity by Division */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>👥 Students by Division</Text>
              {divisionActivity.length === 0 ? (
                <Text style={styles.emptyText}>No student data found.</Text>
              ) : (
                divisionActivity.map((d) => (
                  <View key={d.division} style={styles.rowCard}>
                    <View style={styles.rowCardLeft}>
                      <Text style={styles.rowCardTitle}>{formatDivisionLabel(d.division)}</Text>
                    </View>
                    <View style={styles.activityRight}>
                      <Text style={styles.rowCardValue}>{d.studentCount}</Text>
                      <Text style={styles.rowCardSub}> students</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Top Performing Students */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🏆 Top Performing Students</Text>
              {topStudents.length === 0 ? (
                <Text style={styles.emptyText}>No student rankings available.</Text>
              ) : (
                topStudents.map((s, idx) => (
                  <View key={s.id} style={styles.topStudentCard}>
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankText}>#{idx + 1}</Text>
                    </View>
                    <View style={styles.topStudentInfo}>
                      <Text style={styles.topStudentName}>{s.full_name}</Text>
                      <Text style={styles.topStudentDiv}>{formatDivisionLabel(s.division)}</Text>
                    </View>
                    <View style={styles.pointsBadge}>
                      <Text style={styles.pointsText}>{s.ranking_points ?? 0} pts</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Export Note */}
            <View style={styles.exportBox}>
              <Text style={styles.exportTitle}>📋 Export Summary</Text>
              <Text style={styles.exportBody}>
                {modeLabel} Report — {periodLabel}
                {'\n'}Total Students: {totalStudents}
                {'\n'}New Enrollments: {newEnrollments}
                {'\n'}Revenue: {formatCurrency(revenue)}
                {'\n'}Attendance Rate: {attendanceRate !== null ? `${attendanceRate}%` : 'N/A'}
                {'\n\n'}To export, use your device's screenshot or share function.
                A full PDF export feature is coming soon.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  hero: {
    backgroundColor: '#111827',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
    alignItems: 'center',
  },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  heroPeriod: { fontSize: 14, color: '#9CA3AF', marginBottom: 16 },
  toggle: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 4,
  },
  toggleBtn: {
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 10,
  },
  toggleBtnActive: { backgroundColor: '#16A34A' },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  toggleTextActive: { color: '#FFFFFF' },

  section: { padding: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 14 },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    flex: 1,
    minWidth: '44%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  metricIcon: { fontSize: 28, marginBottom: 6 },
  metricValue: { fontSize: 22, fontWeight: '800', color: '#111827' },
  metricLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 2, textAlign: 'center' },
  metricSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2, textAlign: 'center' },

  rowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rowCardLeft: { flex: 1 },
  rowCardTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  rowCardSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  rowCardValue: { fontSize: 16, fontWeight: '700', color: '#16A34A' },
  activityRight: { flexDirection: 'row', alignItems: 'baseline' },

  topStudentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: { fontSize: 14, fontWeight: '700', color: '#374151' },
  topStudentInfo: { flex: 1 },
  topStudentName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  topStudentDiv: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  pointsBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pointsText: { fontSize: 13, fontWeight: '700', color: '#16A34A' },

  emptyText: { fontSize: 14, color: '#9CA3AF', fontStyle: 'italic' },

  exportBox: {
    margin: 20,
    marginTop: 0,
    backgroundColor: '#1F2937',
    borderRadius: 14,
    padding: 20,
  },
  exportTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 10 },
  exportBody: { fontSize: 13, color: '#D1D5DB', lineHeight: 22 },
});
