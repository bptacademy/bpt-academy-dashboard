import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Enrollment, Notification } from '../../types';
import ScreenHeader from '../../components/common/ScreenHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 20 * 2 - 12) / 2;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface EnrollmentWithProgress extends Enrollment {
  completedModules: number;
  totalModules: number;
}

// ── Local date string (no UTC offset bug) ────────────────────────────────
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// Build 15-day window: 7 past + today + 7 future — using LOCAL dates
function buildDays() {
  const days = [];
  const now = new Date();
  for (let i = -7; i <= 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    days.push({
      date: d,
      dateStr: localDateStr(d),
      events: [] as any[],
    });
  }
  return days;
}

export default function HomeScreen({ navigation }: any) {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [enrollments, setEnrollments] = useState<EnrollmentWithProgress[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [days, setDays] = useState(buildDays);
  const calendarRef = useRef<ScrollView>(null);
  const dismissedRef = useRef<Set<string>>(new Set());

  const todayStr = localDateStr(new Date());

  const fetchData = async () => {
    if (!profile) return;

    const [enrollRes, notifRes] = await Promise.all([
      supabase
        .from('enrollments')
        .select('*, program:programs(*)')
        .eq('student_id', profile.id)
        .eq('status', 'active')
        .limit(3),
      supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', profile.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(5),
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

    if (notifRes.data) {
      setNotifications(notifRes.data.filter((n: Notification) => !dismissedRef.current.has(n.id)));
    }

    // Fetch program sessions and map to CalendarEvent shape
    if (programIds.length > 0) {
      const now = new Date();
      const from = localDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7));
      const to   = localDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7));

      const { data: sessions } = await supabase
        .from('program_sessions')
        .select('id, session_date, title, start_time, program_id, program:programs(title)')
        .in('program_id', programIds)
        .gte('session_date', from)
        .lte('session_date', to);

      if (sessions) {
        // Map to CalendarEvent shape expected by CalendarDayScreen
        const mapped = sessions.map((s: any) => ({
          id: s.id,
          title: s.title ?? (s.program as any)?.title ?? 'Training Session',
          type: 'session' as const,
          time: s.start_time
            ? s.start_time.substring(0, 5) // HH:MM
            : undefined,
          description: (s.program as any)?.title
            ? `Program: ${(s.program as any).title}`
            : undefined,
          _dateStr: s.session_date, // local YYYY-MM-DD from DB
        }));

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

  // Scroll calendar to today on mount
  useEffect(() => {
    setTimeout(() => {
      calendarRef.current?.scrollTo({ x: 7 * 64, animated: false });
    }, 150);
  }, []);

  const dismissNotification = async (id: string) => {
    dismissedRef.current.add(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  };

  const goToPrograms = () => navigation.getParent()?.navigate('ProgramsTab');
  const goToMessages = () => navigation.getParent()?.navigate('MessagesTab');

  const skillBadgeColor: Record<string, string> = {
    beginner: '#3B82F6', intermediate: '#F59E0B', advanced: '#EF4444',
  };

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning 🌅';
    if (hour >= 12 && hour < 17) return 'Good afternoon ☀️';
    if (hour >= 17 && hour < 21) return 'Good evening 🌆';
    return 'Good night 🌙';
  })();

  const quickActions = [
    { icon: '🎬', label: 'Training Videos', onPress: () => navigation.navigate('Videos') },
    { icon: '📈', label: 'My Progress',      onPress: () => navigation.navigate('Progress') },
    { icon: '🏆', label: 'Leaderboard',      onPress: () => navigation.navigate('Leaderboard') },
    { icon: '🎾', label: 'Tournaments',      onPress: () => navigation.navigate('Tournaments') },
    { icon: '💬', label: 'Messages',         onPress: goToMessages },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 80, 104) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScreenHeader title="BPT Academy 🎾" />

      {/* Welcome strip */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.name}>{profile?.full_name}</Text>
        </View>
        {profile?.skill_level && (
          <View style={[styles.badge, { backgroundColor: skillBadgeColor[profile.skill_level] ?? '#6B7280' }]}>
            <Text style={styles.badgeText}>
              {profile.skill_level.charAt(0).toUpperCase() + profile.skill_level.slice(1)}
            </Text>
          </View>
        )}
      </View>

      {/* ── Calendar Strip ── */}
      <View style={styles.calendarSection}>
        <View style={styles.calendarHeader}>
          <Text style={styles.calendarTitle}>📅 Schedule</Text>
          <Text style={styles.calendarMonth}>
            {MONTH_NAMES[new Date().getMonth()]} {new Date().getFullYear()}
          </Text>
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
            const hasEvents = day.events.length > 0;
            return (
              <TouchableOpacity
                key={day.dateStr}
                style={[styles.dayCell, isToday && styles.dayCellToday]}
                onPress={() => navigation.navigate('CalendarDay', {
                  date: day.dateStr,
                  events: day.events,
                })}
                activeOpacity={0.7}
              >
                <Text style={[styles.dayName, isToday && styles.dayNameToday]}>
                  {DAY_NAMES[day.date.getDay()]}
                </Text>
                <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>
                  {day.date.getDate()}
                </Text>
                <View style={hasEvents ? styles.eventDot : styles.eventDotEmpty} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Notifications */}
      {notifications.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Notifications</Text>
          {notifications.map((n) => (
            <TouchableOpacity
              key={n.id}
              style={styles.notifCard}
              onPress={() => dismissNotification(n.id)}
              activeOpacity={0.7}
            >
              <View style={styles.notifRow}>
                <Text style={styles.notifTitle}>{n.title}</Text>
                <Text style={styles.notifDismiss}>✕</Text>
              </View>
              {n.body ? <Text style={styles.notifBody} numberOfLines={2}>{n.body}</Text> : null}
            </TouchableOpacity>
          ))}
        </View>
      )}

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
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 24, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  greeting: { fontSize: 14, color: '#6B7280' },
  name: { fontSize: 22, fontWeight: '700', color: '#111827' },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },

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
  calendarList: { paddingHorizontal: 10 },
  dayCell: {
    width: 56, height: 72, alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 4, borderRadius: 14, backgroundColor: '#F9FAFB',
  },
  dayCellToday: { backgroundColor: '#16A34A' },
  dayName: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase' },
  dayNameToday: { color: '#D1FAE5' },
  dayNum: { fontSize: 20, fontWeight: '700', color: '#111827' },
  dayNumToday: { color: '#FFFFFF' },
  eventDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', marginTop: 4 },
  eventDotEmpty: { width: 6, height: 6, marginTop: 4 },

  section: { padding: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 12 },
  seeAll: { color: '#16A34A', fontSize: 14, fontWeight: '600' },
  notifCard: { backgroundColor: '#ECFDF5', borderRadius: 10, padding: 14, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#16A34A' },
  notifRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notifTitle: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 },
  notifDismiss: { fontSize: 14, color: '#9CA3AF', paddingLeft: 8 },
  notifBody: { fontSize: 13, color: '#6B7280', marginTop: 4, lineHeight: 18 },
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
