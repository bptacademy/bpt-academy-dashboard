import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { PromotionCycle, LEVEL_LABELS } from '../../types';
import BackHeader from '../../components/common/BackHeader';

interface Props {
  route: { params: { studentId: string; studentName: string } };
  navigation: any;
}

type FromLevel = 'amateur_beginner' | 'amateur_intermediate' | 'amateur_advanced' | 'semi_pro';

const FROM_LEVELS: FromLevel[] = [
  'amateur_beginner',
  'amateur_intermediate',
  'amateur_advanced',
  'semi_pro',
];

const NEXT_LEVEL: Record<FromLevel, string> = {
  amateur_beginner:     'amateur_intermediate',
  amateur_intermediate: 'amateur_advanced',
  amateur_advanced:     'semi_pro',
  semi_pro:             'pro',
};

const NEEDS_APPROVAL: Record<FromLevel, boolean> = {
  amateur_beginner:     false,
  amateur_intermediate: false,
  amateur_advanced:     true,
  semi_pro:             true,
};

const CYCLE_MONTHS: Record<FromLevel, number> = {
  amateur_beginner:     2,
  amateur_intermediate: 2,
  amateur_advanced:     3,
  semi_pro:             3,
};

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function applyPromotion(toLevelKey: string): { division: string; skill_level: string | null } {
  switch (toLevelKey) {
    case 'amateur_intermediate': return { division: 'amateur', skill_level: 'intermediate' };
    case 'amateur_advanced':     return { division: 'amateur', skill_level: 'advanced' };
    case 'semi_pro':             return { division: 'semi_pro', skill_level: null };
    case 'pro':                  return { division: 'pro', skill_level: null };
    default:                     return { division: 'amateur', skill_level: 'beginner' };
  }
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active:   { bg: '#EFF6FF', text: '#2563EB' },
  eligible: { bg: '#FEF9C3', text: '#92400E' },
  approved: { bg: '#DCFCE7', text: '#16A34A' },
  promoted: { bg: '#F0FDF4', text: '#15803D' },
  expired:  { bg: '#F3F4F6', text: '#6B7280' },
};

export default function PromotionManageScreen({ route, navigation }: Props) {
  const { studentId, studentName } = route.params;
  const { profile: coachProfile } = useAuth();

  const [cycle, setCycle] = useState<PromotionCycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actioning, setActioning] = useState(false);

  // Attendance stats
  const [attended, setAttended] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);

  // New cycle form
  const [fromLevel, setFromLevel] = useState<FromLevel>('amateur_beginner');
  const [startDate, setStartDate] = useState(todayStr());

  const toLevel = NEXT_LEVEL[fromLevel];
  const endDate = addMonths(startDate, CYCLE_MONTHS[fromLevel]);
  const requiresApproval = NEEDS_APPROVAL[fromLevel];

  const fetchAttendance = useCallback(async (c: PromotionCycle) => {
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('program_id')
      .eq('student_id', studentId)
      .eq('status', 'active');

    const programIds = (enrollments ?? []).map((e: { program_id: string }) => e.program_id);
    if (programIds.length === 0) return;

    const { count: total } = await supabase
      .from('program_sessions')
      .select('*', { count: 'exact', head: true })
      .in('program_id', programIds)
      .gte('scheduled_at', c.cycle_start_date)
      .lte('scheduled_at', c.cycle_end_date);

    const { data: sessionRows } = await supabase
      .from('program_sessions')
      .select('id')
      .in('program_id', programIds)
      .gte('scheduled_at', c.cycle_start_date)
      .lte('scheduled_at', c.cycle_end_date);

    const ids = (sessionRows ?? []).map((s: { id: string }) => s.id);
    let att = 0;
    if (ids.length > 0) {
      const { count } = await supabase
        .from('session_attendance')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('attended', true)
        .in('session_id', ids);
      att = count ?? 0;
    }

    setTotalSessions(total ?? 0);
    setAttended(att);
  }, [studentId]);

  const fetchCycle = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('promotion_cycles')
      .select('*')
      .eq('student_id', studentId)
      .in('status', ['active', 'eligible', 'approved'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const c = data as PromotionCycle | null;
    setCycle(c);
    if (c) await fetchAttendance(c);
    setLoading(false);
  }, [studentId, fetchAttendance]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCycle();
    setRefreshing(false);
  };

  useEffect(() => { fetchCycle(); }, [fetchCycle]);

  // ── Actions ───────────────────────────────────────────────

  const handleMarkEligible = () => {
    Alert.alert('Mark as Eligible', `Mark ${studentName}'s cycle as eligible for promotion?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Eligible', onPress: async () => {
          if (!cycle) return;
          setActioning(true);
          await supabase.from('promotion_cycles').update({ status: 'eligible' }).eq('id', cycle.id);
          await fetchCycle();
          setActioning(false);
        },
      },
    ]);
  };

  const handleApprove = () => {
    Alert.alert('Approve Promotion', `Approve ${studentName}'s promotion to ${LEVEL_LABELS[cycle?.to_level ?? ''] ?? cycle?.to_level}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve', onPress: async () => {
          if (!cycle || !coachProfile) return;
          setActioning(true);
          await supabase.from('promotion_cycles').update({
            status: 'approved',
            coach_approved_by: coachProfile.id,
            coach_approved_at: new Date().toISOString(),
          }).eq('id', cycle.id);
          await fetchCycle();
          setActioning(false);
        },
      },
    ]);
  };

  const handlePromote = () => {
    if (!cycle) return;
    const toLabel = LEVEL_LABELS[cycle.to_level] ?? cycle.to_level;
    Alert.alert('Apply Promotion', `Promote ${studentName} to ${toLabel}? This will update their profile.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Promote', onPress: async () => {
          if (!cycle) return;
          setActioning(true);
          const { division, skill_level } = applyPromotion(cycle.to_level);

          const profileUpdate: Record<string, string | null> = { division };
          if (skill_level !== null) profileUpdate.skill_level = skill_level;

          await supabase.from('profiles').update(profileUpdate).eq('id', studentId);
          await supabase.from('promotion_cycles').update({ status: 'promoted' }).eq('id', cycle.id);
          await supabase.from('ranking_events').insert({
            student_id: studentId,
            division,
            points: 50,
            reason: `promotion_to_${cycle.to_level}`,
          });

          Alert.alert('🎉 Promoted!', `${studentName} has been promoted to ${toLabel}.`);
          await fetchCycle();
          setActioning(false);
        },
      },
    ]);
  };

  const handleExpire = () => {
    Alert.alert('Expire Cycle', `Expire this promotion cycle for ${studentName}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Expire', style: 'destructive', onPress: async () => {
          if (!cycle) return;
          setActioning(true);
          await supabase.from('promotion_cycles').update({ status: 'expired' }).eq('id', cycle.id);
          await fetchCycle();
          setActioning(false);
        },
      },
    ]);
  };

  const handleStartCycle = () => {
    Alert.alert(
      'Start Promotion Cycle',
      `Start a cycle for ${studentName}:\n${LEVEL_LABELS[fromLevel]} → ${LEVEL_LABELS[toLevel]}\n${startDate} → ${endDate}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start', onPress: async () => {
            setActioning(true);
            const { error } = await supabase.from('promotion_cycles').insert({
              student_id: studentId,
              from_level: fromLevel,
              to_level: toLevel,
              cycle_start_date: startDate,
              cycle_end_date: endDate,
              required_attendance_pct: 80,
              requires_coach_approval: requiresApproval,
              status: 'active',
            });
            if (error) {
              Alert.alert('Error', error.message);
            } else {
              await fetchCycle();
            }
            setActioning(false);
          },
        },
      ]
    );
  };

  // ── Render ────────────────────────────────────────────────

  const attPct = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0;
  const daysLeft = cycle
    ? Math.max(0, Math.ceil((new Date(cycle.cycle_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <View style={styles.container}>
      <BackHeader title={`${studentName} — Promotion`} />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#16A34A" style={styles.loader} />
        ) : cycle ? (
          <>
            {/* ── Active cycle card ── */}
            <View style={styles.cycleCard}>
              <View style={styles.cycleTop}>
                <View>
                  <Text style={styles.cycleFromLabel}>From</Text>
                  <Text style={styles.cycleFrom}>{LEVEL_LABELS[cycle.from_level] ?? cycle.from_level}</Text>
                  <Text style={styles.cycleArrow}>↓</Text>
                  <Text style={styles.cycleToLabel}>To</Text>
                  <Text style={styles.cycleTo}>{LEVEL_LABELS[cycle.to_level] ?? cycle.to_level}</Text>
                </View>
                <View style={styles.cycleRight}>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[cycle.status]?.bg ?? '#F3F4F6' }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[cycle.status]?.text ?? '#374151' }]}>
                      {cycle.status.charAt(0).toUpperCase() + cycle.status.slice(1)}
                    </Text>
                  </View>
                  <Text style={styles.daysLeft}>{daysLeft}</Text>
                  <Text style={styles.daysLeftLabel}>days left</Text>
                </View>
              </View>
              <Text style={styles.cycleDates}>
                {new Date(cycle.cycle_start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                {' → '}
                {new Date(cycle.cycle_end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
              {cycle.requires_coach_approval && (
                <View style={styles.approvalNote}>
                  <Text style={styles.approvalNoteText}>🔐 Coach approval required for this promotion</Text>
                </View>
              )}
            </View>

            {/* ── Attendance stats ── */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Attendance This Cycle</Text>
              <View style={styles.attRow}>
                <Text style={[styles.attPct, attPct >= 80 && { color: '#16A34A' }]}>{attPct}%</Text>
                <Text style={styles.attTarget}>Target: {cycle.required_attendance_pct}%</Text>
              </View>
              <View style={styles.attBarBg}>
                <View style={[
                  styles.attBarFill,
                  { width: `${Math.min(100, attPct)}%`, backgroundColor: attPct >= 80 ? '#16A34A' : '#3B82F6' },
                ]} />
                <View style={styles.attMarker} />
              </View>
              <View style={styles.attStats}>
                <View style={styles.attStat}>
                  <Text style={styles.attStatNum}>{attended}</Text>
                  <Text style={styles.attStatLabel}>Attended</Text>
                </View>
                <View style={styles.attStat}>
                  <Text style={styles.attStatNum}>{totalSessions}</Text>
                  <Text style={styles.attStatLabel}>Total</Text>
                </View>
                <View style={styles.attStat}>
                  <Text style={[styles.attStatNum, { color: '#EF4444' }]}>{totalSessions - attended}</Text>
                  <Text style={styles.attStatLabel}>Missed</Text>
                </View>
              </View>
            </View>

            {/* ── Action buttons ── */}
            <View style={styles.actionsCard}>
              <Text style={styles.cardTitle}>Actions</Text>

              {actioning && <ActivityIndicator color="#16A34A" style={{ marginBottom: 12 }} />}

              {cycle.status === 'active' && (
                <TouchableOpacity style={styles.actionBtn} onPress={handleMarkEligible} disabled={actioning}>
                  <Text style={styles.actionBtnText}>⭐ Mark as Eligible</Text>
                </TouchableOpacity>
              )}

              {cycle.status === 'eligible' && cycle.requires_coach_approval && (
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnGreen]} onPress={handleApprove} disabled={actioning}>
                  <Text style={[styles.actionBtnText, styles.actionBtnTextWhite]}>✅ Approve Promotion</Text>
                </TouchableOpacity>
              )}

              {cycle.status === 'eligible' && !cycle.requires_coach_approval && (
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnGreen]} onPress={handlePromote} disabled={actioning}>
                  <Text style={[styles.actionBtnText, styles.actionBtnTextWhite]}>🚀 Apply Promotion Now</Text>
                </TouchableOpacity>
              )}

              {cycle.status === 'approved' && (
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnGreen]} onPress={handlePromote} disabled={actioning}>
                  <Text style={[styles.actionBtnText, styles.actionBtnTextWhite]}>🎉 Apply Promotion to Profile</Text>
                </TouchableOpacity>
              )}

              {(cycle.status === 'active' || cycle.status === 'eligible') && (
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnRed]} onPress={handleExpire} disabled={actioning}>
                  <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>❌ Expire Cycle</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        ) : (
          /* ── No active cycle — show create form ── */
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Start Promotion Cycle</Text>
            <Text style={styles.fieldLabel}>From Level</Text>
            <View style={styles.levelGrid}>
              {FROM_LEVELS.map((lvl) => (
                <TouchableOpacity
                  key={lvl}
                  style={[styles.levelChip, fromLevel === lvl && styles.levelChipActive]}
                  onPress={() => setFromLevel(lvl)}
                >
                  <Text style={[styles.levelChipText, fromLevel === lvl && styles.levelChipTextActive]}>
                    {LEVEL_LABELS[lvl]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>To Level</Text>
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyText}>{LEVEL_LABELS[toLevel] ?? toLevel}</Text>
            </View>

            <Text style={styles.fieldLabel}>Start Date</Text>
            <TextInput
              style={styles.textInput}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.fieldLabel}>End Date (auto-calculated)</Text>
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyText}>{endDate}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoText}>
                Duration: {CYCLE_MONTHS[fromLevel]} months · Coach approval: {requiresApproval ? 'Required' : 'Not required'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnGreen, { marginTop: 8 }]}
              onPress={handleStartCycle}
              disabled={actioning}
            >
              {actioning
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={[styles.actionBtnText, styles.actionBtnTextWhite]}>▶ Start Cycle</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, paddingBottom: 48 },
  loader: { marginTop: 60 },

  cycleCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB',
  },
  cycleTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  cycleFromLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase' },
  cycleFrom: { fontSize: 15, fontWeight: '600', color: '#374151' },
  cycleArrow: { fontSize: 16, color: '#D1D5DB', marginVertical: 2 },
  cycleToLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase' },
  cycleTo: { fontSize: 18, fontWeight: '800', color: '#16A34A' },
  cycleRight: { alignItems: 'flex-end' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, marginBottom: 8 },
  statusText: { fontSize: 13, fontWeight: '700' },
  daysLeft: { fontSize: 32, fontWeight: '800', color: '#111827' },
  daysLeftLabel: { fontSize: 11, color: '#9CA3AF' },
  cycleDates: { fontSize: 12, color: '#9CA3AF' },
  approvalNote: { marginTop: 10, backgroundColor: '#FEF9C3', borderRadius: 8, padding: 10 },
  approvalNoteText: { fontSize: 12, color: '#92400E', fontWeight: '600' },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 14 },

  attRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 },
  attPct: { fontSize: 40, fontWeight: '800', color: '#3B82F6' },
  attTarget: { fontSize: 13, color: '#6B7280' },
  attBarBg: { height: 16, backgroundColor: '#E5E7EB', borderRadius: 8, marginBottom: 14, overflow: 'hidden', position: 'relative' },
  attBarFill: { height: '100%', borderRadius: 8 },
  attMarker: { position: 'absolute', left: '80%', top: 0, bottom: 0, width: 2, backgroundColor: '#374151' },
  attStats: { flexDirection: 'row', justifyContent: 'space-around' },
  attStat: { alignItems: 'center' },
  attStatNum: { fontSize: 22, fontWeight: '800', color: '#111827' },
  attStatLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

  actionsCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB',
  },
  actionBtn: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginBottom: 10,
  },
  actionBtnGreen: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  actionBtnRed: { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: '#374151' },
  actionBtnTextWhite: { color: '#FFFFFF' },

  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8, marginTop: 12 },
  levelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  levelChip: {
    borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#F9FAFB',
  },
  levelChipActive: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  levelChipText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  levelChipTextActive: { color: '#FFFFFF' },
  readonlyField: {
    backgroundColor: '#F3F4F6', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 4,
  },
  readonlyText: { fontSize: 15, color: '#374151', fontWeight: '600' },
  textInput: {
    backgroundColor: '#F9FAFB', borderRadius: 10, padding: 14,
    borderWidth: 1.5, borderColor: '#D1D5DB', fontSize: 15, color: '#111827',
  },
  infoRow: { backgroundColor: '#EFF6FF', borderRadius: 8, padding: 10, marginTop: 10 },
  infoText: { fontSize: 12, color: '#1D4ED8', fontWeight: '600' },
});
