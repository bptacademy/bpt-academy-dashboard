import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Enrollment } from '../../types';
import ScreenHeader from '../../components/common/ScreenHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 20 * 2 - 12) / 2;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Calendar cell geometry
const DAY_CELL_WIDTH = 56;
const DAY_CELL_MARGIN = 4;
const DAY_CELL_TOTAL = DAY_CELL_WIDTH + DAY_CELL_MARGIN * 2;
const CALENDAR_PADDING = 10;
const PAST_DAYS = 14;
const FUTURE_DAYS = 14;
const TODAY_INDEX = PAST_DAYS;

interface EnrollmentWithProgress extends Enrollment {
  completedModules: number;
  totalModules: number;
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
  const centreOffset = todayLeft - (SCREEN_WIDTH / 2) + (DAY_CELL_WIDTH / 2);
  return Math.max(0, centreOffset);
}

export default function HomeScreen({ navigation }: any) {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [enrollments, setEnrollments] = useState<EnrollmentWithProgress[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [days, setDays] = useState(buildDays);
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
            .from('modules')
            .select('id')
            .eq('program_id', e.program_id);
          const moduleIds = (modules ?? []).map((m: { id: string }) => m.id);
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
            time: `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`,
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
  const goToMessages = () => navigation.getParent()?.navigate('MessagesTab');

  const quickActions = [
    { icon: '🎬', label: 'Training Videos', onPress: () => navigation.navigate('Videos') },
    { icon: '📈', label: 'My Progress',      onPress: () => navigation.getParent()?.navigate('ProgressTab') },
    { icon: '🏆', label: 'Leaderboard',      onPress: () => navigation.navigate('Leaderboard') },
    { icon: '🎾', label: 'Tournaments',      onPress: () => navigation.navigate('Tournaments') },
    { icon: '💬', label: 'Messages',         onPress: goToMessages },
  ];

  const now = new Date();
  const monthLabel = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 80, 104) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* New home header: avatar + welcome + role pill + bell */}
      <ScreenHeader
        title=""
        homeHeader
        profileName={profile?.full_name}
        profileRole={profile?.role}
        profileAvatar={(profile as any)?.avatar_url ?? null}
        onAvatarPress={() => navigation.navigate('Profile')}
      />

      {/* ── Calendar Strip ── */}
      <View style={styles.calendarSection}>
        <View style={styles.calendarHeader}>
          <Text style={styles.calendarTitle}>📅 Schedule</Text>
          <Text style={styles.calendarMonth}>{monthLabel}</Text>
        </View>
        <ScrollView
          ref={calendarRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.calendarList}
          nestedScrollEnabled
        >
          {days.map((day) => {
            const isToday = day.dateStr === todayStr;
            const isPast  = day.dateStr < todayStr;
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
                <View style={hasEvents ? (isPast && !isToday ? styles.eventDotPast : styles.eventDot) : styles.eventDotEmpty} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* My Programs */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📚 My Programs</Text>
          <TouchableOpacity onPress={goToPrograms}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        {enrollments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>You're not enrolled in any programs yet.</Text>
            <TouchableOpacity onPress={goToPrograms}>
              <Text style={styles.emptyLink}>Browse programs →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          enrollments.map((e) => {
            const pct = e.totalModules > 0 ? Math.round((e.completedModules / e.totalModules) * 100) : 0;
            return (
              <TouchableOpacity
                key={e.id}
                style={styles.programCard}
                onPress={() => navigation.navigate('ProgramDetail', { programId: e.program_id })}
              >
                <Text style={styles.programTitle}>{(e.program as any)?.title}</Text>
                <Text style={styles.programMeta}>
                  {(e.program as any)?.duration_weeks} weeks
                  {(e.program as any)?.sessions_per_week ? ` · ${(e.program as any).sessions_per_week}x/week` : ''}
                </Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
                </View>
                <Text style={styles.progressLabel}>
                  {e.completedModules}/{e.totalModules} sessions complete · {pct}%
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
        <View style={styles.quickGrid}>
          {quickActions.map((item) => (
            <TouchableOpacity key={item.label} style={styles.actionCard} onPress={item.onPress}>
              <Text style={styles.actionIcon}>{item.icon}</Text>
              <Text style={styles.actionLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  calendarSection: {
    backgroundColor: '#FFFFFF', paddingTop: 14, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  calendarHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 12,
  },
  calendarTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  calendarMonth: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  calendarList: { paddingHorizontal: CALENDAR_PADDING },
  dayCell: {
    width: DAY_CELL_WIDTH, height: 72, alignItems: 'center', justifyContent: 'center',
    marginHorizontal: DAY_CELL_MARGIN, borderRadius: 14, backgroundColor: '#F9FAFB',
  },
  dayCellToday: { backgroundColor: '#16A34A' },
  dayCellPast: { backgroundColor: '#F3F4F6', opacity: 0.75 },
  dayName: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase' },
  dayNameToday: { color: '#D1FAE5' },
  dayNamePast: { color: '#C4C9D4' },
  dayNum: { fontSize: 20, fontWeight: '700', color: '#111827' },
  dayNumToday: { color: '#FFFFFF' },
  dayNumPast: { color: '#9CA3AF' },
  eventDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', marginTop: 4 },
  eventDotPast: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#9CA3AF', marginTop: 4 },
  eventDotEmpty: { width: 6, height: 6, marginTop: 4 },

  section: { padding: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 12 },
  seeAll: { color: '#16A34A', fontSize: 14, fontWeight: '600' },

  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  emptyText: { color: '#6B7280', fontSize: 14, marginBottom: 8 },
  emptyLink: { color: '#16A34A', fontWeight: '600', fontSize: 14 },
  programCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  programTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  programMeta: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  progressBar: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, marginTop: 12 },
  progressFill: { height: '100%', backgroundColor: '#16A34A', borderRadius: 3 },
  progressLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { width: CARD_WIDTH, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionLabel: { fontSize: 12, fontWeight: '600', color: '#374151', textAlign: 'center' },
});
