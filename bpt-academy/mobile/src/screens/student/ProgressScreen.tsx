import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, Image, Dimensions} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
  Enrollment, Module, StudentProgress, PromotionCycle,
  DIVISION_COLORS, DIVISION_LABELS, LEVEL_LABELS, Division,
} from '../../types';
import ScreenHeader from '../../components/common/ScreenHeader';

// ─── Goal types ───────────────────────────────────────────────
type GoalCategory = 'technical' | 'tactical' | 'physical' | 'mindset';
type GoalStatus   = 'active' | 'in_progress' | 'achieved';

interface StudentGoalItem {
  id: string;
  category: GoalCategory;
  title: string;
  status: GoalStatus;
  achieved_at: string | null;
}

const GOAL_CATEGORIES: { key: GoalCategory; label: string; emoji: string; color: string }[] = [
  { key: 'technical', label: 'Technical',  emoji: '🎯', color: '#2563EB' },
  { key: 'tactical',  label: 'Tactical',   emoji: '🧠', color: '#7C3AED' },
  { key: 'physical',  label: 'Physical',   emoji: '💪', color: '#EA580C' },
  { key: 'mindset',   label: 'Mindset',    emoji: '🧘', color: '#0891B2' },
];

const GOAL_STATUSES: Record<GoalStatus, { label: string; color: string; bg: string }> = {
  active:      { label: 'Active',       color: '#2563EB', bg: '#EFF6FF' },
  in_progress: { label: 'In Progress',  color: '#D97706', bg: '#FFF7ED' },
  achieved:    { label: 'Achieved ✓',   color: '#16A34A', bg: '#ECFDF5' },
};

// ─── Types ────────────────────────────────────────────────────

interface ProgramWithProgress extends Enrollment {
  modules: (Module & { progress?: StudentProgress })[];
  completedCount: number;
  totalCount: number;
}

interface AttendanceStat {
  attended: number;
  total: number;
  pct: number;
}

interface Badge {
  id: string;
  emoji: string;
  label: string;
  description: string;
  earned: boolean;
}

type Tab = 'overview' | 'attendance' | 'badges' | 'goals';

// ─── Journey path ─────────────────────────────────────────────
const JOURNEY = [
  { key: 'amateur_beginner', label: 'Beginner', division: 'amateur' as Division },
  { key: 'amateur_intermediate', label: 'Intermediate', division: 'amateur' as Division },
  { key: 'amateur_advanced', label: 'Advanced', division: 'amateur' as Division },
  { key: 'semi_pro', label: 'Semi-Pro', division: 'semi_pro' as Division },
  { key: 'pro', label: 'Pro', division: 'pro' as Division },
];

function getCurrentLevelKey(division?: Division, skillLevel?: string): string {
  if (division === 'semi_pro') return 'semi_pro';
  if (division === 'pro') return 'pro';
  if (division === 'amateur') {
    if (skillLevel === 'intermediate') return 'amateur_intermediate';
    if (skillLevel === 'advanced') return 'amateur_advanced';
    return 'amateur_beginner';
  }
  return 'amateur_beginner';
}

// ─── Main Component ───────────────────────────────────────────
export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const tabBarPadding = useTabBarPadding();
  const { profile, refreshProfile } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [refreshing, setRefreshing] = useState(false);

  // Overview state
  const [programs, setPrograms] = useState<ProgramWithProgress[]>([]);

  // Attendance state
  const [cycle, setCycle] = useState<PromotionCycle | null>(null);
  const [attendanceStat, setAttendanceStat] = useState<AttendanceStat>({ attended: 0, total: 0, pct: 0 });
  const [cycleLoading, setCycleLoading] = useState(true);

  // Badges state
  const [badges, setBadges] = useState<Badge[]>([]);
  const [badgesLoading, setBadgesLoading] = useState(true);

  // Module detail modal
  const [selectedModule, setSelectedModule] = useState<(Module & { progress?: StudentProgress }) | null>(null);

  // Goals state
  const [goals, setGoals] = useState<StudentGoalItem[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(false);

  // ── Fetch overview data ──────────────────────────────────────
  const fetchOverview = useCallback(async () => {
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
  }, [profile?.id, profile?.division, profile?.skill_level]);

  // ── Fetch promotion cycle & attendance ───────────────────────
  const fetchCycle = useCallback(async () => {
    if (!profile) { setCycleLoading(false); return; }
    setCycleLoading(true);

    const { data: cycleData } = await supabase
      .from('promotion_cycles')
      .select('*')
      .eq('student_id', profile.id)
      .in('status', ['active', 'eligible', 'approved'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!cycleData) {
      setCycle(null);
      setAttendanceStat({ attended: 0, total: 0, pct: 0 });
      setCycleLoading(false);
      return;
    }

    setCycle(cycleData as PromotionCycle);

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('program_id')
      .eq('student_id', profile.id)
      .eq('status', 'active');

    const programIds = (enrollments ?? []).map((e: { program_id: string }) => e.program_id);

    if (programIds.length === 0) {
      setAttendanceStat({ attended: 0, total: 0, pct: 0 });
      setCycleLoading(false);
      return;
    }

    const { count: totalCount } = await supabase
      .from('program_sessions')
      .select('*', { count: 'exact', head: true })
      .in('program_id', programIds)
      .gte('scheduled_at', cycleData.cycle_start_date)
      .lte('scheduled_at', cycleData.cycle_end_date);

    const { data: sessionIds } = await supabase
      .from('program_sessions')
      .select('id')
      .in('program_id', programIds)
      .gte('scheduled_at', cycleData.cycle_start_date)
      .lte('scheduled_at', cycleData.cycle_end_date);

    const ids = (sessionIds ?? []).map((s: { id: string }) => s.id);
    let attendedCount = 0;

    if (ids.length > 0) {
      const { count } = await supabase
        .from('session_attendance')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', profile.id)
        .eq('attended', true)
        .in('session_id', ids);
      attendedCount = count ?? 0;
    }

    const total = totalCount ?? 0;
    const pct = total > 0 ? Math.round((attendedCount / total) * 100) : 0;
    setAttendanceStat({ attended: attendedCount, total, pct });
    setCycleLoading(false);
  }, [profile?.id]);

  // ── Fetch badges ─────────────────────────────────────────────
  const fetchBadges = useCallback(async () => {
    if (!profile) return;
    setBadgesLoading(true);

    const { count: totalAttended } = await supabase
      .from('session_attendance')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', profile.id)
      .eq('attended', true);

    const { data: tournamentEvents } = await supabase
      .from('ranking_events')
      .select('id')
      .eq('student_id', profile.id)
      .ilike('reason', '%tournament%')
      .limit(1);

    const joinedAt = new Date(profile.created_at);
    const now = new Date();
    const daysSinceJoin = Math.floor((now.getTime() - joinedAt.getTime()) / (1000 * 60 * 60 * 24));

    const { data: promotedCycles } = await supabase
      .from('promotion_cycles')
      .select('id')
      .eq('student_id', profile.id)
      .in('status', ['eligible', 'approved', 'promoted'])
      .limit(1);

    const attended = totalAttended ?? 0;
    const hasTournamentPodium = (tournamentEvents ?? []).length > 0;
    const hasPromoReady = (promotedCycles ?? []).length > 0;

    setBadges([
      {
        id: 'first_session',
        emoji: '🎾',
        label: 'First Session',
        description: 'Attended your first training session',
        earned: attended >= 1,
      },
      {
        id: 'on_fire',
        emoji: '🔥',
        label: 'On Fire',
        description: 'Attended 5 or more sessions',
        earned: attended >= 5,
      },
      {
        id: 'month_one',
        emoji: '📅',
        label: 'Month One',
        description: 'Completed your first month at the academy',
        earned: daysSinceJoin >= 30,
      },
      {
        id: 'halfway',
        emoji: '⭐',
        label: '50% There',
        description: 'Reached 50% attendance in a promotion cycle',
        earned: attendanceStat.pct >= 50,
      },
      {
        id: 'promotion_ready',
        emoji: '🏆',
        label: 'Promotion Ready',
        description: 'Achieved 80% attendance in a cycle',
        earned: hasPromoReady,
      },
      {
        id: 'tournament_podium',
        emoji: '🥇',
        label: 'Tournament Podium',
        description: 'Placed in the top 3 at a BPT tournament',
        earned: hasTournamentPodium,
      },
    ]);

    setBadgesLoading(false);
  }, [profile?.id, attendanceStat.pct]);

  const fetchGoals = useCallback(async () => {
    if (!profile) return;
    setGoalsLoading(true);
    const { data } = await supabase
      .from('student_goals')
      .select('id, category, title, status, achieved_at')
      .eq('student_id', profile.id)
      .order('category')
      .order('created_at');
    setGoals((data ?? []) as StudentGoalItem[]);
    setGoalsLoading(false);
  }, [profile?.id]);

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchOverview(), fetchCycle()]);
  }, [fetchOverview, fetchCycle]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { if (tab === 'badges') fetchBadges(); }, [tab, fetchBadges]);
  useEffect(() => { if (tab === 'goals') fetchGoals(); }, [tab, fetchGoals]);

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [refreshProfile])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    if (tab === 'badges') await fetchBadges();
    if (tab === 'goals') await fetchGoals();
    setRefreshing(false);
  };

  // ── Derived values ───────────────────────────────────────────
  const overallCompleted = programs.reduce((a, p) => a + p.completedCount, 0);
  const overallTotal = programs.reduce((a, p) => a + p.totalCount, 0);
  const overallPct = overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0;

  const currentLevelKey = getCurrentLevelKey(profile?.division, profile?.skill_level);
  const divColor = profile?.division ? DIVISION_COLORS[profile.division] : '#3B82F6';

  const daysLeft = cycle
    ? Math.max(0, Math.ceil((new Date(cycle.cycle_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const sessionsNeeded = cycle
    ? Math.max(0, Math.ceil((cycle.required_attendance_pct / 100) * attendanceStat.total) - attendanceStat.attended)
    : 0;

  // ─── Render ──────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />

      <ScreenHeader title="My Progress" />

      {/* Tab bar */}
      <View style={styles.tabs}>
        {(['overview', 'attendance', 'goals', 'badges'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && { borderBottomColor: divColor }]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && { color: divColor }]} numberOfLines={1}>
              {t === 'overview' ? '📊 Overview'
                : t === 'attendance' ? '📅 Promotion'
                : t === 'goals' ? '🎯 My Goals'
                : '🏅 Badges'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarPadding }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >

        {/* ── OVERVIEW TAB ─────────────────────────────────── */}
        {tab === 'overview' && (
          <>
            {/* Current level card */}
            <View style={[styles.levelCard, { backgroundColor: divColor }]}>
              <Text style={styles.levelLabel}>Current Level</Text>
              <Text style={styles.levelValue}>
                {LEVEL_LABELS[currentLevelKey] ?? (profile?.division ? DIVISION_LABELS[profile.division] : 'Not set')}
              </Text>
              {profile?.ranking_points != null && profile.ranking_points > 0 && (
                <Text style={styles.levelPoints}>{profile.ranking_points} ranking points</Text>
              )}
            </View>

            {/* Journey path */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Your Journey</Text>
              <View style={styles.journeyPath}>
                {JOURNEY.map((step, idx) => {
                  const isCurrent = step.key === currentLevelKey;
                  const isPast = JOURNEY.findIndex((j) => j.key === currentLevelKey) > idx;
                  const color = DIVISION_COLORS[step.division];
                  return (
                    <React.Fragment key={step.key}>
                      <View style={styles.journeyStep}>
                        <View style={[
                          styles.journeyDot,
                          isPast && { backgroundColor: '#16A34A', borderColor: '#16A34A' },
                          isCurrent && { backgroundColor: color, borderColor: color, transform: [{ scale: 1.25 }] },
                        ]}>
                          {isPast && <Text style={styles.journeyCheck}>✓</Text>}
                          {isCurrent && <Text style={styles.journeyDotInner}>●</Text>}
                        </View>
                        <Text style={[
                          styles.journeyLabel,
                          isCurrent && { color: color, fontWeight: '700' },
                          isPast && { color: '#16A34A' },
                        ]}>
                          {step.label}
                        </Text>
                      </View>
                      {idx < JOURNEY.length - 1 && (
                        <View style={[styles.journeyLine, isPast && { backgroundColor: '#16A34A' }]} />
                      )}
                    </React.Fragment>
                  );
                })}
              </View>
            </View>

            {/* Module completion */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Program Completion</Text>
              <View style={styles.overallRow}>
                <Text style={styles.overallPct}>{overallPct}%</Text>
                <Text style={styles.overallSub}>{overallCompleted}/{overallTotal} modules</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${overallPct}%`, backgroundColor: divColor }]} />
              </View>
              {programs.map((p) => {
                const pct = p.totalCount > 0 ? Math.round((p.completedCount / p.totalCount) * 100) : 0;
                return (
                  <View key={p.id} style={styles.programRow}>
                    <View style={styles.programRowTop}>
                      <Text style={styles.programTitle} numberOfLines={1}>{(p.program as any)?.title}</Text>
                      <Text style={[styles.programPct, { color: divColor }]}>{pct}%</Text>
                    </View>
                    <View style={styles.miniBar}>
                      <View style={[styles.miniBarFill, { width: `${pct}%`, backgroundColor: divColor }]} />
                    </View>
                    <Text style={styles.miniCount}>{p.completedCount}/{p.totalCount} modules</Text>
                    <View style={styles.moduleList}>
                      {p.modules.map((mod, idx) => {
                        const done = !!mod.progress?.completed;
                        const hasDesc = !!mod.description;
                        return (
                          <TouchableOpacity
                            key={mod.id}
                            style={[styles.moduleRow, done && styles.moduleRowDone]}
                            onPress={() => setSelectedModule(mod)}
                            activeOpacity={hasDesc || done ? 0.7 : 1}
                          >
                            <View style={[styles.moduleDot, done && { backgroundColor: divColor, borderColor: divColor }]}>
                              {done
                                ? <Text style={styles.moduleDotCheck}>✓</Text>
                                : <Text style={styles.moduleDotNum}>{idx + 1}</Text>
                              }
                            </View>
                            <Text style={[styles.moduleRowTitle, done && { color: '#16A34A' }]} numberOfLines={1}>
                              {mod.title}
                            </Text>
                            {hasDesc && <Text style={styles.moduleInfoIcon}>ℹ️</Text>}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
              {programs.length === 0 && (
                <Text style={styles.emptyNote}>Enroll in a program to see completion stats.</Text>
              )}
            </View>
          </>
        )}

        {/* ── PROMOTION TAB ────────────────────────────────── */}
        {tab === 'attendance' && (
          <>
            {cycleLoading ? (
              <ActivityIndicator size="large" color={divColor} style={styles.loader} />
            ) : !cycle ? (
              <View style={styles.emptyCard}>
                {profile?.division === 'pro' ? (
                  <>
                    <Text style={styles.emptyIcon}>🏆</Text>
                    <Text style={styles.emptyTitle}>You're at the top!</Text>
                    <Text style={styles.emptyNote}>
                      You're in the Pro Division — the highest level at BPT Academy. Keep training and competing to maintain your ranking.
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.emptyIcon}>🎯</Text>
                    <Text style={styles.emptyTitle}>No Active Promotion Cycle</Text>
                    <Text style={styles.emptyNote}>
                      Ask your coach to start your promotion cycle. Once started, your progress will appear here automatically.
                    </Text>
                  </>
                )}
              </View>
            ) : (
              <>
                {cycle.status === 'eligible' && (
                  <View style={styles.promoAlertEligible}>
                    <Text style={styles.promoAlertIcon}>⭐</Text>
                    <View style={styles.promoAlertBody}>
                      <Text style={styles.promoAlertTitle}>You're eligible for promotion!</Text>
                      <Text style={styles.promoAlertSub}>
                        {cycle.requires_coach_approval
                          ? 'Your coach is reviewing your progress. You\'ll be notified once approved.'
                          : 'Great work — your promotion is being processed!'}
                      </Text>
                    </View>
                  </View>
                )}
                {cycle.status === 'approved' && (
                  <View style={styles.promoAlertApproved}>
                    <Text style={styles.promoAlertIcon}>🎉</Text>
                    <View style={styles.promoAlertBody}>
                      <Text style={styles.promoAlertTitle}>Promotion approved!</Text>
                      <Text style={styles.promoAlertSub}>
                        Your coach has signed off. You'll be moved to {LEVEL_LABELS[cycle.to_level] ?? cycle.to_level} shortly.
                      </Text>
                    </View>
                  </View>
                )}
                {cycle.status === 'active' && (
                  <View style={[styles.promoAlertActive, { borderColor: divColor }]}>
                    <Text style={styles.promoAlertIcon}>💪</Text>
                    <View style={styles.promoAlertBody}>
                      <Text style={[styles.promoAlertTitle, { color: divColor }]}>Keep going!</Text>
                      <Text style={styles.promoAlertSub}>
                        Hit all three targets below to become eligible for promotion.
                      </Text>
                    </View>
                  </View>
                )}

                <View style={[styles.cycleCard, { borderColor: divColor }]}>
                  <View style={styles.cycleHeader}>
                    <View style={styles.cycleLevels}>
                      <Text style={styles.cycleFromLabel}>Current Level</Text>
                      <Text style={styles.cycleFrom}>{LEVEL_LABELS[cycle.from_level] ?? cycle.from_level}</Text>
                      <Text style={styles.cycleArrow}>↓</Text>
                      <Text style={styles.cycleToLabel}>Promoting To</Text>
                      <Text style={[styles.cycleTo, { color: divColor }]}>{LEVEL_LABELS[cycle.to_level] ?? cycle.to_level}</Text>
                    </View>
                    <View style={styles.cycleDays}>
                      <Text style={styles.cycleDaysLabel}>Started</Text>
                      <Text style={styles.cycleDaysNum}>
                        {Math.floor((Date.now() - new Date(cycle.cycle_start_date).getTime()) / (1000 * 60 * 60 * 24))}
                      </Text>
                      <Text style={styles.cycleDaysLabel}>days ago</Text>
                    </View>
                  </View>
                  <Text style={styles.cycleDates}>
                    Started {new Date(cycle.cycle_start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                  {cycle.requires_coach_approval && (
                    <View style={styles.approvalNote}>
                      <Text style={styles.approvalNoteText}>🔐 Coach approval required for this promotion</Text>
                    </View>
                  )}
                </View>

                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Promotion Criteria</Text>
                  <Text style={styles.criteriaSubtitle}>All three must reach 100% to become eligible</Text>

                  {(() => {
                    const val = cycle.active_weeks_so_far ?? 0;
                    const target = cycle.min_active_weeks ?? 8;
                    const pct = Math.min(100, Math.round((val / target) * 100));
                    const met = val >= target;
                    return (
                      <View style={styles.criterionBlock}>
                        <View style={styles.criterionHeader}>
                          <View style={styles.criterionLabelRow}>
                            <Text style={styles.criterionEmoji}>⏱</Text>
                            <View>
                              <Text style={styles.criterionLabel}>Active Weeks</Text>
                              <Text style={styles.criterionHint}>Only weeks you attended count</Text>
                            </View>
                          </View>
                          <View style={styles.criterionValueRow}>
                            <Text style={[styles.criterionValue, met && styles.criterionValueMet]}>
                              {val}<Text style={styles.criterionTarget}>/{target} wks</Text>
                            </Text>
                            <Text style={[styles.criterionCheck, met ? styles.checkMet : styles.checkNo]}>
                              {met ? '✓' : '✗'}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.criterionBarBg}>
                          <View style={[styles.criterionBarFill, { width: `${pct}%`, backgroundColor: met ? '#16A34A' : divColor }]} />
                          <View style={styles.criterionMarker} />
                        </View>
                      </View>
                    );
                  })()}

                  {(() => {
                    const val = cycle.attendance_pct ?? 0;
                    const met = val >= 80;
                    return (
                      <View style={styles.criterionBlock}>
                        <View style={styles.criterionHeader}>
                          <View style={styles.criterionLabelRow}>
                            <Text style={styles.criterionEmoji}>📅</Text>
                            <View>
                              <Text style={styles.criterionLabel}>Session Attendance</Text>
                              <Text style={styles.criterionHint}>Sessions attended vs scheduled</Text>
                            </View>
                          </View>
                          <View style={styles.criterionValueRow}>
                            <Text style={[styles.criterionValue, met && styles.criterionValueMet]}>
                              {val}<Text style={styles.criterionTarget}>/80%</Text>
                            </Text>
                            <Text style={[styles.criterionCheck, met ? styles.checkMet : styles.checkNo]}>
                              {met ? '✓' : '✗'}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.criterionBarBg}>
                          <View style={[styles.criterionBarFill, { width: `${Math.min(100, val)}%`, backgroundColor: met ? '#16A34A' : divColor }]} />
                          <View style={styles.criterionMarker} />
                        </View>
                      </View>
                    );
                  })()}

                  {(() => {
                    const val = cycle.performance_pct ?? 0;
                    const met = val >= 80;
                    return (
                      <View style={styles.criterionBlock}>
                        <View style={styles.criterionHeader}>
                          <View style={styles.criterionLabelRow}>
                            <Text style={styles.criterionEmoji}>📊</Text>
                            <View>
                              <Text style={styles.criterionLabel}>Performance Score</Text>
                              <Text style={styles.criterionHint}>Avg module score in your program</Text>
                            </View>
                          </View>
                          <View style={styles.criterionValueRow}>
                            <Text style={[styles.criterionValue, met && styles.criterionValueMet]}>
                              {val}<Text style={styles.criterionTarget}>/80%</Text>
                            </Text>
                            <Text style={[styles.criterionCheck, met ? styles.checkMet : styles.checkNo]}>
                              {met ? '✓' : '✗'}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.criterionBarBg}>
                          <View style={[styles.criterionBarFill, { width: `${Math.min(100, val)}%`, backgroundColor: met ? '#16A34A' : divColor }]} />
                          <View style={styles.criterionMarker} />
                        </View>
                      </View>
                    );
                  })()}

                  {cycle.last_evaluated_at && (
                    <Text style={styles.lastUpdated}>
                      Last updated {new Date(cycle.last_evaluated_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </Text>
                  )}
                </View>

                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>What Happens Next?</Text>
                  {[
                    {
                      done: (cycle.active_weeks_so_far ?? 0) >= (cycle.min_active_weeks ?? 8)
                        && (cycle.attendance_pct ?? 0) >= 80
                        && (cycle.performance_pct ?? 0) >= 80,
                      icon: '⭐', text: 'You\'re flagged as eligible — your coach is notified',
                    },
                    {
                      done: cycle.status === 'approved' || cycle.status === 'promoted',
                      icon: '✅', text: cycle.requires_coach_approval
                        ? 'Your coach reviews and approves your promotion'
                        : 'Promotion is applied automatically',
                    },
                    {
                      done: cycle.status === 'promoted',
                      icon: '🚀', text: `You move up to ${LEVEL_LABELS[cycle.to_level] ?? cycle.to_level} and earn 50 ranking points`,
                    },
                  ].map((step, i) => (
                    <View key={i} style={styles.nextStep}>
                      <View style={[styles.nextStepDot, step.done && styles.nextStepDotDone]}>
                        <Text style={styles.nextStepDotText}>{step.done ? '✓' : (i + 1).toString()}</Text>
                      </View>
                      <Text style={[styles.nextStepText, step.done && styles.nextStepTextDone]}>
                        {step.icon} {step.text}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {/* ── MY GOALS TAB ─────────────────────────────────── */}
        {tab === 'goals' && (
          <>
            {goalsLoading ? (
              <ActivityIndicator size="large" color={divColor} style={styles.loader} />
            ) : goals.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>🎯</Text>
                <Text style={styles.emptyTitle}>No goals yet</Text>
                <Text style={styles.emptyNote}>
                  Your coach will set personalised development goals for you here. Check back after your next session!
                </Text>
              </View>
            ) : (
              <>
                {goals.filter((g) => g.status === 'achieved').length > 0 && (
                  <View style={[styles.goalsBanner, { backgroundColor: divColor }]}>
                    <Text style={styles.goalsBannerNum}>
                      {goals.filter((g) => g.status === 'achieved').length}
                    </Text>
                    <Text style={styles.goalsBannerLabel}>
                      goal{goals.filter((g) => g.status === 'achieved').length !== 1 ? 's' : ''} achieved 🏆
                    </Text>
                  </View>
                )}
                {GOAL_CATEGORIES.map(({ key, label, emoji, color }) => {
                  const catGoals = goals.filter((g) => g.category === key);
                  if (catGoals.length === 0) return null;
                  return (
                    <View key={key} style={styles.goalSection}>
                      <Text style={[styles.goalSectionTitle, { color }]}>{emoji} {label}</Text>
                      {catGoals.map((goal) => {
                        const st = GOAL_STATUSES[goal.status];
                        return (
                          <View
                            key={goal.id}
                            style={[styles.goalRow, goal.status === 'achieved' && styles.goalRowAchieved]}
                          >
                            <View style={[styles.goalDot, { backgroundColor: st.color }]} />
                            <View style={styles.goalRowContent}>
                              <Text style={[
                                styles.goalRowTitle,
                                goal.status === 'achieved' && { textDecorationLine: 'line-through', color: '#16A34A' },
                              ]}>
                                {goal.title}
                              </Text>
                              {goal.achieved_at && (
                                <Text style={styles.goalRowDate}>
                                  Achieved {new Date(goal.achieved_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </Text>
                              )}
                            </View>
                            <View style={[styles.goalRowBadge, { backgroundColor: st.bg }]}>
                              <Text style={[styles.goalRowBadgeText, { color: st.color }]}>{st.label}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
              </>
            )}
          </>
        )}

        {/* ── BADGES TAB ───────────────────────────────────── */}
        {tab === 'badges' && (
          <>
            {badgesLoading ? (
              <ActivityIndicator size="large" color={divColor} style={styles.loader} />
            ) : (
              <View style={styles.badgesGrid}>
                {badges.map((badge) => (
                  <View
                    key={badge.id}
                    style={[styles.badgeCard, !badge.earned && styles.badgeCardLocked]}
                  >
                    <Text style={[styles.badgeEmoji, !badge.earned && styles.badgeEmojiLocked]}>
                      {badge.earned ? badge.emoji : '🔒'}
                    </Text>
                    <Text style={[styles.badgeLabel, !badge.earned && styles.badgeLabelLocked]}>
                      {badge.label}
                    </Text>
                    <Text style={styles.badgeDesc} numberOfLines={2}>
                      {badge.description}
                    </Text>
                    {badge.earned && (
                      <View style={[styles.badgeEarnedDot, { backgroundColor: divColor }]} />
                    )}
                  </View>
                ))}
              </View>
            )}
          </>
        )}

      </ScrollView>

      {/* Module detail modal */}
      <Modal
        visible={!!selectedModule}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedModule(null)}
      >
        <View style={styles.modModal}>
          <View style={styles.modModalHeader}>
            <View style={styles.modModalHandle} />
          </View>
          <ScrollView style={styles.modModalBody} showsVerticalScrollIndicator={false}>
            {selectedModule && (
              <>
                <View style={styles.modStatusRow}>
                  {selectedModule.progress?.completed ? (
                    <View style={[styles.modStatusBadge, { backgroundColor: '#DCFCE7' }]}>
                      <Text style={[styles.modStatusText, { color: '#16A34A' }]}>✓ Completed</Text>
                    </View>
                  ) : (
                    <View style={[styles.modStatusBadge, { backgroundColor: '#F3F4F6' }]}>
                      <Text style={[styles.modStatusText, { color: '#6B7280' }]}>Not completed yet</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.modTitle}>{selectedModule.title}</Text>
                {selectedModule.description ? (
                  <>
                    <Text style={styles.modSectionLabel}>SESSION GOAL</Text>
                    <Text style={styles.modDescription}>{selectedModule.description}</Text>
                  </>
                ) : (
                  <View style={styles.modNoDesc}>
                    <Text style={styles.modNoDescIcon}>📋</Text>
                    <Text style={styles.modNoDescText}>
                      Your coach hasn't added a description for this session yet.
                    </Text>
                  </View>
                )}
                {selectedModule.progress?.completed_at && (
                  <View style={styles.modCompletedAt}>
                    <Text style={styles.modCompletedAtText}>
                      ✅ Completed on {new Date(selectedModule.progress.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
          <TouchableOpacity
            style={[styles.modCloseBtn, { backgroundColor: divColor }]}
            onPress={() => setSelectedModule(null)}
          >
            <Text style={styles.modCloseBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  tabs: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1, paddingVertical: 11, alignItems: 'center', justifyContent: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
    paddingHorizontal: 4,
  },
  tabText: { fontSize: 11, fontWeight: '700', color: '#6B7280', textAlign: 'center' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 72 },
  loader: { marginTop: 60 },

  levelCard: { borderRadius: 16, padding: 24, marginBottom: 14, alignItems: 'center' },
  levelLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  levelValue: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', marginTop: 6, textAlign: 'center' },
  levelPoints: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 4 },

  sectionCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#F0F6FC', marginBottom: 14 },

  journeyPath: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'nowrap' },
  journeyStep: { alignItems: 'center', width: 56 },
  journeyDot: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: '#D1D5DB', backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  journeyCheck: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  journeyDotInner: { color: '#FFFFFF', fontSize: 10 },
  journeyLine: { flex: 1, height: 2, backgroundColor: '#E5E7EB', marginBottom: 20 },
  journeyLabel: { fontSize: 10, fontWeight: '600', color: '#9CA3AF', textAlign: 'center' },

  overallRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 8 },
  overallPct: { fontSize: 36, fontWeight: '800', color: '#111827' },
  overallSub: { fontSize: 14, color: '#6B7280' },
  progressBar: { height: 10, backgroundColor: '#E5E7EB', borderRadius: 5, marginBottom: 16 },
  progressFill: { height: '100%', borderRadius: 5 },
  programRow: { marginBottom: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  programRowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  programTitle: { fontSize: 14, fontWeight: '600', color: '#374151', flex: 1, marginRight: 8 },
  programPct: { fontSize: 14, fontWeight: '700' },
  miniBar: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, marginBottom: 4 },
  miniBarFill: { height: '100%', borderRadius: 3 },
  miniCount: { fontSize: 11, color: '#9CA3AF' },
  emptyNote: { color: '#9CA3AF', fontSize: 13, textAlign: 'center', paddingVertical: 20 },

  cycleCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    marginBottom: 14, borderWidth: 2,
  },
  cycleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cycleFrom: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  cycleArrow: { fontSize: 18, color: '#D1D5DB', marginVertical: 2 },
  cycleTo: { fontSize: 18, fontWeight: '800' },
  cycleDays: { alignItems: 'center' },
  cycleDaysNum: { fontSize: 32, fontWeight: '800', color: '#111827' },
  cycleDaysLabel: { fontSize: 11, color: '#9CA3AF' },
  cycleDates: { fontSize: 12, color: '#9CA3AF' },

  attRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 },
  attPct: { fontSize: 42, fontWeight: '800' },
  attTarget: { fontSize: 13, color: '#6B7280' },
  attBarBg: { height: 16, backgroundColor: '#E5E7EB', borderRadius: 8, marginBottom: 16, overflow: 'hidden', position: 'relative' },
  attBarFill: { height: '100%', borderRadius: 8 },
  attMarkerLabel: { fontSize: 11, color: '#6B7280', textAlign: 'right', marginTop: 2, marginBottom: 8 },
  attStats: { flexDirection: 'row', justifyContent: 'space-around' },
  attStat: { alignItems: 'center' },
  attStatNum: { fontSize: 22, fontWeight: '800', color: '#111827' },
  attStatLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

  statusBanner: {
    borderRadius: 12, padding: 14, marginBottom: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  statusBannerIcon: { fontSize: 24 },
  statusBannerText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#374151' },

  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 40,
    alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', marginTop: 20,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#F0F6FC', marginBottom: 6 },

  goalsBanner: {
    borderRadius: 14, padding: 16, marginBottom: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  goalsBannerNum: { fontSize: 32, fontWeight: '800', color: '#FFFFFF' },
  goalsBannerLabel: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
  goalSection: { marginBottom: 16 },
  goalSectionTitle: {
    fontSize: 13, fontWeight: '800', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 8,
  },
  goalRow: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 6,
    borderWidth: 1, borderColor: '#E5E7EB',
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  goalRowAchieved: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  goalDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  goalRowContent: { flex: 1 },
  goalRowTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  goalRowDate: { fontSize: 11, color: '#16A34A', marginTop: 2 },
  goalRowBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, flexShrink: 0 },
  goalRowBadgeText: { fontSize: 11, fontWeight: '700' },

  moduleList: { marginTop: 10, gap: 6 },
  moduleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, paddingHorizontal: 10,
    backgroundColor: '#F9FAFB', borderRadius: 8,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  moduleRowDone: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  moduleDot: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  moduleDotCheck: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  moduleDotNum: { color: '#9CA3AF', fontSize: 10, fontWeight: '700' },
  moduleRowTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: '#374151' },
  moduleInfoIcon: { fontSize: 14 },

  modModal: { flex: 1, backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modModalHeader: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  modModalHandle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2 },
  modModalBody: { flex: 1, padding: 24 },
  modStatusRow: { marginBottom: 14 },
  modStatusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  modStatusText: { fontSize: 13, fontWeight: '700' },
  modTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 20 },
  modSectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#6B7280',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10,
  },
  modDescription: { fontSize: 16, color: '#374151', lineHeight: 26 },
  modNoDesc: { alignItems: 'center', paddingVertical: 30 },
  modNoDescIcon: { fontSize: 36, marginBottom: 12 },
  modNoDescText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 22 },
  modCompletedAt: {
    marginTop: 24, backgroundColor: '#F0FDF4', borderRadius: 10,
    padding: 14, borderWidth: 1, borderColor: '#BBF7D0',
  },
  modCompletedAtText: { fontSize: 13, color: '#16A34A', fontWeight: '600' },
  modCloseBtn: { margin: 20, borderRadius: 14, padding: 16, alignItems: 'center' },
  modCloseBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  badgeCard: {
    width: '47%', backgroundColor: '#FFFFFF', borderRadius: 14,
    padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB',
    position: 'relative',
  },
  badgeCardLocked: { backgroundColor: '#F9FAFB', borderColor: '#F3F4F6' },
  badgeEmoji: { fontSize: 32, marginBottom: 8 },
  badgeEmojiLocked: { opacity: 0.4 },
  badgeLabel: { fontSize: 13, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 4 },
  badgeLabelLocked: { color: '#9CA3AF' },
  badgeDesc: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 15 },
  badgeEarnedDot: {
    position: 'absolute', top: 10, right: 10,
    width: 8, height: 8, borderRadius: 4,
  },

  promoAlertEligible: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#FEF9C3', borderRadius: 14, padding: 14,
    marginBottom: 14, borderWidth: 1, borderColor: '#FDE68A',
  },
  promoAlertApproved: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#DCFCE7', borderRadius: 14, padding: 14,
    marginBottom: 14, borderWidth: 1, borderColor: '#BBF7D0',
  },
  promoAlertActive: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    marginBottom: 14, borderWidth: 1.5,
  },
  promoAlertIcon: { fontSize: 24 },
  promoAlertBody: { flex: 1 },
  promoAlertTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  promoAlertSub: { fontSize: 13, color: '#6B7280', lineHeight: 18 },

  cycleFromLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  cycleToLabel:   { fontSize: 10, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 6 },
  cycleLevels: { flex: 1 },
  approvalNote: { marginTop: 10, backgroundColor: '#FEF9C3', borderRadius: 8, padding: 8 },
  approvalNoteText: { fontSize: 12, color: '#92400E', fontWeight: '600' },

  criteriaSubtitle: { fontSize: 12, color: '#9CA3AF', marginBottom: 16, marginTop: -8 },
  criterionBlock: { marginBottom: 18 },
  criterionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  criterionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  criterionEmoji: { fontSize: 22 },
  criterionLabel: { fontSize: 14, fontWeight: '700', color: '#111827' },
  criterionHint:  { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  criterionValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  criterionValue: { fontSize: 18, fontWeight: '800', color: '#3B82F6' },
  criterionValueMet: { color: '#16A34A' },
  criterionTarget: { fontSize: 12, color: '#9CA3AF', fontWeight: '400' },
  criterionCheck: { fontSize: 16, fontWeight: '800' },
  checkMet: { color: '#16A34A' },
  checkNo:  { color: '#EF4444' },
  criterionBarBg: {
    height: 10, backgroundColor: '#E5E7EB', borderRadius: 5,
    overflow: 'hidden', position: 'relative',
  },
  criterionBarFill: { height: '100%', borderRadius: 5 },
  criterionMarker: {
    position: 'absolute', left: '80%', top: 0, bottom: 0,
    width: 2, backgroundColor: 'rgba(0,0,0,0.2)',
  },
  lastUpdated: { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: 4 },

  nextStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  nextStepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#E5E7EB', alignItems: 'center',
    justifyContent: 'center', flexShrink: 0,
  },
  nextStepDotDone: { backgroundColor: '#16A34A' },
  nextStepDotText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  nextStepText: { flex: 1, fontSize: 14, color: '#374151', lineHeight: 20, paddingTop: 4 },
  nextStepTextDone: { color: '#16A34A', textDecorationLine: 'line-through' },
});
