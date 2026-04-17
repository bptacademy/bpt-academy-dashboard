import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, Image, Dimensions} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import BackHeader from '../../components/common/BackHeader';

const DAYS = [
  { key: 'monday',    label: 'Mon' },
  { key: 'tuesday',   label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday',  label: 'Thu' },
  { key: 'friday',    label: 'Fri' },
  ];

const DAY_INDEX: Record<string, number> = { monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5,
};

function formatDateLabel(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function getMonthStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Generate exactly `targetCount` session dates starting from `startDate`,
 * falling on `selectedDays` of the week.
 * Walks forward day-by-day until we have exactly the right number of sessions.
 */
// Skip weekends in date generation
function isWeekday(d: Date): boolean {
  const dow = d.getDay();
  return dow !== 0 && dow !== 6;
}

function generateSessionDates(startDate: Date, selectedDays: string[], targetCount: number): Date[] {
  if (selectedDays.length === 0 || targetCount <= 0) return [];
  const dates: Date[] = [];
  const selectedIndices = selectedDays.map((d) => DAY_INDEX[d]);
  let current = new Date(startDate);
  // Safety cap: never walk more than 2 years forward
  const hardLimit = addDays(startDate, 730);
  while (dates.length < targetCount && current <= hardLimit) {
    if (selectedIndices.includes(current.getDay())) {
      dates.push(new Date(current));
    }
    current = addDays(current, 1);
  }
  return dates;
}

// Build a start-date picker — show next 30 days as options
function buildStartOptions(): Date[] {
  const options: Date[] = [];
  const now = new Date();
  for (let i = 0; i <= 30; i++) {
    options.push(addDays(now, i));
  }
  return options;
}

export default function ScheduleGeneratorScreen({ route, navigation }: any) {
  const { programId, programTitle, maxStudents, durationWeeks, sessionsPerWeek } = route.params;
  const insets = useSafeAreaInsets();
  const tabBarPadding = useTabBarPadding();
  const { profile } = useAuth();

  // Derive the fixed session count from program settings
  // Falls back to 8 (the standard amateur program count) if not set
  const sessionCount: number =
    durationWeeks && sessionsPerWeek
      ? Math.round(durationWeeks * sessionsPerWeek)
      : 8;

  const startOptions = buildStartOptions();
  const [selectedStart, setSelectedStart] = useState<Date>(startOptions[0]);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [capacity, setCapacity] = useState<string>(String(maxStudents ?? 10));

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // Always generate exactly sessionCount sessions
  const sessionDates = selectedDays.length > 0
    ? generateSessionDates(selectedStart, selectedDays, sessionCount)
    : [];

  const handleGenerate = useCallback(async () => {
    if (selectedDays.length === 0) {
      Alert.alert('Select days', 'Please select at least one day of the week.');
      return;
    }
    if (sessionDates.length === 0) {
      Alert.alert('No sessions', 'Could not generate sessions. Try a different start date or days.');
      return;
    }

    const lastDate = sessionDates[sessionDates.length - 1];
    Alert.alert(
      'Generate Schedule',
      `This will create exactly ${sessionDates.length} sessions for ${programTitle}.\n\nFirst: ${formatDateLabel(selectedStart)}\nLast: ${formatDateLabel(lastDate)}\n\nAny existing sessions/modules will be replaced. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Generate', onPress: doGenerate },
      ]
    );
  }, [selectedDays, sessionDates, selectedStart]);

  const doGenerate = async () => {
    setGenerating(true);
    try {
      const month = getMonthStr(selectedStart);

      // 1. Delete ALL existing modules and sessions for this program
      await supabase.from('program_sessions').delete().eq('program_id', programId);
      await supabase.from('modules').delete().eq('program_id', programId);

      // 2. Insert exactly sessionCount modules — trigger auto-creates sessions
      for (let i = 0; i < sessionDates.length; i++) {
        const { error } = await supabase.from('modules').insert({
          program_id: programId,
          title: `Module ${i + 1}`,
          description: 'Schedule generated module',
          order_index: i + 1,
          session_date: localDateStr(sessionDates[i]),
          is_published: true,
        });
        if (error) throw error;
      }

      // 3. Record the schedule
      await supabase.from('program_schedules').upsert({
        program_id: programId, month,
        start_date: localDateStr(selectedStart),
        days_of_week: selectedDays,
        generated_by: profile!.id,
      }, { onConflict: 'program_id,month' });

      // 4. Flip program to active
      await supabase.from('programs')
        .update({ status: 'active', is_active: true })
        .eq('id', programId);

      // 5. Auto-enrollment: confirmed+paid current students first, then waiting list FIFO
      const maxSpots = parseInt(capacity, 10) || 10;
      await supabase.from('programs').update({ max_students: maxSpots }).eq('id', programId);

      const { data: confirmed } = await supabase
        .from('enrollments').select('id, student_id')
        .eq('program_id', programId)
        .eq('confirmed_next_month', true)
        .eq('payment_confirmed', true);

      let filledSpots = (confirmed ?? []).length;

      for (const e of (confirmed ?? []) as any[]) {
        await supabase.from('enrollments')
          .update({ status: 'active', confirmed_next_month: false, payment_confirmed: false })
          .eq('id', e.id);
      }

      const remainingSpots = Math.max(0, maxSpots - filledSpots);
      if (remainingSpots > 0) {
        const { data: waitlist } = await supabase
          .from('program_waiting_list').select('student_id, position')
          .eq('program_id', programId).eq('month', month)
          .order('position', { ascending: true }).limit(remainingSpots);

        for (const w of (waitlist ?? []) as any[]) {
          await supabase.from('enrollments').upsert({
            student_id: w.student_id, program_id: programId,
            status: 'active', confirmed_next_month: false, payment_confirmed: false,
          }, { onConflict: 'student_id,program_id' });
          await supabase.from('notifications').insert({
            recipient_id: w.student_id,
            title: '🎾 You got a spot!',
            body: `You have been enrolled in ${programTitle} for next month!`,
            type: 'enrollment', read: false,
          });
          filledSpots++;
        }

        const { data: missed } = await supabase
          .from('program_waiting_list').select('student_id')
          .eq('program_id', programId).eq('month', month)
          .order('position', { ascending: true }).range(remainingSpots, 999);

        for (const w of (missed ?? []) as any[]) {
          await supabase.from('notifications').insert({
            recipient_id: w.student_id,
            title: 'No spot available this month',
            body: `Unfortunately there were no spots for you in ${programTitle} this month. Join the waiting list again next month!`,
            type: 'waitlist_miss', read: false,
          });
        }
      }

      // 6. Set re-enrollment deadline (7 days before last session) and notify active students
      const lastSession = sessionDates[sessionDates.length - 1];
      const deadline = addDays(lastSession, -7);

      const { data: active } = await supabase
        .from('enrollments').select('id, student_id')
        .eq('program_id', programId).eq('status', 'active');

      for (const e of (active ?? []) as any[]) {
        await supabase.from('enrollments')
          .update({ confirmation_deadline: deadline.toISOString() })
          .eq('id', e.id);
        await supabase.from('notifications').insert({
          recipient_id: e.student_id,
          title: '📅 Confirm your place next month',
          body: `${programTitle} is back next month. Confirm your place by ${deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}.`,
          type: 'reenrollment_request',
          data: {
            enrollment_id: e.id, program_id: programId,
            program_title: programTitle, price: 0,
            deadline: deadline.toISOString(),
          },
          read: false,
        });
      }

      // 7. Reset waiting list for this month
      await supabase.from('program_waiting_list').delete()
        .eq('program_id', programId).eq('month', month);

      setGenerating(false);
      Alert.alert(
        '✅ Schedule Generated!',
        `${sessionDates.length} sessions created. ${filledSpots} students enrolled.`,
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      setGenerating(false);
      Alert.alert('Error', err?.message ?? 'Failed to generate schedule');
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />

      <BackHeader title="Generate Schedule" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Program info */}
        <View style={styles.programCard}>
          <Text style={styles.programTitle}>{programTitle}</Text>
          <View style={styles.programMetaRow}>
            <View style={styles.programMetaBadge}>
              <Text style={styles.programMetaText}>📅 {sessionCount} sessions</Text>
            </View>
            <View style={styles.programMetaBadge}>
              <Text style={styles.programMetaText}>👥 {maxStudents} max students</Text>
            </View>
          </View>
          <Text style={styles.programSub}>
            {durationWeeks && sessionsPerWeek
              ? `${durationWeeks} weeks · ${sessionsPerWeek}×/week`
              : 'Standard 8-session program'}
          </Text>
        </View>

        {/* Fixed session count info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>🔒</Text>
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>Fixed session count</Text>
            <Text style={styles.infoBody}>
              This program always runs {sessionCount} sessions. Pick a start date and days — the schedule will always generate exactly {sessionCount} sessions from there.
            </Text>
          </View>
        </View>

        {/* Start date picker */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Start Date</Text>
          <Text style={styles.sectionHint}>First session of the new cycle</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
            {startOptions.map((d) => {
              const isSelected = localDateStr(d) === localDateStr(selectedStart);
              return (
                <TouchableOpacity
                  key={localDateStr(d)}
                  style={[styles.dateChip, isSelected && styles.dateChipActive]}
                  onPress={() => setSelectedStart(d)}
                >
                  <Text style={[styles.dateChipDay, isSelected && styles.dateChipTextActive]}>
                    {d.toLocaleDateString('en-GB', { weekday: 'short' })}
                  </Text>
                  <Text style={[styles.dateChipNum, isSelected && styles.dateChipTextActive]}>
                    {d.getDate()}
                  </Text>
                  <Text style={[styles.dateChipMonth, isSelected && styles.dateChipTextActive]}>
                    {d.toLocaleDateString('en-GB', { month: 'short' })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Days of week picker */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📆 Session Days</Text>
          <Text style={styles.sectionHint}>Which days of the week do sessions run?</Text>
          <View style={styles.daysRow}>
            {DAYS.map((d) => {
              const isSelected = selectedDays.includes(d.key);
              return (
                <TouchableOpacity
                  key={d.key}
                  style={[styles.dayChip, isSelected && styles.dayChipActive]}
                  onPress={() => toggleDay(d.key)}
                >
                  <Text style={[styles.dayChipText, isSelected && styles.dayChipTextActive]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Capacity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 Capacity</Text>
          <Text style={styles.sectionHint}>Maximum number of students for this cycle</Text>
          <View style={styles.capacityRow}>
            <TouchableOpacity
              style={styles.capacityBtn}
              onPress={() => setCapacity(v => String(Math.max(1, parseInt(v,10) - 1)))}
            >
              <Text style={styles.capacityBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.capacityValue}>{capacity}</Text>
            <TouchableOpacity
              style={styles.capacityBtn}
              onPress={() => setCapacity(v => String(parseInt(v,10) + 1))}
            >
              <Text style={styles.capacityBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Preview */}
        {sessionDates.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👁 Preview</Text>
            <Text style={styles.sectionHint}>
              {sessionDates.length} sessions · {formatDateLabel(selectedStart)} → {formatDateLabel(sessionDates[sessionDates.length - 1])}
            </Text>
            <View style={styles.previewList}>
              {sessionDates.map((d, i) => (
                <View key={i} style={styles.previewRow}>
                  <View style={styles.previewNum}>
                    <Text style={styles.previewNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.previewDate}>
                    {d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {selectedDays.length === 0 && (
          <View style={styles.emptyHint}>
            <Text style={styles.emptyHintText}>👆 Select a start date and days of the week to preview the {sessionCount} sessions</Text>
          </View>
        )}

        {/* Generate button */}
        <TouchableOpacity
          style={[styles.generateBtn, (generating || selectedDays.length === 0) && styles.generateBtnDisabled]}
          onPress={handleGenerate}
          disabled={generating || selectedDays.length === 0}
        >
          {generating
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={styles.generateBtnText}>
                📅 Generate {sessionCount} Sessions
              </Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16 },

  programCard: {
    backgroundColor: '#111827', borderRadius: 14, padding: 16, marginBottom: 12,
  },
  programTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  programMetaRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  programMetaBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  programMetaText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  programSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },

  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#BFDBFE', marginBottom: 14,
  },
  infoIcon: { fontSize: 20 },
  infoText: { flex: 1 },
  infoTitle: { fontSize: 13, fontWeight: '700', color: '#1E40AF', marginBottom: 3 },
  infoBody: { fontSize: 12, color: '#3B82F6', lineHeight: 18 },

  section: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#F0F6FC', marginBottom: 4 },
  sectionHint: { fontSize: 12, color: '#9CA3AF', marginBottom: 12 },

  dateRow: { gap: 8, paddingBottom: 4 },
  dateChip: {
    width: 56, paddingVertical: 10, borderRadius: 12,
    alignItems: 'center', backgroundColor: '#F3F4F6',
    borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  dateChipActive: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  dateChipDay: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  dateChipNum: { fontSize: 18, fontWeight: '800', color: '#111827', marginVertical: 2 },
  dateChipMonth: { fontSize: 10, color: '#9CA3AF' },
  dateChipTextActive: { color: '#FFFFFF' },

  daysRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  dayChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  dayChipActive: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  dayChipText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  dayChipTextActive: { color: '#FFFFFF' },

  previewList: { gap: 6 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  previewNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center',
  },
  previewNumText: { fontSize: 12, fontWeight: '700', color: '#16A34A' },
  previewDate: { fontSize: 14, color: '#374151' },

  emptyHint: {
    backgroundColor: '#FFFBEB', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#FDE68A', marginBottom: 14,
    alignItems: 'center',
  },
  emptyHintText: { fontSize: 13, color: '#92400E', textAlign: 'center', lineHeight: 20 },

  capacityRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24,
  },
  capacityBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  capacityBtnText: { fontSize: 22, fontWeight: '700', color: '#374151' },
  capacityValue: { fontSize: 36, fontWeight: '800', color: '#111827', minWidth: 60, textAlign: 'center' },
  generateBtn: {
    backgroundColor: '#16A34A', borderRadius: 14, padding: 18, alignItems: 'center',
  },
  generateBtnDisabled: { opacity: 0.5 },
  generateBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
