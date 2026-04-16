import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, Image, Dimensions} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { LEVEL_LABELS } from '../../types';
import BackHeader from '../../components/common/BackHeader';
import BackButton from '../../components/common/BackButton';

interface PromotionCycle {
  id: string;
  student_id: string;
  program_id: string | null;
  from_level: string;
  to_level: string;
  cycle_start_date: string;
  cycle_end_date: string;
  required_attendance_pct: number;
  min_active_weeks: number;
  active_weeks_so_far: number;
  attendance_pct: number;
  performance_pct: number;
  requires_coach_approval: boolean;
  status: 'active' | 'eligible' | 'approved' | 'promoted' | 'expired';
  coach_approved_by: string | null;
  coach_approved_at: string | null;
  rejection_note: string | null;
  last_evaluated_at: string | null;
  created_at: string;
}

const STATUS_META: Record<string, { bg: string; text: string; label: string }> = {
  active:   { bg: '#EFF6FF', text: '#2563EB', label: 'In Progress' },
  eligible: { bg: '#FEF9C3', text: '#92400E', label: '⭐ Eligible' },
  approved: { bg: '#DCFCE7', text: '#16A34A', label: '✅ Approved' },
  promoted: { bg: '#F0FDF4', text: '#15803D', label: '🚀 Promoted' },
  expired:  { bg: '#F3F4F6', text: '#6B7280', label: 'Expired' },
};

function MetricBar({ label, value, target, suffix = '%' }: {
  label: string; value: number; target: number; suffix?: string;
}) {
  const pct = Math.min(100, Math.round((value / target) * 100));
  const met = value >= target;
  return (
    <View style={styles.metricRow}>
      <BackButton />

      <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />

      <View style={styles.metricHeader}>
        <Text style={styles.metricLabel}>{label}</Text>
        <View style={styles.metricRight}>
          <Text style={[styles.metricValue, met && styles.metricMet]}>
            {value}{suffix}
          </Text>
          <Text style={styles.metricTarget}> / {target}{suffix}</Text>
          <Text style={[styles.metricCheck, met ? styles.metricCheckMet : styles.metricCheckNo]}>
            {met ? ' ✓' : ' ✗'}
          </Text>
        </View>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: met ? '#16A34A' : '#3B82F6' }]} />
        {/* Target marker */}
        <View style={[styles.barMarker, { left: '80%' }]} />
      </View>
    </View>
  );
}

export default function PromotionManageScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { studentId, studentName } = route.params;
  const { profile: coachProfile } = useAuth();

  const [cycle, setCycle]             = useState<PromotionCycle | null>(null);
  const [history, setHistory]         = useState<PromotionCycle[]>([]);
  const [studentDivision, setStudentDivision] = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [actioning, setActioning]     = useState(false);

  // ── Fetch ──────────────────────────────────────────────────
  const fetchCycle = useCallback(async () => {
    setLoading(true);

    // Fetch student's division so we know if they're at top level
    const { data: studentProfile } = await supabase
      .from('profiles')
      .select('division')
      .eq('id', studentId)
      .single();
    setStudentDivision(studentProfile?.division ?? null);

    // Active/eligible/approved cycle
    const { data: active } = await supabase
      .from('promotion_cycles')
      .select('*')
      .eq('student_id', studentId)
      .in('status', ['active', 'eligible', 'approved'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setCycle(active as PromotionCycle | null);

    // History — last 5 completed
    const { data: hist } = await supabase
      .from('promotion_cycles')
      .select('*')
      .eq('student_id', studentId)
      .in('status', ['promoted', 'expired'])
      .order('created_at', { ascending: false })
      .limit(5);

    setHistory((hist ?? []) as PromotionCycle[]);
    setLoading(false);
  }, [studentId]);

  const onRefresh = async () => { setRefreshing(true); await fetchCycle(); setRefreshing(false); };
  useEffect(() => { fetchCycle(); }, [fetchCycle]);

  // ── Trigger manual evaluation ──────────────────────────────
  const handleEvaluateNow = async () => {
    if (!cycle) return;
    setActioning(true);
    const { error } = await supabase.rpc('evaluate_promotion_cycle', { p_cycle_id: cycle.id });
    setActioning(false);
    if (error) { Alert.alert('Error', error.message); return; }
    await fetchCycle();
    Alert.alert('✅ Evaluated', 'Stats refreshed from latest attendance and performance data.');
  };

  // ── Approve ────────────────────────────────────────────────
  const handleApprove = () => {
    const toLabel = LEVEL_LABELS[cycle?.to_level ?? ''] ?? cycle?.to_level;
    Alert.alert(
      '✅ Approve Promotion',
      `Approve ${studentName}'s promotion to ${toLabel}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: async () => {
          if (!cycle || !coachProfile) return;
          setActioning(true);
          await supabase.from('promotion_cycles').update({
            status: 'approved',
            coach_approved_by: coachProfile.id,
            coach_approved_at: new Date().toISOString(),
          }).eq('id', cycle.id);
          await supabase.from('notifications').insert({
            recipient_id: studentId,
            title: '✅ Promotion approved!',
            body: `Your coach has approved your promotion to ${toLabel}. It will be applied to your profile now.`,
            type: 'promotion',
          });
          await applyPromotion(cycle);
          setActioning(false);
        }},
      ]
    );
  };

  // ── Reject ────────────────────────────────────────────────
  const handleReject = () => {
    Alert.alert(
      '❌ Reject Promotion',
      `Reject ${studentName}'s promotion request? They will need to continue working towards the targets.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: async () => {
          if (!cycle) return;
          setActioning(true);
          await supabase.from('promotion_cycles').update({
            status: 'active',  // back to active so they keep working
          }).eq('id', cycle.id);
          await supabase.from('notifications').insert({
            recipient_id: studentId,
            title: '📋 Promotion not approved yet',
            body: 'Your coach has reviewed your progress and feels you need more time. Keep working hard — you\'re on the right track!',
            type: 'promotion',
          });
          await fetchCycle();
          setActioning(false);
        }},
      ]
    );
  };

  // ── Apply promotion to profile ─────────────────────────────
  const applyPromotion = async (c: PromotionCycle) => {
    const map: Record<string, { division: string; skill_level: string | null }> = {
      amateur_intermediate: { division: 'amateur',   skill_level: 'intermediate' },
      amateur_advanced:     { division: 'amateur',   skill_level: 'advanced' },
      semi_pro:             { division: 'semi_pro',  skill_level: null },
      pro:                  { division: 'pro',       skill_level: null },
    };
    const dest = map[c.to_level];
    if (!dest) return;

    const profileUpdate: Record<string, string | null> = { division: dest.division };
    if (dest.skill_level !== null) profileUpdate.skill_level = dest.skill_level;

    await supabase.from('profiles').update(profileUpdate).eq('id', studentId);
    await supabase.from('promotion_cycles').update({ status: 'promoted' }).eq('id', c.id);
    await supabase.from('ranking_events').insert({
      student_id: studentId,
      division: dest.division,
      points: 50,
      reason: `promotion_to_${c.to_level}`,
    });
    await supabase.from('notifications').insert({
      recipient_id: studentId,
      title: `🚀 You've been promoted to ${LEVEL_LABELS[c.to_level] ?? c.to_level}!`,
      body: `Congratulations! You've officially moved up to ${LEVEL_LABELS[c.to_level] ?? c.to_level}. Keep it up!`,
      type: 'promotion',
    });

    Alert.alert('🎉 Promoted!', `${studentName} is now ${LEVEL_LABELS[c.to_level] ?? c.to_level}.`);
    await fetchCycle();
  };

  // ── Expire cycle ──────────────────────────────────────────
  const handleExpire = () => {
    Alert.alert('Expire Cycle', `End this promotion cycle for ${studentName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Expire', style: 'destructive', onPress: async () => {
        if (!cycle) return;
        setActioning(true);
        await supabase.from('promotion_cycles').update({ status: 'expired' }).eq('id', cycle.id);
        await supabase.from('notifications').insert({
          recipient_id: studentId,
          title: '📅 Promotion cycle ended',
          body: 'Your promotion cycle has been closed by your coach. Speak to them about starting a new one.',
          type: 'promotion',
        });
        await fetchCycle();
        setActioning(false);
      }},
    ]);
  };

  // ── Render ────────────────────────────────────────────────
  const attMet   = (cycle?.attendance_pct  ?? 0) >= 80;
  const perfMet  = (cycle?.performance_pct ?? 0) >= 80;
  const weeksMet = (cycle?.active_weeks_so_far ?? 0) >= (cycle?.min_active_weeks ?? 999);
  const allMet   = attMet && perfMet && weeksMet;

  return (
    <View style={styles.root}>
      <BackHeader title={`${studentName} — Promotion`} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#16A34A" style={styles.loader} />
        ) : cycle ? (
          <>
            {/* ── Status card ── */}
            <View style={styles.card}>
              <View style={styles.statusRow}>
                <View>
                  <Text style={styles.levelFrom}>{LEVEL_LABELS[cycle.from_level] ?? cycle.from_level}</Text>
                  <Text style={styles.arrow}>→</Text>
                  <Text style={styles.levelTo}>{LEVEL_LABELS[cycle.to_level] ?? cycle.to_level}</Text>
                </View>
                <View style={styles.statusRight}>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_META[cycle.status]?.bg }]}>
                    <Text style={[styles.statusText, { color: STATUS_META[cycle.status]?.text }]}>
                      {STATUS_META[cycle.status]?.label ?? cycle.status}
                    </Text>
                  </View>
                  {cycle.requires_coach_approval && (
                    <Text style={styles.approvalNote}>🔐 Coach approval required</Text>
                  )}
                </View>
              </View>

              <Text style={styles.dateRange}>
                Started {new Date(cycle.cycle_start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
              {cycle.last_evaluated_at && (
                <Text style={styles.lastEval}>
                  Last checked {new Date(cycle.last_evaluated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </View>

            {/* ── Criteria card ── */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Promotion Criteria</Text>

              {/* Overall eligibility pill */}
              <View style={[styles.eligibilityPill, allMet ? styles.eligibilityPillMet : styles.eligibilityPillNot]}>
                <Text style={[styles.eligibilityText, allMet ? styles.eligibilityTextMet : styles.eligibilityTextNot]}>
                  {allMet ? '✅ All criteria met — eligible for promotion' : '⏳ Not yet eligible — keep going'}
                </Text>
              </View>

              <MetricBar
                label="Active Weeks"
                value={cycle.active_weeks_so_far}
                target={cycle.min_active_weeks}
                suffix=" wks"
              />
              <MetricBar
                label="Attendance"
                value={cycle.attendance_pct}
                target={80}
              />
              <MetricBar
                label="Performance"
                value={cycle.performance_pct}
                target={80}
              />

              <Text style={styles.criteriaNote}>
                ℹ️ Active weeks = weeks where the student attended at least one session. Time only counts when they show up.
              </Text>
            </View>

            {/* ── Actions ── */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Actions</Text>
              {actioning && <ActivityIndicator color="#16A34A" style={{ marginBottom: 12 }} />}

              {/* Refresh stats */}
              <TouchableOpacity style={styles.btn} onPress={handleEvaluateNow} disabled={actioning}>
                <Text style={styles.btnText}>🔄 Refresh Stats Now</Text>
              </TouchableOpacity>

              {/* Approve — shown when eligible and needs approval */}
              {cycle.status === 'eligible' && cycle.requires_coach_approval && (
                <TouchableOpacity style={[styles.btn, styles.btnGreen]} onPress={handleApprove} disabled={actioning}>
                  <Text style={[styles.btnText, styles.btnTextWhite]}>✅ Approve Promotion</Text>
                </TouchableOpacity>
              )}

              {/* Auto-promote — eligible and no approval needed */}
              {cycle.status === 'eligible' && !cycle.requires_coach_approval && (
                <TouchableOpacity style={[styles.btn, styles.btnGreen]} onPress={() => applyPromotion(cycle)} disabled={actioning}>
                  <Text style={[styles.btnText, styles.btnTextWhite]}>🚀 Apply Promotion</Text>
                </TouchableOpacity>
              )}

              {/* Apply after approval */}
              {cycle.status === 'approved' && (
                <TouchableOpacity style={[styles.btn, styles.btnGreen]} onPress={() => applyPromotion(cycle)} disabled={actioning}>
                  <Text style={[styles.btnText, styles.btnTextWhite]}>🎉 Apply Promotion to Profile</Text>
                </TouchableOpacity>
              )}

              {/* Reject — only when eligible */}
              {cycle.status === 'eligible' && (
                <TouchableOpacity style={[styles.btn, styles.btnOrange]} onPress={handleReject} disabled={actioning}>
                  <Text style={[styles.btnText, { color: '#92400E' }]}>❌ Not Ready — Send Back</Text>
                </TouchableOpacity>
              )}

              {/* Expire */}
              {['active', 'eligible'].includes(cycle.status) && (
                <TouchableOpacity style={[styles.btn, styles.btnRed]} onPress={handleExpire} disabled={actioning}>
                  <Text style={[styles.btnText, { color: '#DC2626' }]}>🗑 Expire Cycle</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ── Promotion history ── */}
            {history.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Promotion History</Text>
                {history.map((h) => (
                  <View key={h.id} style={styles.historyRow}>
                    <View>
                      <Text style={styles.historyLevels}>
                        {LEVEL_LABELS[h.from_level] ?? h.from_level} → {LEVEL_LABELS[h.to_level] ?? h.to_level}
                      </Text>
                      <Text style={styles.historyDate}>
                        {new Date(h.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                    <View style={[styles.historyBadge, { backgroundColor: STATUS_META[h.status]?.bg ?? '#F3F4F6' }]}>
                      <Text style={[styles.historyBadgeText, { color: STATUS_META[h.status]?.text ?? '#374151' }]}>
                        {STATUS_META[h.status]?.label ?? h.status}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          /* ── No cycle ── */
          <View style={styles.card}>
            {studentDivision === 'pro' ? (
              <>
                <Text style={styles.emptyIcon}>🏆</Text>
                <Text style={styles.emptyTitle}>Pro Division — Top Level</Text>
                <Text style={styles.emptyText}>
                  {studentName} is already in the Pro Division — the highest level at BPT Academy. No promotion cycle is applicable.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyIcon}>🎯</Text>
                <Text style={styles.emptyTitle}>No Active Promotion Cycle</Text>
                <Text style={styles.emptyText}>
                  A promotion cycle starts automatically when a student enrolls in a program.
                  If {studentName} is enrolled and no cycle appears, tap below to start one manually.
                </Text>
                <TouchableOpacity
                  style={[styles.btn, styles.btnGreen, { marginTop: 16 }]}
                  onPress={async () => {
                    setActioning(true);
                    const { data: enroll } = await supabase
                      .from('enrollments')
                      .select('program_id')
                      .eq('student_id', studentId)
                      .eq('status', 'active')
                      .limit(1)
                      .maybeSingle();

                    if (!enroll) {
                      Alert.alert('Not enrolled', `${studentName} is not currently enrolled in an active program.`);
                      setActioning(false);
                      return;
                    }

                    const { error } = await supabase.rpc('start_promotion_cycle_for_student', {
                      p_student_id: studentId,
                      p_program_id: enroll.program_id,
                    });
                    setActioning(false);
                    if (error) { Alert.alert('Error', error.message); return; }
                    await fetchCycle();
                  }}
                  disabled={actioning}
                >
                  {actioning
                    ? <ActivityIndicator color="#FFFFFF" />
                    : <Text style={[styles.btnText, styles.btnTextWhite]}>▶ Start Cycle Manually</Text>
                  }
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, paddingBottom: 48 },
  loader: { marginTop: 60 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 14 },

  // Status card
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  levelFrom: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  arrow: { fontSize: 18, color: '#D1D5DB', marginVertical: 2 },
  levelTo: { fontSize: 20, fontWeight: '800', color: '#16A34A' },
  statusRight: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 },
  statusText: { fontSize: 13, fontWeight: '700' },
  approvalNote: { fontSize: 11, color: '#92400E', fontWeight: '600' },
  dateRange: { fontSize: 12, color: '#9CA3AF' },
  lastEval: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

  // Criteria
  eligibilityPill: { borderRadius: 10, padding: 12, marginBottom: 16 },
  eligibilityPillMet: { backgroundColor: '#DCFCE7' },
  eligibilityPillNot: { backgroundColor: '#F3F4F6' },
  eligibilityText: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  eligibilityTextMet: { color: '#15803D' },
  eligibilityTextNot: { color: '#6B7280' },

  // Metric bar
  metricRow: { marginBottom: 16 },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  metricLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  metricRight: { flexDirection: 'row', alignItems: 'baseline' },
  metricValue: { fontSize: 16, fontWeight: '800', color: '#3B82F6' },
  metricMet: { color: '#16A34A' },
  metricTarget: { fontSize: 12, color: '#9CA3AF' },
  metricCheck: { fontSize: 14, fontWeight: '800' },
  metricCheckMet: { color: '#16A34A' },
  metricCheckNo: { color: '#EF4444' },
  barBg: { height: 12, backgroundColor: '#E5E7EB', borderRadius: 6, overflow: 'hidden', position: 'relative' },
  barFill: { height: '100%', borderRadius: 6 },
  barMarker: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: '#374151' },
  criteriaNote: { fontSize: 11, color: '#9CA3AF', marginTop: 4, lineHeight: 16 },

  // Action buttons
  btn: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginBottom: 10,
    backgroundColor: '#F9FAFB',
  },
  btnGreen:  { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  btnOrange: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
  btnRed:    { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  btnText:   { fontSize: 15, fontWeight: '700', color: '#374151' },
  btnTextWhite: { color: '#FFFFFF' },

  // History
  historyRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  historyLevels: { fontSize: 14, fontWeight: '600', color: '#111827' },
  historyDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  historyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  historyBadgeText: { fontSize: 12, fontWeight: '700' },

  // Empty state
  emptyIcon: { fontSize: 48, textAlign: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
});
