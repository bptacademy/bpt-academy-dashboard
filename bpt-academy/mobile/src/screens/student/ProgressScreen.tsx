import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal,
} from 'react-native';
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
  const { profile } = useAuth();
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
  }, [profile]);

  // ── Fetch promotion cycle & attendance ───────────────────────
  const fetchCycle = useCallback(async () => {
    if (!profile) return;
    setCycleLoading(true);

    // Get active cycle
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

    // Get enrolled program(s)
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

    // Total sessions in cycle window
    const { count: totalCount } = await supabase
      .from('program_sessions')
      .select('*', { count: 'exact', head: true })
      .in('program_id', programIds)
      .gte('scheduled_at', cycleData.cycle_start_date)
      .lte('scheduled_at', cycleData.cycle_end_date);

    // Attended sessions in cycle window
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
  }, [profile]);

  // ── Fetch badges ─────────────────────────────────────────────
  const fetchBadges = useCallback(async () => {
    if (!profile) return;
    setBadgesLoading(true);

    // Check total sessions attended
    const { count: totalAttended } = await supabase
      .from('session_attendance')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', profile.id)
      .eq('attended', true);

    // Check if has tournament ranking event
    const { data: tournamentEvents } = await supabase
      .from('ranking_events')
      .select('id')
      .eq('student_id', profile.id)
      .ilike('reason', '%tournament%')
      .limit(1);

    // Days since joined
    const joinedAt = new Date(profile.created_at);
    const now = new Date();
    const daysSinceJoin = Math.floor((now.getTime() - joinedAt.getTime()) / (1000 * 60 * 60 * 24));

    // Check 80% cycle achievement
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
  }, [profile, attendanceStat.pct]);

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
  }, [profile]);

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchOverview(), fetchCycle()]);
  }, [fetchOverview, fetchCycle]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { if (tab === 'badges') fetchBadges(); }, [tab, fetchBadges]);
  useEffect(() => { if (tab === 'goals') fetchGoals(); }, [tab, fetchGoals]);

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

  // Days remaining in cycle
  const daysLeft = cycle
    ? Math.max(0, Math.ceil((new Date(cycle.cycle_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Sessions needed to hit 80%
  const sessionsNeeded = cycle
    ? Math.max(0, Math.ceil((cycle.required_attendance_pct / 100) * attendanceStat.total) - attendanceStat.attended)
    : 0;

  // ─── Render ──────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <ScreenHeader title="My Progress" />

      {/* Tab bar */}
      <View style={styles.tabs}>
        {(['overview', 'attendance', 'goals', 'badges'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && { borderBottomColor: divColor }]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && { color: divColor }]}>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
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
                    {/* Module list */}
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

        {/* ── ATTENDANCE / PROMOTION TAB ───────────────────── */}
        {tab === 'attendance' && (
          <>
            {cycleLoading ? (
              <ActivityIndicator size="large" color={divColor} style={styles.loader} />
            ) : !cycle ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>📅</Text>
                <Text style={styles.emptyTitle}>No Active Promotion Cycle</Text>
                <Text style={styles.emptyNote}>Ask your coach to start your promotion cycle.</Text>
              </View>
            ) : (
              <>
                {/* Cycle header */}
                <View style={[styles.cycleCard, { borderColor: divColor }]}>
                  <View style={styles.cycleHeader}>
                    <View>
                      <Text style={styles.cycleFrom}>{LEVEL_LABELS[cycle.from_level] ?? cycle.from_level}</Text>
                      <Text style={styles.cycleArrow}>↓</Text>
                      <Text style={[styles.cycleTo, { color: divColor }]}>{LEVEL_LABELS[cycle.to_level] ?? cycle.to_level}</Text>
                    </View>
                    <View style={styles.cycleDays}>
                      <Text style={[styles.cycleDaysNum, daysLeft < 14 && { color: '#EF4444' }]}>{daysLeft}</Text>
                      <Text style={styles.cycleDaysLabel}>days left</Text>
                    </View>
                  </View>
                  <Text style={styles.cycleDates}>
                    {new Date(cycle.cycle_start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    {' → '}
                    {new Date(cycle.cycle_end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>

                {/* Attendance bar */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Attendance Progress</Text>
                  <View style={styles.attRow}>
                    <Text style={[styles.attPct, { color: attendanceStat.pct >= 80 ? '#16A34A' : divColor }]}>
                      {attendanceStat.pct}%
                    </Text>
                    <Text style={styles.attTarget}>Target: {cycle.required_attendance_pct}%</Text>
                  </View>
                  <View style={styles.attBarBg}>
                    <View style={[
                      styles.attBarFill,
                      {
                        width: `${Math.min(100, attendanceStat.pct)}%`,
                        backgroundColor: attendanceStat.pct >= 80 ? '#16A34A' : divColor,
                      },
                    ]} />
                  </View>
                  <Text style={styles.attMarkerLabel}>▲ 80% target</Text>
                  <View style={styles.attStats}>
                    <View style={styles.attStat}>
                      <Text style={styles.attStatNum}>{attendanceStat.attended}</Text>
                      <Text style={styles.attStatLabel}>Attended</Text>
                    </View>
                    <View style={styles.attStat}>
                      <Text style={styles.attStatNum}>{attendanceStat.total}</Text>
                      <Text style={styles.attStatLabel}>Total Sessions</Text>
                    </View>
                    <View style={styles.attStat}>
                      <Text style={[styles.attStatNum, { color: '#EF4444' }]}>{attendanceStat.total - attendanceStat.attended}</Text>
                      <Text style={styles.attStatLabel}>Missed</Text>
                    </View>
                  </View>
                </View>

                {/* Status message */}
                {attendanceStat.pct >= cycle.required_attendance_pct && cycle.status === 'eligible' && (
                  <View style={[styles.statusBanner, { backgroundColor: '#FEF9C3' }]}>
                    <Text style={styles.statusBannerIcon}>⏳</Text>
                    <Text style={styles.statusBannerText}>
                      You've hit {cycle.required_attendance_pct}%!{cycle.requires_coach_approval ? ' Awaiting coach approval.' : ' Processing your promotion.'}
                    </Text>
                  </View>
                )}
                {cycle.status === 'approved' && (
                  <View style={[styles.statusBanner, { backgroundColor: '#DCFCE7' }]}>
                    <Text style={styles.statusBannerIcon}>🎉</Text>
                    <Text style={styles.statusBannerText}>Promotion approved! You'll be moved up shortly.</Text>
                  </View>
                )}
                {cycle.status === 'active' && attendanceStat.pct < cycle.required_attendance_pct && (
                  <View style={[styles.statusBanner, { backgroundColor: '#EFF6FF' }]}>
                    <Text style={styles.statusBannerIcon}>💪</Text>
                    <Text style={styles.statusBannerText}>
                      {sessionsNeeded > 0
                        ? `${sessionsNeeded} more session${sessionsNeeded !== 1 ? 's' : ''} to reach ${cycle.required_attendance_pct}% — keep going!`
                        : `You're on track! Keep attending to hit ${cycle.required_attendance_pct}%.`}
                    </Text>
                  </View>
                )}
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
                {/* Achieved count banner */}
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
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  tabs: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  loader: { marginTop: 60 },

  // Level card
  levelCard: {
    borderRadius: 16, padding: 24, marginBottom: 14, alignItems: 'center',
  },
  levelLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  levelValue: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', marginTop: 6, textAlign: 'center' },
  levelPoints: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 4 },

  // Section card
  sectionCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 14 },

  // Journey
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

  // Overview
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

  // Cycle
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

  // Attendance
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

  // Status banner
  statusBanner: {
    borderRadius: 12, padding: 14, marginBottom: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  statusBannerIcon: { fontSize: 24 },
  statusBannerText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#374151' },

  // Empty
  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 40,
    alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', marginTop: 20,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 },

  // Goals tab
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

  // Module rows in program card
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

  // Module detail modal
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
  modCloseBtn: {
    margin: 20, borderRadius: 14, padding: 16, alignItems: 'center',
  },
  modCloseBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  // Badges
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
});
