import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, TextInput,
  ScrollView, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import {
  SkillLevel, TimeSlot, WeekdayKey, Availability, WaitlistCapture,
  WEEKDAYS, SESSIONS_PER_WEEK_CHOICE,
} from '../../types';

const LEVELS: { value: SkillLevel; label: string }[] = [
  { value: 'beginner',     label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced',     label: 'Advanced' },
];
const SLOTS: { value: TimeSlot; label: string }[] = [
  { value: 'morning',   label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
];

type ScoreBand = { min: number; max: number; label: string };

type Props = {
  visible: boolean;
  submitting?: boolean;
  // Title differs for first join vs. completing details (the existing 12).
  mode?: 'join' | 'complete';
  initial?: Partial<WaitlistCapture>;
  // Allowed ranking-score band for this program's level (shown up front).
  scoreBand?: ScoreBand | null;
  onSubmit: (data: WaitlistCapture) => void;
  onCancel: () => void;
};

const fmt = (n: number) => (Number.isInteger(n) ? n.toFixed(1) : String(n));

/**
 * Captures the mandatory waiting-list info: level, 2 training days (Mon–Fri),
 * a morning/afternoon slot per day, age and mobile. Submit stays disabled until
 * every field is valid — mirrors the DB CHECK so a partial join cannot complete.
 */
export default function AvailabilityCaptureModal({
  visible, submitting, mode = 'join', initial, scoreBand, onSubmit, onCancel,
}: Props) {
  const [level, setLevel]               = useState<SkillLevel | undefined>(initial?.level);
  const [availability, setAvailability] = useState<Availability>(initial?.availability ?? {});
  const [age, setAge]                   = useState<string>(initial?.age != null ? String(initial.age) : '');
  const [phone, setPhone]               = useState<string>(initial?.phone ?? '');
  const [score, setScore]               = useState<string>(initial?.ranking_score != null ? String(initial.ranking_score) : '');

  const bMin = scoreBand?.min ?? 1.0;
  const bMax = scoreBand?.max ?? 7.0;
  const scoreNum = parseFloat(score);
  const scoreEntered = score.trim().length > 0;
  const scoreInRange = Number.isFinite(scoreNum) && scoreNum >= bMin && scoreNum <= bMax;

  const selectedDays = Object.keys(availability) as WeekdayKey[];

  const toggleDay = (day: WeekdayKey) => {
    setAvailability((prev) => {
      const next: Availability = { ...prev };
      if (next[day]) { delete next[day]; return next; }
      if (Object.keys(next).length >= SESSIONS_PER_WEEK_CHOICE) return prev; // cap at 2
      next[day] = 'morning';
      return next;
    });
  };
  const setSlot = (day: WeekdayKey, slot: TimeSlot) =>
    setAvailability((prev) => ({ ...prev, [day]: slot }));

  const ageNum = parseInt(age, 10);
  const daysOk = selectedDays.length === SESSIONS_PER_WEEK_CHOICE &&
    selectedDays.every((d) => !!availability[d]);
  const valid = !!level && daysOk && scoreInRange &&
    Number.isFinite(ageNum) && ageNum > 0 && ageNum < 120 &&
    phone.trim().length >= 6;

  const submit = () => {
    if (!valid || !level) return;
    onSubmit({ level, availability, age: ageNum, phone: phone.trim(), ranking_score: scoreNum });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        style={styles.modal}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.handle} />
        <Text style={styles.title}>
          {mode === 'complete' ? 'Complete your details' : 'Join Waiting List'}
        </Text>
        <Text style={styles.subtitle}>
          Programs run 2 days a week. Tell us your level and when you can play —
          a coach uses this to place you in the right group.
        </Text>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* Level */}
          <Text style={styles.label}>Your level *</Text>
          <View style={styles.row}>
            {LEVELS.map((l) => {
              const on = level === l.value;
              return (
                <TouchableOpacity
                  key={l.value}
                  style={[styles.chip, on && styles.chipOn]}
                  onPress={() => setLevel(l.value)}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{l.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.help}>A coach confirms your level in person.</Text>

          {/* Ranking score — range shown up front so they know what to enter */}
          <Text style={styles.label}>Ranking score *</Text>
          <View style={styles.rangeBanner}>
            <Text style={styles.rangeBannerText}>
              {scoreBand
                ? `${scoreBand.label} range: ${fmt(bMin)} – ${fmt(bMax)}`
                : `Allowed range: ${fmt(bMin)} – ${fmt(bMax)}`}
            </Text>
          </View>
          <TextInput
            style={[styles.input, scoreEntered && !scoreInRange && styles.inputError]}
            value={score}
            onChangeText={(t) => setScore(t.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
            placeholder={`e.g. ${fmt((bMin + bMax) / 2)}`}
            placeholderTextColor="#7A8FA6"
            keyboardType="decimal-pad"
            maxLength={4}
          />
          {scoreEntered && !scoreInRange ? (
            <Text style={styles.errorText}>
              That's outside your range. Enter a score between {fmt(bMin)} and {fmt(bMax)}
              {scoreBand ? ` for ${scoreBand.label}` : ''}.
            </Text>
          ) : (
            <Text style={styles.help}>Your current 1–7 score from your coach's latest assessment.</Text>
          )}

          {/* Days */}
          <Text style={styles.label}>Pick 2 training days *</Text>
          <View style={styles.row}>
            {WEEKDAYS.map((d) => {
              const on = !!availability[d.key];
              const full = !on && selectedDays.length >= SESSIONS_PER_WEEK_CHOICE;
              return (
                <TouchableOpacity
                  key={d.key}
                  style={[styles.dayChip, on && styles.chipOn, full && styles.chipDisabled]}
                  onPress={() => toggleDay(d.key)}
                  disabled={full}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{d.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Slot per selected day */}
          {selectedDays.length > 0 && (
            <>
              <Text style={styles.label}>Time of day *</Text>
              {WEEKDAYS.filter((d) => availability[d.key]).map((d) => (
                <View key={d.key} style={styles.slotRow}>
                  <Text style={styles.slotDay}>{d.label}</Text>
                  <View style={styles.row}>
                    {SLOTS.map((s) => {
                      const on = availability[d.key] === s.value;
                      return (
                        <TouchableOpacity
                          key={s.value}
                          style={[styles.slotChip, on && styles.chipOn]}
                          onPress={() => setSlot(d.key, s.value)}
                        >
                          <Text style={[styles.chipText, on && styles.chipTextOn]}>{s.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Age */}
          <Text style={styles.label}>Age *</Text>
          <TextInput
            style={styles.input}
            value={age}
            onChangeText={(t) => setAge(t.replace(/[^0-9]/g, ''))}
            placeholder="e.g. 24"
            placeholderTextColor="#7A8FA6"
            keyboardType="number-pad"
            maxLength={3}
          />

          {/* Phone */}
          <Text style={styles.label}>Mobile *</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+44 7700 000000"
            placeholderTextColor="#7A8FA6"
            keyboardType="phone-pad"
            autoCorrect={false}
          />
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancel} onPress={onCancel} disabled={submitting}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submit, (!valid || submitting) && styles.submitDisabled]}
            onPress={submit}
            disabled={!valid || submitting}
          >
            {submitting
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={styles.submitText}>
                  {mode === 'complete' ? 'Save details' : 'Join Waiting List'}
                </Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: '#0B1628', paddingTop: 8 },
  handle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.20)', borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  title: { fontSize: 20, fontWeight: '800', color: '#F0F6FC', textAlign: 'center', paddingHorizontal: 24 },
  subtitle: { fontSize: 13, color: '#7A8FA6', textAlign: 'center', paddingHorizontal: 24, marginTop: 6, marginBottom: 8, lineHeight: 18 },
  body: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: '700', color: '#F0F6FC', marginTop: 16, marginBottom: 8 },
  help: { fontSize: 12, color: '#7A8FA6', marginTop: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.20)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: 'rgba(255,255,255,0.06)' },
  dayChip: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.20)', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.06)' },
  slotChip: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.20)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.06)' },
  chipOn: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  chipDisabled: { opacity: 0.35 },
  chipText: { fontSize: 14, color: 'rgba(255,255,255,0.78)', fontWeight: '600' },
  chipTextOn: { color: '#FFFFFF', fontWeight: '700' },
  slotRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  slotDay: { fontSize: 15, fontWeight: '700', color: '#F0F6FC', width: 48 },
  input: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 14, fontSize: 16, color: '#F0F6FC', backgroundColor: 'rgba(255,255,255,0.07)' },
  inputError: { borderColor: '#EF4444' },
  errorText: { fontSize: 12, color: '#F87171', marginTop: 6, lineHeight: 16 },
  rangeBanner: { backgroundColor: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.35)', borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 8, alignSelf: 'flex-start' },
  rangeBannerText: { fontSize: 13, fontWeight: '700', color: '#93C5FD' },
  actions: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  cancel: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 16, alignItems: 'center' },
  cancelText: { color: '#F0F6FC', fontSize: 16, fontWeight: '700' },
  submit: { flex: 2, backgroundColor: '#16A34A', borderRadius: 14, padding: 16, alignItems: 'center' },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
