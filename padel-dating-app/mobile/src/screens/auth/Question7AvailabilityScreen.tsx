import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, fonts } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import OnboardingProgress from '../../components/common/OnboardingProgress';

const SUPABASE_URL = 'https://qmdewocktouqoibbqurh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_KwkQawb1Kv2jOk1Wud0xUg_mPQxPqmL';

const DAYS = [
  { id: 'monday',    short: 'Mon', label: 'Monday' },
  { id: 'tuesday',   short: 'Tue', label: 'Tuesday' },
  { id: 'wednesday', short: 'Wed', label: 'Wednesday' },
  { id: 'thursday',  short: 'Thu', label: 'Thursday' },
  { id: 'friday',    short: 'Fri', label: 'Friday' },
  { id: 'saturday',  short: 'Sat', label: 'Saturday' },
  { id: 'sunday',    short: 'Sun', label: 'Sunday' },
];

const TIMES = [
  { id: 'morning',   emoji: '🌅', label: 'Morning',   desc: 'Before midday' },
  { id: 'afternoon', emoji: '☀️', label: 'Afternoon', desc: '12pm – 5pm' },
  { id: 'evening',   emoji: '🌆', label: 'Evening',   desc: 'After 5pm' },
  { id: 'flexible',  emoji: '🕐', label: 'Flexible',  desc: 'Any time works' },
];

export default function Question7AvailabilityScreen({ route, navigation }: any) {
  const { first_name, last_name, date_of_birth, city, looking_for, visible_to, bio, level_value, play_style } = route.params ?? {};
  const insets = useSafeAreaInsets();
  const { session, refreshUser } = useAuth();

  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleDay = (id: string) => {
    setSelectedDays(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const resolveUserId = async (authId: string): Promise<string | null> => {
    // Step 1: try to find existing row
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', authId)
      .maybeSingle();

    if (existing?.id) return existing.id;

    // Step 2: row doesn't exist — upsert it
    await supabase.from('users').upsert({
      auth_id: authId,
      full_name: [first_name, last_name].filter(Boolean).join(' ') || null,
      date_of_birth: date_of_birth || null,
      city: city || null,
      looking_for: looking_for || null,
      visible_to: visible_to || null,
      bio: bio || null,
      profile_complete: false,
      last_active_at: new Date().toISOString(),
    }, { onConflict: 'auth_id' });

    // Step 3: fetch the id again after upsert
    const { data: created } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', authId)
      .maybeSingle();

    return created?.id ?? null;
  };

  const handleContinue = async () => {
    if (selectedDays.length === 0 || !selectedTime) return;

    const authId = session?.user?.id;
    if (!authId) return;

    setSaving(true);
    try {
      const userId = await resolveUserId(authId);
      if (!userId) throw new Error('Could not create your profile. Please try again.');

      // 1. Update users table with all profile data
      await supabase.from('users').update({
        full_name: [first_name, last_name].filter(Boolean).join(' ') || null,
        date_of_birth: date_of_birth || null,
        city: city || null,
        looking_for: looking_for || null,
        visible_to: visible_to || null,
        bio: bio || null,
      }).eq('id', userId);

      // 2. Upsert self-reported player stats
      const { error: statsError } = await supabase
        .from('player_stats')
        .upsert({
          user_id: userId,
          platform: 'self_reported',
          level_value,
          level_confidence: 0.5,
          play_style,
          preferred_days: selectedDays,
          preferred_time_of_day: selectedTime,
          total_matches: 0,
          wins: 0,
          losses: 0,
          win_rate: null,
        }, { onConflict: 'user_id,platform' });

      if (statsError) throw statsError;

      await refreshUser();

      // 3. Fire volpair Score computation in background
      fetch(`${SUPABASE_URL}/functions/v1/compute-scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ user_id: userId }),
      }).catch(() => {});

      navigation.navigate('PhotoUpload', {
        first_name, last_name, date_of_birth,
        city, looking_for, visible_to, bio, level_value, play_style,
        preferred_days: selectedDays, preferred_time_of_day: selectedTime,
      });
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const canContinue = selectedDays.length > 0 && selectedTime !== null;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
      <View style={styles.inner}>
        <OnboardingProgress total={9} current={9} />

        <Text style={styles.title}>When do you play?</Text>
        <Text style={styles.subtitle}>
          Pick your usual days and preferred time. We'll match you with players who share your schedule.
        </Text>

        <Text style={styles.sectionLabel}>Days</Text>
        <View style={styles.daysRow}>
          {DAYS.map(d => {
            const active = selectedDays.includes(d.id);
            return (
              <TouchableOpacity
                key={d.id}
                style={[styles.dayBtn, active && styles.dayBtnActive]}
                onPress={() => toggleDay(d.id)}
                activeOpacity={0.75}
              >
                <Text style={[styles.dayText, active && styles.dayTextActive]}>
                  {d.short}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Time of day</Text>
        <View style={styles.timeOptions}>
          {TIMES.map(t => {
            const active = selectedTime === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.timeOption, active && styles.timeOptionActive]}
                onPress={() => setSelectedTime(t.id)}
                activeOpacity={0.75}
              >
                <Text style={styles.timeEmoji}>{t.emoji}</Text>
                <Text style={[styles.timeLabel, active && styles.timeLabelActive]}>
                  {t.label}
                </Text>
                <Text style={[styles.timeDesc, active && styles.timeDescActive]}>
                  {t.desc}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.btn, (!canContinue || saving) && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={!canContinue || saving}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>
            {saving ? 'Saving…' : 'Continue →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  inner: { flex: 1, paddingHorizontal: 24, paddingBottom: 32 },
  title: {
    fontSize: 26, fontFamily: fonts.headlineBold,
    color: theme.textPrimary, marginBottom: 10, marginTop: 8,
  },
  subtitle: {
    fontSize: 14, color: theme.textMuted, lineHeight: 22,
    marginBottom: 24, fontFamily: fonts.bodyLight,
  },
  sectionLabel: {
    fontSize: 13, fontFamily: fonts.bodyBold,
    color: theme.textSecondary, marginBottom: 12,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  daysRow: { flexDirection: 'row', gap: 8 },
  dayBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
    backgroundColor: theme.bgCard, borderWidth: 1.5, borderColor: theme.border,
  },
  dayBtnActive: { backgroundColor: theme.primaryDim, borderColor: theme.primary },
  dayText: { fontSize: 12, fontFamily: fonts.bodyBold, color: theme.textMuted },
  dayTextActive: { color: theme.primary },
  timeOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  timeOption: {
    width: '47%', backgroundColor: theme.bgCard,
    borderRadius: 16, padding: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: theme.border, gap: 4,
  },
  timeOptionActive: { backgroundColor: theme.primaryDim, borderColor: theme.primary },
  timeEmoji: { fontSize: 24, marginBottom: 2 },
  timeLabel: { fontSize: 14, fontFamily: fonts.bodyBold, color: theme.textPrimary },
  timeLabelActive: { color: theme.primary },
  timeDesc: { fontSize: 11, color: theme.textMuted, fontFamily: fonts.bodyLight },
  timeDescActive: { color: 'rgba(0,212,200,0.7)' },
  btn: {
    backgroundColor: theme.primary, borderRadius: 16,
    paddingVertical: 17, alignItems: 'center', marginTop: 'auto',
  },
  btnDisabled: { opacity: 0.35 },
  btnText: { color: '#05020E', fontSize: 16, fontFamily: fonts.headlineBold },
});
