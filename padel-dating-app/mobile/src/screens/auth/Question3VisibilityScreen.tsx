import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OnboardingProgress from '../../components/common/OnboardingProgress';

const OPTIONS = [
  { id: 'everyone',      emoji: '🌍', label: 'Everyone',       desc: 'Show my profile to all players' },
  { id: 'women',         emoji: '👩', label: 'Women only',     desc: 'Only visible to women' },
  { id: 'men',           emoji: '👨', label: 'Men only',       desc: 'Only visible to men' },
  { id: 'no_preference', emoji: '🤝', label: 'No preference',  desc: 'Same as everyone — just less specific' },
];

export default function Question3VisibilityScreen({ route, navigation }: any) {
  const { city, looking_for } = route.params ?? {};
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<string | null>(null);

  const handleContinue = () => {
    if (!selected) return;
    navigation.navigate('Question4Bio', { city, looking_for, visible_to: selected });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1B2A" />

      <View style={styles.inner}>
        <OnboardingProgress total={4} current={3} />

        <Text style={styles.question}>👀 Who do you want to be seen by?</Text>
        <Text style={styles.subtitle}>You can change this any time from your profile.</Text>

        <View style={styles.optionsList}>
          {OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              style={[styles.optionCard, selected === opt.id && styles.optionCardActive]}
              onPress={() => setSelected(opt.id)}
              activeOpacity={0.75}
            >
              <Text style={styles.optionEmoji}>{opt.emoji}</Text>
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, selected === opt.id && styles.optionLabelActive]}>
                  {opt.label}
                </Text>
                <Text style={styles.optionDesc}>{opt.desc}</Text>
              </View>
              <View style={[styles.radio, selected === opt.id && styles.radioActive]}>
                {selected === opt.id && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={[styles.nextBtn, !selected && styles.nextBtnDisabled]}
          onPress={handleContinue}
          disabled={!selected}
        >
          <Text style={styles.nextBtnText}>Continue →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: 24 },
  inner: { flex: 1, paddingTop: 24 },
  question: { fontSize: 26, fontWeight: '800', color: theme.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 15, color: theme.textMuted, marginBottom: 28, lineHeight: 22 },
  optionsList: { gap: 10 },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: theme.bgCard, borderRadius: 16, padding: 18,
    borderWidth: 1.5, borderColor: theme.border,
  },
  optionCardActive: { borderColor: theme.primary, backgroundColor: 'rgba(230,63,107,0.06)' },
  optionEmoji: { fontSize: 26, width: 36, textAlign: 'center' },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 16, fontWeight: '700', color: theme.textPrimary, marginBottom: 2 },
  optionLabelActive: { color: theme.primary },
  optionDesc: { fontSize: 13, color: theme.textMuted },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: theme.textDim,
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: theme.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.primary },
  bottom: { paddingBottom: 12 },
  nextBtn: {
    backgroundColor: theme.primary, borderRadius: 16, padding: 18, alignItems: 'center',
    shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: theme.textPrimary, fontSize: 17, fontWeight: '700' },
});
