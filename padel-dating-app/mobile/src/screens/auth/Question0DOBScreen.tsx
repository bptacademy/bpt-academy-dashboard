import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  Modal, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, fonts } from '../../lib/theme';
import OnboardingProgress from '../../components/common/OnboardingProgress';

const MONTHS = [
  { label: 'Jan', value: '01' },
  { label: 'Feb', value: '02' },
  { label: 'Mar', value: '03' },
  { label: 'Apr', value: '04' },
  { label: 'May', value: '05' },
  { label: 'Jun', value: '06' },
  { label: 'Jul', value: '07' },
  { label: 'Aug', value: '08' },
  { label: 'Sep', value: '09' },
  { label: 'Oct', value: '10' },
  { label: 'Nov', value: '11' },
  { label: 'Dec', value: '12' },
];

const DAYS = Array.from({ length: 31 }, (_, i) => {
  const d = String(i + 1).padStart(2, '0');
  return { label: String(i + 1), value: d };
});

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 63 }, (_, i) => {
  const y = currentYear - 18 - i;
  return { label: String(y), value: String(y) };
});

function computeAge(day: string, month: string, year: string): number {
  const today = new Date();
  const dob = new Date(Number(year), Number(month) - 1, Number(day));
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

type PickerType = 'day' | 'month' | 'year' | null;

export default function Question0DOBScreen({ route, navigation }: any) {
  const { first_name, last_name } = route.params ?? {};
  const insets = useSafeAreaInsets();

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [activePicker, setActivePicker] = useState<PickerType>(null);

  const age = selectedDay && selectedMonth && selectedYear
    ? computeAge(selectedDay, selectedMonth, selectedYear)
    : null;

  const canContinue = selectedDay !== null && selectedMonth !== null && selectedYear !== null && age !== null && age >= 18;

  const handleContinue = () => {
    if (!canContinue) return;
    const dateOfBirth = `${selectedYear}-${selectedMonth}-${selectedDay}`;
    navigation.navigate('Question1Location', {
      first_name,
      last_name,
      date_of_birth: dateOfBirth,
    });
  };

  const dayLabel = selectedDay ? String(Number(selectedDay)) : 'Day';
  const monthLabel = selectedMonth ? (MONTHS.find(m => m.value === selectedMonth)?.label ?? 'Month') : 'Month';
  const yearLabel = selectedYear ?? 'Year';

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>←</Text>
      </TouchableOpacity>

      <View style={styles.inner}>
        <OnboardingProgress total={9} current={2} />

        <Text style={styles.question}>When were you born?</Text>
        <Text style={styles.subtitle}>Your age will be shown on your profile.</Text>

        <View style={styles.selectorRow}>
          {/* Day */}
          <TouchableOpacity
            style={[styles.selectorBtn, selectedDay !== null && styles.selectorBtnFilled]}
            onPress={() => setActivePicker('day')}
            activeOpacity={0.75}
          >
            <Text style={[styles.selectorText, selectedDay !== null && styles.selectorTextFilled]}>
              {dayLabel}
            </Text>
          </TouchableOpacity>

          {/* Month */}
          <TouchableOpacity
            style={[styles.selectorBtn, styles.selectorBtnWide, selectedMonth !== null && styles.selectorBtnFilled]}
            onPress={() => setActivePicker('month')}
            activeOpacity={0.75}
          >
            <Text style={[styles.selectorText, selectedMonth !== null && styles.selectorTextFilled]}>
              {monthLabel}
            </Text>
          </TouchableOpacity>

          {/* Year */}
          <TouchableOpacity
            style={[styles.selectorBtn, styles.selectorBtnWide, selectedYear !== null && styles.selectorBtnFilled]}
            onPress={() => setActivePicker('year')}
            activeOpacity={0.75}
          >
            <Text style={[styles.selectorText, selectedYear !== null && styles.selectorTextFilled]}>
              {yearLabel}
            </Text>
          </TouchableOpacity>
        </View>

        {age !== null && age < 18 && (
          <Text style={styles.ageWarning}>You must be 18 or older to use Volpair.</Text>
        )}
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={[styles.nextBtn, !canContinue && styles.nextBtnDisabled]}
          onPress={handleContinue}
          disabled={!canContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnText}>Continue →</Text>
        </TouchableOpacity>
      </View>

      {/* ── Picker Modal ── */}
      <Modal
        visible={activePicker !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setActivePicker(null)}
      >
        <View style={picker.overlay}>
          <TouchableOpacity style={picker.backdrop} onPress={() => setActivePicker(null)} activeOpacity={1} />
          <View style={picker.sheet}>
            <View style={picker.handle} />
            <Text style={picker.title}>
              {activePicker === 'day' ? 'Select Day' : activePicker === 'month' ? 'Select Month' : 'Select Year'}
            </Text>
            <FlatList
              data={
                activePicker === 'day' ? DAYS :
                activePicker === 'month' ? MONTHS :
                YEARS
              }
              keyExtractor={(item) => item.value}
              showsVerticalScrollIndicator={false}
              style={picker.list}
              renderItem={({ item }) => {
                const isSelected =
                  activePicker === 'day' ? selectedDay === item.value :
                  activePicker === 'month' ? selectedMonth === item.value :
                  selectedYear === item.value;
                return (
                  <TouchableOpacity
                    style={[picker.item, isSelected && picker.itemSelected]}
                    onPress={() => {
                      if (activePicker === 'day') setSelectedDay(item.value);
                      else if (activePicker === 'month') setSelectedMonth(item.value);
                      else setSelectedYear(item.value);
                      setActivePicker(null);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={[picker.itemText, isSelected && picker.itemTextSelected]}>
                      {item.label}
                    </Text>
                    {isSelected && <Text style={picker.itemCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: 24 },
  backBtn: {
    marginTop: 8, marginBottom: 4,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { color: theme.textPrimary, fontSize: 20, fontFamily: fonts.bodyBold },
  inner: { flex: 1, paddingTop: 8 },
  question: { fontSize: 26, fontFamily: fonts.headlineBold, color: theme.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 15, color: theme.textMuted, marginBottom: 32, lineHeight: 22, fontFamily: fonts.bodyLight },
  selectorRow: { flexDirection: 'row', gap: 10 },
  selectorBtn: {
    flex: 1,
    paddingVertical: 16, paddingHorizontal: 12,
    backgroundColor: theme.bgCard, borderRadius: 14,
    borderWidth: 1.5, borderColor: theme.border,
    alignItems: 'center',
  },
  selectorBtnWide: { flex: 1.4 },
  selectorBtnFilled: { borderColor: theme.primary, backgroundColor: theme.primaryDim },
  selectorText: { fontSize: 16, fontFamily: fonts.bodyBold, color: theme.textDim },
  selectorTextFilled: { color: theme.primary },
  ageWarning: {
    marginTop: 16, fontSize: 13, color: '#F87171',
    fontFamily: fonts.bodyLight, lineHeight: 18,
  },
  bottom: { paddingBottom: 12 },
  nextBtn: {
    backgroundColor: theme.primary, borderRadius: 16, padding: 18, alignItems: 'center',
    shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: theme.textPrimary, fontSize: 17, fontFamily: fonts.headlineBold },
});

const picker = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: theme.bgCard,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '65%',
    borderWidth: 1, borderColor: theme.border,
    paddingBottom: 32,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: theme.border,
    alignSelf: 'center', marginTop: 14, marginBottom: 6,
  },
  title: {
    fontSize: 16, fontFamily: fonts.bodyBold, color: theme.textSecondary,
    textAlign: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  list: { paddingHorizontal: 20 },
  item: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  itemSelected: { backgroundColor: 'transparent' },
  itemText: { fontSize: 17, color: theme.textPrimary, fontFamily: fonts.bodyLight },
  itemTextSelected: { color: theme.primary, fontFamily: fonts.bodyBold },
  itemCheck: { fontSize: 16, color: theme.primary },
});
