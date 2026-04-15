import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, Dimensions, Image, ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Enrollment } from '../../types';
import { useNotifications } from '../../hooks/useNotifications';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Calendar geometry
const DAY_CELL_WIDTH = 52;
const DAY_CELL_MARGIN = 5;
const DAY_CELL_TOTAL = DAY_CELL_WIDTH + DAY_CELL_MARGIN * 2;
const CALENDAR_PADDING = 12;
const PAST_DAYS = 7;
const FUTURE_DAYS = 21;
const TODAY_INDEX = PAST_DAYS;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Palette
const BG      = '#0B1628';
const SURFACE = '#111E33';
const BORDER  = '#1E3050';
const TEXT    = '#F0F6FC';
const SUBTEXT = '#7A8FA6';
const GREEN   = '#16A34A';
const GREEN2  = '#22C55E';

interface EnrollmentWithProgress extends Enrollment {
  completedModules: number;
  totalModules: number;
}

interface LeaderEntry {
  rank: number;
  full_name: string;
  division: string;
  total_points: number;
}

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function buildDays() {
  const days = [];
  const now = new Date();
  for (let i = -PAST_DAYS; i <= FUTURE_DAYS; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    days.push({ date: d, dateStr: localDateStr(d), events: [] as any[] });
  }
  return days;
}

function todayScrollOffset(): number {
  const todayLeft = CALENDAR_PADDING + TODAY_INDEX * DAY_CELL_TOTAL;
  return Math.max(0, todayLeft - SCREEN_WIDTH / 2 + DAY_CELL_WIDTH / 2);
}

function nextEventLabel(days: any[], todayStr: string): string {
  for (const day of days) {
    if (day.dateStr >= todayStr && day.events.length > 0) {
      const diff = Math.round(
        (new Date(day.dateStr).getTime() - new Date(todayStr).getTime()) / 86400000
      );
      if (diff === 0) return 'Today';
      if (diff === 1) return 'Tomorrow';
      return `In ${diff} Days`;
    }
  }
  return 'No Upcoming';
}

export default function HomeScreen({ navigation }: any) {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotifications();
  const [enrollments, setEnrollments] = useState<EnrollmentWithProgress[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [days, setDays] = useState(buildDays);
  const [leaderTop, setLeaderTop] = useState<LeaderEntry | null>(null);
  const calendarRef = useRef<ScrollView>(null);
  const todayStr = localDateStr(new Date());

  const fetchData = async () => {
    if (!profile) return;

    const [enrollRes] = await Promise.all([
      supabase
        .from('enrollments')
        .select('*, program:programs(*)')
        .eq('student_id', profile.id)
        .eq('status', 'active')
        .limit(3),
    ]);

    let programIds: string[] = [];
    if (enrollRes.data) {
      const withProgress = await Promise.all(
        enrollRes.data.map(async (e) => {
          const { data: modules } = await supabase
            .from('modules').select('id').eq('program_id', e.program_id);
          const moduleIds = (modules ?? []).map((m: any) => m.id);
          let completedModules = 0;
          if (moduleIds.length > 0) {
            const { count } = await supabase
              .from('student_progress')
              .select('*', { count: 'exact', head: true })
              .eq('student_id', profile.id)
              .eq('completed', true)
              .in('module_id', moduleIds);
            completedModules = count ?? 0;
          }
          return { ...e, completedModules, totalModules: moduleIds.length };
        })
      );
      setEnrollments(withProgress);
      programIds = enrollRes.data.map((e: any) => e.program_id);
    }

    if (programIds.length > 0) {
      const now = new Date();
      const fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - PAST_DAYS);
      const toDate   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + FUTURE_DAYS + 1);
      const { data: sessions } = await supabase
        .from('program_sessions')
        .select('id, scheduled_at, title, duration_minutes, location, program_id, program:programs(title)')
        .in('program_id', programIds)
        .gte('scheduled_at', fromDate.toISOString())
        .lte('scheduled_at', toDate.toISOString())
        .order('scheduled_at', { ascending: true });

      if (sessions) {
        const mapped = sessions.map((s: any) => {
          const dt = new Date(s.scheduled_at);
          return {
            id: s.id,
            title: s.title ?? (s.program as any)?.title ?? 'Training Session',
            type: 'session' as const,
            time: `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`,
            description: (s.program as any)?.title ? `Program: ${(s.program as any).title}` : undefined,
            location: s.location,
            duration_minutes: s.duration_minutes,
            _dateStr: localDateStr(dt),
          };
        });
        setDays(prev => prev.map(day => ({
          ...day,
          events: mapped.filter((e: any) => e._dateStr === day.dateStr),
        })));
      }
    }

    if (profile.division) {
      const { data: leaders } = await supabase
        .from('profiles')
        .select('id, full_name, division, ranking_points')
        .eq('division', profile.division)
        .eq('role', 'student')
        .order('ranking_points', { ascending: false })
        .limit(1);
      if (leaders && leaders.length > 0) {
        setLeaderTop({
          rank: 1,
          full_name: leaders[0].full_name,
          division: leaders[0].division,
          total_points: leaders[0].ranking_points ?? 0,
        });
      }
    }
  };

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };
  useEffect(() => { fetchData(); }, [profile]);
  useFocusEffect(useCallback(() => { fetchData(); }, [profile]));

  useEffect(() => {
    setTimeout(() => {
      calendarRef.current?.scrollTo({ x: todayScrollOffset(), animated: false });
    }, 150);
  }, []);

  const goToPrograms = () => navigation.getParent()?.navigate('ProgramsTab');
  const nextLabel = nextEventLabel(days, todayStr);

  const nameParts = (profile?.full_name ?? '').split(' ');
  const firstName = nameParts[0] ?? '';
  const lastName  = nameParts.slice(1).join(' ').toUpperCase();
  const initials  = (profile?.full_name ?? '?').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  const avatarUrl = (profile as any)?.avatar_url ?? null;

  const quickActions = [
    { icon: '🎬', label: 'Training Videos', onPress: () => navigation.navigate('Videos') },
    { icon: '🏆', label: 'Leaderboard',      onPress: () => navigation.navigate('Leaderboard') },
    { icon: '🎾', label: 'Tournaments',      onPress: () => navigation.navigate('Tournaments') },
    { icon: '📅', label: 'My Schedule',      onPress: () => navigation.navigate('CalendarDay', { date: todayStr, events: days.find(d => d.dateStr === todayStr)?.events ?? [] }) },
  ];

  return (
    <View style={styles.root}>
      {/* Full-screen background image — fixed behind everything */}
      <Image
        source={require('../../../assets/bg.png')}
        style={styles.bgImage}
        resizeMode="cover"
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN2} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.avatarRow} onPress={() => navigation.navigate('Profile')} activeOpacity={0.8}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <View style={styles.welcomeBlock}>
              <Text style={styles.welcomeLabel}>Welcome,</Text>
              <Text style={styles.welcomeName} numberOfLines={1}>
                {firstName}{lastName ? ` ${lastName}` : ''}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.headerRight}>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>{profile?.role ?? 'Student'}</Text>
            </View>
            <TouchableOpacity
              style={styles.bellWrap}
              onPress={() => navigation.navigate('Notifications')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.bellIcon}>🔔</Text>
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : String(unreadCount)}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Calendar ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <View style={styles.nextBadge}>
              <Text style={styles.nextBadgeText}>Next {nextLabel}</Text>
            </View>
          </View>
          <View style={styles.calendarWrap}>
            <ScrollView
              ref={calendarRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: CALENDAR_PADDING }}
              nestedScrollEnabled
            >
              {days.map((day) => {
                const isToday   = day.dateStr === todayStr;
                const isPast    = day.dateStr < todayStr;
                const hasEvents = day.events.length > 0;
                return (
                  <TouchableOpacity
                    key={day.dateStr}
                    style={[
                      styles.dayCell,
                      isToday && styles.dayCellToday,
                      isPast && !isToday && styles.dayCellPast,
                    ]}
                    onPress={() => navigation.navigate('CalendarDay', { date: day.dateStr, events: day.events })}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dayName, isToday && styles.dayNameToday, isPast && !isToday && styles.dayNamePast]}>
                      {DAY_NAMES[day.date.getDay()]}
                    </Text>
                    <Text style={[styles.dayNum, isToday && styles.dayNumToday, isPast && !isToday && styles.dayNumPast]}>
                      {day.date.getDate()}
                    </Text>
                    <View style={hasEvents
                      ? (isToday ? styles.eventDotToday : isPast ? styles.eventDotPast : styles.eventDot)
                      : styles.eventDotEmpty}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* ── Programs ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Programs</Text>
            <TouchableOpacity onPress={goToPrograms}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>

          {enrollments.length === 0 ? (
            <TouchableOpacity style={styles.emptyCard} onPress={goToPrograms}>
              <Text style={styles.emptyText}>No active programs yet</Text>
              <Text style={styles.emptyLink}>Browse programs →</Text>
            </TouchableOpacity>
          ) : (
            enrollments.map((e) => {
              const pct = e.totalModules > 0 ? Math.round((e.completedModules / e.totalModules) * 100) : 0;
              return (
                <TouchableOpacity
                  key={e.id}
                  onPress={() => navigation.navigate('ProgramDetail', { programId: e.program_id })}
                  activeOpacity={0.85}
                  style={{ marginBottom: 12 }}
                >
                  <View style={styles.programCard}>
                    <View style={styles.programCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.programTitle}>{(e.program as any)?.title}</Text>
                        <Text style={styles.programMeta}>
                          {(e.program as any)?.duration_weeks} weeks
                          {(e.program as any)?.sessions_per_week ? ` · ${(e.program as any).sessions_per_week}x/week` : ''}
                        </Text>
                      </View>
                      <Text style={styles.programChevron}>›</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${pct}%` as any }]} />
                    </View>
                    <View style={styles.programCardBottom}>
                      <Text style={styles.programPct}>{pct}%</Text>
                      <Text style={styles.programSessions}>{e.completedModules}/{e.totalModules} sessions</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* ── Leaderboard ── */}
        {leaderTop && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Leaderboard</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Leaderboard')}>
                <Text style={styles.seeAll}>See all →</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Leaderboard')} activeOpacity={0.85}>
              <View style={styles.leaderCard}>
                <View style={styles.leaderRankCircle}>
                  <Text style={styles.leaderRankText}>#1</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.leaderName}>{leaderTop.full_name}</Text>
                  <View style={styles.leaderDivisionBadge}>
                    <Text style={styles.leaderDivisionText}>
                      {leaderTop.division.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.leaderPoints}>{leaderTop.total_points}</Text>
                  <Text style={styles.leaderPointsLabel}>pts</Text>
                </View>
                <Text style={styles.leaderChevron}>›</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Quick Actions ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickGrid}>
            {quickActions.map((item) => (
              <TouchableOpacity key={item.label} style={styles.actionCard} onPress={item.onPress} activeOpacity={0.8}>
                <Text style={styles.actionIcon}>{item.icon}</Text>
                <Text style={styles.actionLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:      { flex: 1, backgroundColor: BG },
  bgImage: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  container: { flex: 1 },

  // ── Header ──
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 16,
  },
  avatarRow:   { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar:      { width: 46, height: 46, borderRadius: 10, borderWidth: 2, borderColor: GREEN },
  avatarPlaceholder: {
    width: 46, height: 46, borderRadius: 10, backgroundColor: GREEN,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: GREEN2,
  },
  avatarInitials: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  welcomeBlock:   { marginLeft: 10, flex: 1 },
  welcomeLabel:   { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontFamily: 'TTOctosquaresCond-Light' },
  welcomeName:    { fontSize: 15, fontWeight: '700', color: TEXT, fontFamily: 'TTOctosquaresCond-Bold' },
  headerRight:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rolePill: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  rolePillText:   { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)', fontFamily: 'TTOctosquaresCond-Light' },
  bellWrap:       { padding: 4 },
  bellIcon:       { fontSize: 20 },
  bellBadge: {
    position: 'absolute', top: 0, right: 0,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  bellBadgeText:  { color: '#FFF', fontSize: 9, fontWeight: '700' },

  // ── Sections ──
  section:       { paddingHorizontal: 16, marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:  { fontSize: 15, fontWeight: '700', color: TEXT, fontFamily: 'TTOctosquaresCond-Bold', letterSpacing: 1 },
  seeAll:        { fontSize: 12, color: GREEN2, fontWeight: '600' },
  nextBadge:     { backgroundColor: 'rgba(17,30,51,0.8)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: BORDER },
  nextBadgeText: { fontSize: 11, color: GREEN2, fontWeight: '600' },

  // ── Calendar ──
  calendarWrap: { backgroundColor: 'rgba(17,30,51,0.85)', borderRadius: 16, paddingVertical: 12, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  dayCell: {
    width: DAY_CELL_WIDTH, height: 70, alignItems: 'center', justifyContent: 'center',
    marginHorizontal: DAY_CELL_MARGIN, borderRadius: 12, backgroundColor: 'rgba(23,34,64,0.9)',
  },
  dayCellToday: { backgroundColor: GREEN },
  dayCellPast:  { opacity: 0.4 },
  dayName: { fontSize: 10, fontWeight: '600', color: SUBTEXT, marginBottom: 4, textTransform: 'uppercase' },
  dayNameToday: { color: '#D1FAE5' },
  dayNamePast:  { color: SUBTEXT },
  dayNum: { fontSize: 18, fontWeight: '700', color: TEXT },
  dayNumToday: { color: '#FFF' },
  dayNumPast:  { color: SUBTEXT },
  eventDot:      { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#EF4444', marginTop: 4 },
  eventDotToday: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#FFF', marginTop: 4 },
  eventDotPast:  { width: 5, height: 5, borderRadius: 2.5, backgroundColor: SUBTEXT, marginTop: 4 },
  eventDotEmpty: { width: 5, height: 5, marginTop: 4 },

  // ── Programs ──
  emptyCard: {
    backgroundColor: 'rgba(17,30,51,0.85)', borderRadius: 14, padding: 20, alignItems: 'center',
    borderWidth: 1, borderColor: BORDER,
  },
  emptyText: { color: SUBTEXT, fontSize: 14, marginBottom: 6 },
  emptyLink: { color: GREEN2, fontWeight: '600', fontSize: 13 },
  programCard: {
    borderRadius: 16, padding: 16,
    backgroundColor: 'rgba(14,35,24,0.9)',
    borderWidth: 1, borderColor: '#1A4030',
  },
  programCardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  programTitle:   { fontSize: 15, fontWeight: '700', color: '#FFF', marginBottom: 4, fontFamily: 'TTOctosquaresCond-Bold' },
  programMeta:    { fontSize: 12, color: 'rgba(255,255,255,0.55)' },
  programChevron: { fontSize: 26, color: 'rgba(255,255,255,0.4)', marginTop: -2 },
  progressBarBg:  { height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, marginBottom: 8 },
  progressBarFill:{ height: '100%', backgroundColor: GREEN2, borderRadius: 2 },
  programCardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  programPct:     { fontSize: 13, fontWeight: '700', color: GREEN2 },
  programSessions:{ fontSize: 12, color: 'rgba(255,255,255,0.55)' },

  // ── Leaderboard ──
  leaderCard: {
    borderRadius: 16, padding: 16,
    backgroundColor: 'rgba(9,30,30,0.9)',
    borderWidth: 1, borderColor: '#0F3030',
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  leaderRankCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(34,197,94,0.12)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: GREEN2,
  },
  leaderRankText:     { fontSize: 14, fontWeight: '800', color: GREEN2, fontFamily: 'TTOctosquaresCond-Bold' },
  leaderName:         { fontSize: 14, fontWeight: '700', color: '#FFF', marginBottom: 4, fontFamily: 'TTOctosquaresCond-Bold' },
  leaderDivisionBadge:{ backgroundColor: 'rgba(255,255,255,0.08)', alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  leaderDivisionText: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
  leaderPoints:       { fontSize: 20, fontWeight: '800', color: GREEN2, fontFamily: 'TTOctosquaresCond-Bold' },
  leaderPointsLabel:  { fontSize: 11, color: SUBTEXT },
  leaderChevron:      { fontSize: 24, color: 'rgba(255,255,255,0.25)' },

  // ── Quick Actions ──
  quickGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard:  {
    width: (SCREEN_WIDTH - 32 - 10) / 2,
    backgroundColor: 'rgba(17,30,51,0.85)', borderRadius: 14, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: BORDER,
  },
  actionIcon:  { fontSize: 26, marginBottom: 8 },
  actionLabel: { fontSize: 12, fontWeight: '600', color: TEXT, textAlign: 'center' },
});
