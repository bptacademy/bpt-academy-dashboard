import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,, Image, Dimensions} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
// NOTE: xlsx is required lazily inside handleExport() to avoid a React Native
// startup crash caused by xlsx's Node.js built-in dependencies (stream, crypto, zlib).
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import BackHeader from '../../components/common/BackHeader';

type ReportMode = 'weekly' | 'monthly';

interface DivisionRevenue { division: string; revenue: number; count: number; }
interface DivisionActivity { division: string; studentCount: number; }
interface TopStudent { id: string; full_name: string; ranking_points: number; division: string; }

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function getDateRange(mode: ReportMode): { start: string; end: string } {
  const now = new Date();
  if (mode === 'weekly') {
    const start = new Date(now); start.setDate(now.getDate() - 7);
    return { start: start.toISOString(), end: now.toISOString() };
  } else {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { start: start.toISOString(), end: end.toISOString() };
  }
}

function formatCurrency(amount: number): string {
  return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDivisionLabel(division: string): string {
  const labels: Record<string, string> = {
    amateur: 'Amateur', semi_pro: 'Semi-Pro', pro: 'Pro',
    junior_9_11: 'Junior 9–11', junior_12_15: 'Junior 12–15', junior_15_18: 'Junior 15–18',
  };
  return labels[division] ?? division;
}

// Convert a Uint8Array to base64 string (works in React Native without btoa limits)
function uint8ToBase64(bytes: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;
    result += chars[b0 >> 2];
    result += chars[((b0 & 3) << 4) | (b1 >> 4)];
    result += i + 1 < len ? chars[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    result += i + 2 < len ? chars[b2 & 63] : '=';
  }
  return result;
}

export default function ReportsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();

  const [mode, setMode] = useState<ReportMode>('weekly');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [totalStudents, setTotalStudents] = useState(0);
  const [newEnrollments, setNewEnrollments] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
  const [attendedCount, setAttendedCount] = useState(0);
  const [totalSessionCount, setTotalSessionCount] = useState(0);
  const [divisionRevenue, setDivisionRevenue] = useState<DivisionRevenue[]>([]);
  const [divisionActivity, setDivisionActivity] = useState<DivisionActivity[]>([]);
  const [topStudents, setTopStudents] = useState<TopStudent[]>([]);

  const fetchReports = useCallback(async (selectedMode: ReportMode) => {
    const { start, end } = getDateRange(selectedMode);

    // ── Total students ────────────────────────────────────────────────────────
    const { count: studentCount } = await supabase
      .from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
    setTotalStudents(studentCount ?? 0);

    // ── New enrollments in period ─────────────────────────────────────────────
    const { count: enrollCount } = await supabase
      .from('enrollments').select('*', { count: 'exact', head: true })
      .gte('enrolled_at', start).lte('enrolled_at', end);
    setNewEnrollments(enrollCount ?? 0);

    // ── Revenue in period ─────────────────────────────────────────────────────
    const { data: payments } = await supabase
      .from('payments').select('amount_gbp').eq('status', 'confirmed')
      .gte('created_at', start).lte('created_at', end);
    const totalRevenue = (payments ?? []).reduce((s: number, p: any) => s + (p.amount_gbp ?? 0), 0);
    setRevenue(totalRevenue);

    // ── Attendance rate — from session_attendance using attended boolean ───────
    // Find sessions scheduled in the period, then count attendance records
    const { data: sessionsInPeriod } = await supabase
      .from('program_sessions')
      .select('id')
      .gte('scheduled_at', start)
      .lte('scheduled_at', end);

    const sessionIds = (sessionsInPeriod ?? []).map((s: any) => s.id);

    if (sessionIds.length > 0) {
      const { count: totalAtt } = await supabase
        .from('session_attendance')
        .select('*', { count: 'exact', head: true })
        .in('session_id', sessionIds);

      const { count: presentAtt } = await supabase
        .from('session_attendance')
        .select('*', { count: 'exact', head: true })
        .in('session_id', sessionIds)
        .eq('attended', true);

      const total = totalAtt ?? 0;
      const attended = presentAtt ?? 0;
      setTotalSessionCount(total);
      setAttendedCount(attended);
      setAttendanceRate(total > 0 ? Math.round((attended / total) * 100) : null);
    } else {
      // No sessions in period — use all-time attendance rate
      const { count: totalAtt } = await supabase
        .from('session_attendance')
        .select('*', { count: 'exact', head: true });

      const { count: presentAtt } = await supabase
        .from('session_attendance')
        .select('*', { count: 'exact', head: true })
        .eq('attended', true);

      const total = totalAtt ?? 0;
      const attended = presentAtt ?? 0;
      setTotalSessionCount(total);
      setAttendedCount(attended);
      setAttendanceRate(total > 0 ? Math.round((attended / total) * 100) : null);
    }

    // ── Revenue by division ───────────────────────────────────────────────────
    const { data: paymentData } = await supabase
      .from('payments')
      .select('amount_gbp, program:programs(division), student:profiles(division)')
      .eq('status', 'confirmed').gte('created_at', start).lte('created_at', end);
    const revByDiv: Record<string, { revenue: number; count: number }> = {};
    (paymentData ?? []).forEach((p: any) => {
      const div = p.program?.division ?? p.student?.division ?? 'other';
      if (!revByDiv[div]) revByDiv[div] = { revenue: 0, count: 0 };
      revByDiv[div].revenue += p.amount_gbp ?? 0;
      revByDiv[div].count += 1;
    });
    setDivisionRevenue(
      Object.entries(revByDiv).map(([division, { revenue, count }]) => ({ division, revenue, count }))
        .sort((a, b) => b.revenue - a.revenue)
    );

    // ── Students by division ──────────────────────────────────────────────────
    const { data: studentsByDiv } = await supabase
      .from('profiles').select('division').eq('role', 'student');
    const actByDiv: Record<string, number> = {};
    (studentsByDiv ?? []).forEach((s: any) => { const d = s.division ?? 'other'; actByDiv[d] = (actByDiv[d] ?? 0) + 1; });
    setDivisionActivity(
      Object.entries(actByDiv).map(([division, studentCount]) => ({ division, studentCount }))
        .sort((a, b) => b.studentCount - a.studentCount)
    );

    // ── Top students by ranking points ────────────────────────────────────────
    const { data: topData } = await supabase
      .from('profiles').select('id, full_name, ranking_points, division')
      .eq('role', 'student').order('ranking_points', { ascending: false }).limit(5);
    setTopStudents((topData ?? []) as TopStudent[]);
  }, []);

  const load = async (selectedMode: ReportMode) => {
    setLoading(true);
    await fetchReports(selectedMode);
    setLoading(false);
  };

  const onRefresh = async () => { setRefreshing(true); await fetchReports(mode); setRefreshing(false); };
  useEffect(() => { load(mode); }, [mode]);

  // ── Excel Export ──────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const xlsxModule = require('xlsx');
      const XLSX = xlsxModule.default ?? xlsxModule;

      const modeLabel = mode === 'weekly' ? 'Weekly' : 'Monthly';
      const now = new Date();
      const periodLabel = mode === 'weekly'
        ? `${localDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7))} to ${localDateStr(now)}`
        : `${now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`;

      const wb = XLSX.utils.book_new();

      // Sheet 1: Summary
      const summaryData = [
        ['BPT Academy — ' + modeLabel + ' Report'],
        ['Period:', periodLabel],
        ['Generated:', new Date().toLocaleString('en-GB')],
        ['Generated by:', profile?.full_name ?? 'Super Admin'],
        [],
        ['KEY METRICS'],
        ['Metric', 'Value'],
        ['Total Students', totalStudents],
        ['New Enrollments (' + modeLabel + ')', newEnrollments],
        ['Revenue (' + modeLabel + ')', formatCurrency(revenue)],
        ['Sessions Attended', `${attendedCount} / ${totalSessionCount}`],
        ['Attendance Rate (' + modeLabel + ')', attendanceRate !== null ? attendanceRate + '%' : 'N/A'],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      wsSummary['!cols'] = [{ wch: 35 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      // Sheet 2: Revenue by Division
      const revData = [
        ['REVENUE BY DIVISION — ' + modeLabel.toUpperCase()],
        ['Division', 'Revenue (£)', 'Payments'],
        ...divisionRevenue.map(d => [formatDivisionLabel(d.division), d.revenue.toFixed(2), d.count]),
        [],
        ['TOTAL', revenue.toFixed(2), divisionRevenue.reduce((s, d) => s + d.count, 0)],
      ];
      const wsRev = XLSX.utils.aoa_to_sheet(revData);
      wsRev['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsRev, 'Revenue by Division');

      // Sheet 3: Students by Division
      const divData = [
        ['STUDENTS BY DIVISION'],
        ['Division', 'Student Count'],
        ...divisionActivity.map(d => [formatDivisionLabel(d.division), d.studentCount]),
        [],
        ['TOTAL', totalStudents],
      ];
      const wsDiv = XLSX.utils.aoa_to_sheet(divData);
      wsDiv['!cols'] = [{ wch: 20 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsDiv, 'Students by Division');

      // Sheet 4: Top Students
      const topData2 = [
        ['TOP STUDENTS BY RANKING POINTS'],
        ['Name', 'Division', 'Ranking Points'],
        ...topStudents.map(s => [s.full_name, formatDivisionLabel(s.division), s.ranking_points ?? 0]),
      ];
      const wsTop = XLSX.utils.aoa_to_sheet(topData2);
      wsTop['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsTop, 'Top Students');

      const wbOut = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const uint8 = new Uint8Array(wbOut);
      const base64 = uint8ToBase64(uint8);
      const filename = `BPT_Report_${modeLabel}_${localDateStr(now)}.xlsx`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', dialogTitle: `Share ${filename}` });
      } else {
        Alert.alert('Export saved', `File saved to: ${fileUri}`);
      }
    } catch (err: any) {
      Alert.alert('Export failed', err?.message ?? 'Unknown error');
    } finally {
      setExporting(false);
    }
  };

  const renderStatCard = (label: string, value: string, sub?: string, color?: string) => (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );

  if (loading) return (
    <View style={styles.loadingContainer}>
      <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />

      <BackHeader title="Reports" />
      <ActivityIndicator size="large" color="#16A34A" style={{ marginTop: 60 }} />
    </View>
  );

  return (
    <View style={styles.container}>
      <BackHeader title="Reports" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Period selector ── */}
        <View style={styles.segmentRow}>
          {(['weekly', 'monthly'] as ReportMode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.segmentBtn, mode === m && styles.segmentBtnActive]}
              onPress={() => setMode(m)}
            >
              <Text style={[styles.segmentBtnText, mode === m && styles.segmentBtnTextActive]}>
                {m === 'weekly' ? '7 Days' : 'This Month'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Key metrics ── */}
        <View style={styles.statsGrid}>
          {renderStatCard('👥 Total Students', `${totalStudents}`, 'All active students')}
          {renderStatCard('📋 New Enrollments', `${newEnrollments}`, 'In selected period')}
          {renderStatCard('💷 Revenue', formatCurrency(revenue), 'Confirmed payments')}
          {renderStatCard(
            '📅 Attendance Rate',
            attendanceRate !== null ? `${attendanceRate}%` : '—',
            attendanceRate !== null
              ? `${attendedCount} attended / ${totalSessionCount} total`
              : 'No sessions in period',
            attendanceRate !== null
              ? attendanceRate >= 75 ? '#16A34A' : attendanceRate >= 50 ? '#D97706' : '#DC2626'
              : undefined,
          )}
        </View>

        {/* ── Revenue by division ── */}
        {divisionRevenue.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💷 Revenue by Division</Text>
            {divisionRevenue.map((d) => (
              <View key={d.division} style={styles.rowCard}>
                <Text style={styles.rowLabel}>{formatDivisionLabel(d.division)}</Text>
                <View style={styles.rowRight}>
                  <Text style={styles.rowValue}>{formatCurrency(d.revenue)}</Text>
                  <Text style={styles.rowSub}>{d.count} payment{d.count !== 1 ? 's' : ''}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Students by division ── */}
        {divisionActivity.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👥 Students by Division</Text>
            {divisionActivity.map((d) => {
              const pct = totalStudents > 0 ? Math.round((d.studentCount / totalStudents) * 100) : 0;
              return (
                <View key={d.division} style={styles.rowCard}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowLabel}>{formatDivisionLabel(d.division)}</Text>
                    <View style={styles.miniBar}>
                      <View style={[styles.miniBarFill, { width: `${pct}%` }]} />
                    </View>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={styles.rowValue}>{d.studentCount}</Text>
                    <Text style={styles.rowSub}>{pct}%</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Top students ── */}
        {topStudents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏆 Top Students</Text>
            {topStudents.map((s, i) => (
              <View key={s.id} style={styles.rowCard}>
                <Text style={styles.rankNum}>#{i + 1}</Text>
                <View style={styles.rowLeft}>
                  <Text style={styles.rowLabel}>{s.full_name}</Text>
                  <Text style={styles.rowSub}>{formatDivisionLabel(s.division)}</Text>
                </View>
                <Text style={styles.rowValue}>{s.ranking_points ?? 0} pts</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Export ── */}
        <TouchableOpacity
          style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
          onPress={handleExport}
          disabled={exporting}
        >
          <Text style={styles.exportBtnText}>
            {exporting ? '⏳ Exporting...' : '📊 Export to Excel (.xlsx)'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16 },

  segmentRow: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 10, padding: 3, marginBottom: 16 },
  segmentBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  segmentBtnText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  segmentBtnTextActive: { color: '#111827' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    width: '47.5%', backgroundColor: '#FFFFFF', borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: '#E5E7EB',
  },
  statLabel: { fontSize: 12, color: '#6B7280', marginBottom: 6, fontWeight: '500' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 2 },
  statSub: { fontSize: 11, color: '#9CA3AF' },

  section: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },

  rowCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rowLeft: { flex: 1 },
  rowRight: { alignItems: 'flex-end' },
  rowLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  rowValue: { fontSize: 15, fontWeight: '700', color: '#111827' },
  rowSub: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  rankNum: { fontSize: 16, fontWeight: '800', color: '#D1D5DB', width: 28 },

  miniBar: { height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, marginTop: 5, width: '100%' },
  miniBarFill: { height: '100%', backgroundColor: '#16A34A', borderRadius: 2 },

  exportBtn: { backgroundColor: '#16A34A', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 8 },
  exportBtnDisabled: { opacity: 0.6 },
  exportBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
