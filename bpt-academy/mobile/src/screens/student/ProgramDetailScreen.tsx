import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator, Image, Dimensions} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Program, Module, StudentProgress, ProgramSession, Division, DIVISION_LABELS, DIVISION_COLORS } from '../../types';
import BackHeader from '../../components/common/BackHeader';
import BackButton from '../../components/common/BackButton';

const DEFAULT_PRICE_GBP = 49.99;

export default function ProgramDetailScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const tabBarPadding = useTabBarPadding();
  const { programId } = route.params;
  const { profile, refreshProfile } = useAuth();

  const [program, setProgram]                     = useState<Program | null>(null);
  const [enrollmentStatus, setEnrollmentStatus]   = useState<string | null>(null);
  const [modules, setModules]                     = useState<(Module & { progress?: StudentProgress })[]>([]);
  const [sessions, setSessions]                   = useState<ProgramSession[]>([]);
  const [coaches, setCoaches]                     = useState<{ id: string; full_name: string; avatar_url?: string }[]>([]);
  const [enrolled, setEnrolled]                   = useState(false);
  const [hasActiveEnrollment, setHasActiveEnrollment] = useState(false);
  const [loading, setLoading]                     = useState(true);
  const [refreshing, setRefreshing]               = useState(false);
  const [waitlistPosition, setWaitlistPosition]   = useState<number | null>(null);
  const [waitlistLoading, setWaitlistLoading]     = useState(false);
  const [enrolledCount, setEnrolledCount]         = useState(0);

  const fetchData = useCallback(async () => {
    const [progRes, modulesRes, sessionsRes, enrollRes, activeEnrollRes, coachRes] = await Promise.all([
      supabase.from('programs').select('*').eq('id', programId).single(),
      supabase.from('modules').select('*').eq('program_id', programId).order('order_index'),
      supabase.from('program_sessions').select('*').eq('program_id', programId).gte('scheduled_at', new Date().toISOString()).order('scheduled_at'),
      supabase.from('enrollments').select('id, status').eq('student_id', profile!.id).eq('program_id', programId).neq('status', 'cancelled').maybeSingle(),
      // Lock enrollment on other programs if student has pending_payment, pending_next_cycle, or active enrollment
      supabase.from('enrollments').select('id').eq('student_id', profile!.id).in('status', ['pending_payment', 'pending_next_cycle', 'active']),
      supabase.from('program_coaches').select('coach:profiles!coach_id(id, full_name, avatar_url)').eq('program_id', programId),
    ]);

    if (progRes.data) setProgram(progRes.data);
    setEnrolled(enrollRes.data?.status === 'active');
    setEnrollmentStatus(enrollRes.data?.status ?? null);
    setHasActiveEnrollment((activeEnrollRes.data?.length ?? 0) > 0);
    if (coachRes.data) setCoaches(coachRes.data.map((r: any) => r.coach).filter(Boolean));

    if (modulesRes.data) {
      const { data: progressData } = await supabase
        .from('student_progress')
        .select('*')
        .eq('student_id', profile!.id)
        .in('module_id', modulesRes.data.map((m) => m.id));

      const progressMap = new Map(progressData?.map((p) => [p.module_id, p]) ?? []);
      setModules(modulesRes.data.map((m) => ({ ...m, progress: progressMap.get(m.id) })));
    }
    if (sessionsRes.data) setSessions(sessionsRes.data);

    // Fetch current enrollment count for this program
    const { count: eCount } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('program_id', programId)
      .eq('status', 'active');
    setEnrolledCount(eCount ?? 0);

    // Fetch waiting list position for this student
    const month = new Date().toISOString().slice(0, 7); // e.g. '2026-04'
    const { data: wlData } = await supabase
      .from('program_waiting_list')
      .select('position')
      .eq('program_id', programId)
      .eq('student_id', profile!.id)
      .eq('month', month)
      .maybeSingle();
    setWaitlistPosition(wlData?.position ?? null);

    setLoading(false);
  }, [programId, profile]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Refresh whenever screen comes back into focus (e.g. returning from Payment)
  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchData);
    return unsub;
  }, [navigation, fetchData]);

  const handleJoinWaitlist = async () => {
    setWaitlistLoading(true);
    const month = new Date().toISOString().slice(0, 7);
    // Get next position
    const { count } = await supabase
      .from('program_waiting_list')
      .select('*', { count: 'exact', head: true })
      .eq('program_id', programId)
      .eq('month', month);
    const position = (count ?? 0) + 1;
    const { error } = await supabase.from('program_waiting_list').insert({
      program_id: programId,
      student_id: profile!.id,
      month,
      position,
    });
    setWaitlistLoading(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setWaitlistPosition(position);
    Alert.alert('✅ Added to Waiting List', `You are #${position} on the waiting list. You will be notified when a spot opens up.`);
  };

  const handleLeaveWaitlist = async () => {
    Alert.alert('Leave Waiting List', 'Are you sure you want to leave the waiting list?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: async () => {
        const month = new Date().toISOString().slice(0, 7);
        await supabase.from('program_waiting_list').delete()
          .eq('program_id', programId).eq('student_id', profile!.id).eq('month', month);
        setWaitlistPosition(null);
      }},
    ]);
  };

  const handleEnrollPress = async () => {
    if (hasActiveEnrollment && !enrolled) {
      Alert.alert(
        'Active Program Running',
        'You are already enrolled in an active program. Complete it before joining a new one.',
        [{ text: 'OK' }],
      );
      return;
    }

    const divKey = ((program as any)?.division ?? 'amateur') as Division;
    const isFree = (program as any)?.price_gbp == null;
    const price  = isFree ? 0 : parseFloat((program as any).price_gbp);

    if (isFree) {
      // Check for existing enrollment (e.g. previously cancelled)
      const { data: existing } = await supabase
        .from('enrollments')
        .select('id, status')
        .eq('student_id', profile!.id)
        .eq('program_id', programId)
        .maybeSingle();

      if (existing) {
        // Reactivate existing row instead of inserting a duplicate
        const { error } = await supabase
          .from('enrollments')
          .update({ status: 'active' })
          .eq('id', existing.id);
        if (error) { Alert.alert('Error', error.message); return; }
      } else {
        const { error } = await supabase.from('enrollments').insert({
          student_id: profile!.id,
          program_id: programId,
          status: 'active',
        });
        if (error) { Alert.alert('Error', error.message); return; }
      }

      // Kick off promotion cycle
      await supabase.rpc('start_promotion_cycle_for_student', {
        p_student_id: profile!.id,
        p_program_id: programId,
      });

      Alert.alert('🎾 Enrolled!', 'You are now enrolled in this program.');
      fetchData();
      return;
    }

    navigation.navigate('Payment', {
      programId,
      studentId: profile!.id,
      amount: price,
      programDivision: divKey,
    });
  };

  const toggleModule = async (module: Module & { progress?: StudentProgress }) => {
    if (!enrolled) { Alert.alert('Not enrolled', 'Enroll in this program to track progress.'); return; }
    const isCompleted = module.progress?.completed ?? false;
    if (module.progress) {
      await supabase.from('student_progress')
        .update({ completed: !isCompleted, completed_at: !isCompleted ? new Date().toISOString() : null })
        .eq('id', module.progress.id);
    } else {
      await supabase.from('student_progress').insert({
        student_id: profile!.id,
        module_id: module.id,
        completed: true,
        completed_at: new Date().toISOString(),
      });
    }
    fetchData();
  };

  const completedCount = modules.filter((m) => m.progress?.completed).length;
  const pct = modules.length > 0 ? Math.round((completedCount / modules.length) * 100) : 0;

  const divisionKey   = ((program as any)?.division ?? 'amateur') as Division;
  const divisionColor = DIVISION_COLORS[divisionKey] ?? '#6B7280';
  const divisionLabel = DIVISION_LABELS[divisionKey] ?? divisionKey;
  const skillSub      = program?.skill_level
    ? ` · ${program.skill_level.charAt(0).toUpperCase() + program.skill_level.slice(1)}`
    : '';

  if (loading) return (
    <View style={styles.loading}>
      <BackButton />

      <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />
<ActivityIndicator size="large" color="#16A34A" /></View>
  );

  if (!program) return (
    <View style={styles.loading}><Text style={{ color: '#6B7280' }}>Program not found.</Text></View>
  );

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: tabBarPadding }}
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }} />}
    >
      <BackHeader title={program.title ?? 'Program'} />

      {/* Hero */}
      <View style={styles.hero}>
        <View style={[styles.levelBadge, { backgroundColor: divisionColor + '30' }]}>
          <Text style={[styles.levelText, { color: divisionColor }]}>{divisionLabel}{skillSub}</Text>
        </View>
        <Text style={styles.title}>{program.title}</Text>
        {program.description && <Text style={styles.description}>{program.description}</Text>}

        {/* Coaches */}
        {coaches.length > 0 && (
          <View style={styles.coachesRow}>
            {coaches.map((c) => (
              <View key={c.id} style={styles.coachChip}>
                <View style={styles.coachAvatar}>
                  <Text style={styles.coachAvatarText}>
                    {c.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </Text>
                </View>
                <Text style={styles.coachName}>{c.full_name}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaValue}>{program.duration_weeks ?? '—'}</Text>
            <Text style={styles.metaLabel}>Weeks</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaValue}>{modules.length}</Text>
            <Text style={styles.metaLabel}>Modules</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaValue}>{sessions.length}</Text>
            <Text style={styles.metaLabel}>Sessions</Text>
          </View>
        </View>
      </View>

      {/* Enroll / Progress / Blocked */}
      {enrolled ? (
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Your Progress</Text>
            <Text style={styles.progressPct}>{pct}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.progressSub}>{completedCount} of {modules.length} modules complete</Text>
        </View>
      ) : enrollmentStatus === 'pending_payment' ? (
        <View style={styles.awaitingCard}>
          <Text style={styles.awaitingIcon}>⏳</Text>
          <Text style={styles.awaitingTitle}>Awaiting Confirmation</Text>
          <Text style={styles.awaitingBody}>
            Your payment is being verified by a coach. You'll be notified once confirmed.
          </Text>
          <View style={styles.awaitingBtn}>
            <Text style={styles.awaitingBtnText}>Awaiting Confirmation…</Text>
          </View>
        </View>
      ) : hasActiveEnrollment ? (
        <View style={styles.blockedCard}>
          <Text style={styles.blockedIcon}>🔒</Text>
          <Text style={styles.blockedTitle}>Program Slot Unavailable</Text>
          <Text style={styles.blockedText}>
            You're already enrolled in an active program. Complete it before joining a new one.
          </Text>
        </View>
      ) : (
        <View style={styles.enrollCard}>
          {(() => {
            const price = (program as any)?.price_gbp != null
              ? parseFloat((program as any).price_gbp)
              : DEFAULT_PRICE_GBP;
            const isFree = (program as any)?.price_gbp == null;
            return (
              <>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Program Fee</Text>
                  <Text style={styles.priceValue}>
                    {isFree ? 'Free' : `£${price.toFixed(2)}`}
                  </Text>
                </View>
                <Text style={styles.enrollText}>
                  {isFree
                    ? 'This program is free. Tap below to enroll instantly.'
                    : 'Payment is required to confirm your enrollment.'}
                </Text>
                <TouchableOpacity style={styles.enrollBtn} onPress={handleEnrollPress}>
                  <Text style={styles.enrollBtnText}>
                    {isFree ? 'Enroll Now — Free' : `Pay & Enroll — £${price.toFixed(2)}`}
                  </Text>
                </TouchableOpacity>
              </>
            );
          })()}
        </View>
      )}

      {/* Waiting List — shown when not enrolled AND program is full */}
      {!enrolled && ((program as any)?.max_students == null || enrolledCount >= ((program as any)?.max_students ?? 0)) && (
        <View style={styles.waitlistCard}>
          {waitlistPosition !== null ? (
            <>
              <Text style={styles.waitlistTitle}>📋 You're on the Waiting List</Text>
              <Text style={styles.waitlistPosition}>Position #{waitlistPosition}</Text>
              <Text style={styles.waitlistSub}>You'll be notified automatically if a spot opens up.</Text>
              <TouchableOpacity style={styles.waitlistLeaveBtn} onPress={handleLeaveWaitlist}>
                <Text style={styles.waitlistLeaveBtnText}>Leave Waiting List</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.waitlistTitle}>Program Full?</Text>
              <Text style={styles.waitlistSub}>Join the waiting list and get priority when a spot opens or a new month starts.</Text>
              <TouchableOpacity
                style={[styles.waitlistJoinBtn, waitlistLoading && { opacity: 0.5 }]}
                onPress={handleJoinWaitlist}
                disabled={waitlistLoading}
              >
                {waitlistLoading
                  ? <ActivityIndicator color="#FFFFFF" />
                  : <Text style={styles.waitlistJoinBtnText}>➕ Join Waiting List</Text>
                }
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Pending next cycle banner */}
      {enrollmentStatus === 'pending_next_cycle' && (
        <View style={styles.pendingCycleBanner}>
          <Text style={styles.pendingCycleIcon}>📅</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.pendingCycleTitle}>You're enrolled for the next cycle</Text>
            <Text style={styles.pendingCycleBody}>
              {(program as any)?.next_cycle_start_date
                ? `Your sessions start on ${new Date((program as any).next_cycle_start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.`
                : 'Your coach will confirm your start date soon.'}
            </Text>
          </View>
        </View>
      )}

      {/* pending_payment state is handled in enroll card block above */}

      {/* Modules */}
      {modules.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📚 Modules</Text>
          {modules.map((m, i) => (
            <TouchableOpacity key={m.id} style={styles.moduleCard} onPress={() => toggleModule(m)}>
              <View style={[styles.moduleCheck, m.progress?.completed && styles.moduleCheckDone]}>
                {m.progress?.completed
                  ? <Text style={styles.checkMark}>✓</Text>
                  : <Text style={styles.moduleNumber}>{i + 1}</Text>
                }
              </View>
              <View style={styles.moduleInfo}>
                <Text style={[styles.moduleName, m.progress?.completed && styles.moduleNameDone]}>{m.title}</Text>
                {m.description && <Text style={styles.moduleDesc} numberOfLines={2}>{m.description}</Text>}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Sessions — only visible to active enrollments */}
      {sessions.length > 0 && enrollmentStatus === 'active' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Upcoming Sessions</Text>
          {sessions.map((s) => (
            <View key={s.id} style={styles.sessionCard}>
              <View style={styles.sessionDate}>
                {s.scheduled_at ? (
                  <>
                    <Text style={styles.sessionDay}>
                      {new Date(s.scheduled_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </Text>
                    <Text style={styles.sessionTime}>
                      {new Date(s.scheduled_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.sessionDay}>TBA</Text>
                )}
              </View>
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionTitle}>{s.title}</Text>
                {s.location && <Text style={styles.sessionLocation}>📍 {s.location}</Text>}
                <Text style={styles.sessionDuration}>⏱ {s.duration_minutes} min</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  container: { flex: 1, backgroundColor: '#0B1628' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B1628' },
  hero: { backgroundColor: 'rgba(17,30,51,0.90)', padding: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  levelBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, marginBottom: 10 },
  levelText: { fontSize: 13, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '700', color: '#F0F6FC', marginBottom: 8 },
  description: { fontSize: 15, color: '#7A8FA6', lineHeight: 22, marginBottom: 16 },
  coachesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  coachChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  coachAvatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center' },
  coachAvatarText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  coachName: { fontSize: 13, fontWeight: '600', color: '#F0F6FC' },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaItem: { flex: 1, alignItems: 'center' },
  metaValue: { fontSize: 20, fontWeight: '700', color: '#F0F6FC' },
  metaLabel: { fontSize: 12, color: '#7A8FA6', marginTop: 2 },
  metaDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.10)' },
  progressCard: { margin: 16, backgroundColor: 'rgba(17,30,51,0.85)', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressLabel: { fontSize: 15, fontWeight: '600', color: '#F0F6FC' },
  progressPct: { fontSize: 15, fontWeight: '700', color: '#16A34A' },
  progressBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 4, marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: '#16A34A', borderRadius: 4 },
  progressSub: { fontSize: 13, color: '#7A8FA6' },
  blockedCard: { margin: 16, backgroundColor: '#FFF7ED', borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#FED7AA' },
  blockedIcon: { fontSize: 36, marginBottom: 10 },
  blockedTitle: { fontSize: 16, fontWeight: '700', color: '#92400E', marginBottom: 6 },
  blockedText: { fontSize: 13, color: '#78350F', textAlign: 'center', lineHeight: 20 },
  awaitingCard: { margin: 16, backgroundColor: 'rgba(245,158,11,0.10)', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: 'rgba(245,158,11,0.35)', alignItems: 'center' },
  awaitingIcon: { fontSize: 36, marginBottom: 8 },
  awaitingTitle: { fontSize: 17, fontWeight: '700', color: '#FCD34D', marginBottom: 6 },
  awaitingBody: { fontSize: 13, color: '#7A8FA6', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  awaitingBtn: { backgroundColor: 'rgba(245,158,11,0.18)', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(245,158,11,0.40)', width: '100%' },
  awaitingBtnText: { color: '#FCD34D', fontWeight: '700', fontSize: 15 },
  enrollCard: { margin: 16, backgroundColor: 'rgba(17,30,51,0.85)', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  priceLabel: { fontSize: 14, color: '#F0F6FC', fontWeight: '600' },
  priceValue: { fontSize: 22, fontWeight: '800', color: '#F0F6FC' },
  enrollText: { fontSize: 13, color: '#7A8FA6', marginBottom: 16, lineHeight: 20 },
  waitlistCard: {
    backgroundColor: '#F0F9FF', borderRadius: 14, padding: 16, margin: 16,
    marginTop: 0, borderWidth: 1, borderColor: '#BAE6FD',
  },
  waitlistTitle: { fontSize: 15, fontWeight: '700', color: '#0369A1', marginBottom: 4 },
  waitlistPosition: { fontSize: 28, fontWeight: '800', color: '#0284C7', marginBottom: 4 },
  waitlistSub: { fontSize: 13, color: '#0369A1', lineHeight: 18, marginBottom: 12 },
  waitlistJoinBtn: {
    backgroundColor: '#0284C7', borderRadius: 10, padding: 14, alignItems: 'center',
  },
  waitlistJoinBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  waitlistLeaveBtn: {
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#FECACA',
  },
  waitlistLeaveBtnText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  enrollBtn: { backgroundColor: '#16A34A', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  enrollBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#F0F6FC', marginBottom: 12 },
  moduleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(17,30,51,0.85)', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', gap: 14 },
  moduleCheck: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.20)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  moduleCheckDone: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  checkMark: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  moduleNumber: { color: '#7A8FA6', fontSize: 13, fontWeight: '600' },
  moduleInfo: { flex: 1 },
  moduleName: { fontSize: 15, fontWeight: '600', color: '#F0F6FC' },
  moduleNameDone: { color: '#4B5563', textDecorationLine: 'line-through' },
  moduleDesc: { fontSize: 13, color: '#7A8FA6', marginTop: 3 },
  sessionCard: { flexDirection: 'row', backgroundColor: 'rgba(17,30,51,0.85)', borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', overflow: 'hidden' },
  sessionDate: { width: 70, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center', padding: 12 },
  sessionDay: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, textAlign: 'center' },
  sessionTime: { color: '#DCFCE7', fontSize: 12, marginTop: 2 },
  sessionInfo: { flex: 1, padding: 14 },
  sessionTitle: { fontSize: 15, fontWeight: '600', color: '#F0F6FC', marginBottom: 4 },
  sessionLocation: { fontSize: 13, color: '#7A8FA6', marginBottom: 2 },
  sessionDuration: { fontSize: 13, color: '#7A8FA6' },
  pendingCycleBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, margin: 16, backgroundColor: 'rgba(59,130,246,0.12)', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(59,130,246,0.30)' },
  pendingPaymentBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, margin: 16, backgroundColor: 'rgba(245,158,11,0.12)', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(245,158,11,0.30)' },
  pendingCycleIcon: { fontSize: 28 },
  pendingCycleTitle: { fontSize: 15, fontWeight: '700', color: '#F0F6FC', marginBottom: 4 },
  pendingCycleBody: { fontSize: 13, color: '#7A8FA6', lineHeight: 18 },
});
