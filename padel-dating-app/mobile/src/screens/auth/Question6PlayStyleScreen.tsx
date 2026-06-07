import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, fonts } from '../../lib/theme';
import OnboardingProgress from '../../components/common/OnboardingProgress';
import { ScreenBackground } from '../../components/ScreenBackground';

const STYLES = [
  {
    id: 'aggressive',
    emoji: '⚡',
    label: 'Aggressive',
    desc: 'I go for winners, attack at the net, dominate with pace',
  },
  {
    id: 'defensive',
    emoji: '🛡️',
    label: 'Defensive',
    desc: 'I keep the ball in play, wear opponents down, wait for errors',
  },
  {
    id: 'balanced',
    emoji: '⚖️',
    label: 'Balanced',
    desc: 'I adapt to the situation — attack when I can, defend when I must',
  },
  {
    id: 'serve_and_volley',
    emoji: '🎯',
    label: 'Serve & Volley',
    desc: 'I push forward every chance I get, love playing at the net',
  },
];

export default function Question6PlayStyleScreen({ route, navigation }: any) {
  const { first_name, last_name, date_of_birth, city, looking_for, visible_to, bio, level_value } = route.params ?? {};
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<string | null>(null);

  const handleContinue = () => {
    if (!selected) return;
    navigation.navigate('Question7Availability', {
      first_name, last_name, date_of_birth,
      city, looking_for, visible_to, bio, level_value, play_style: selected,
    });
  };

  return (
    <ScreenBackground>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      
      <View style={styles.inner}>
        <OnboardingProgress total={9} current={8} />

        <Text style={styles.title}>Your play style?</Text>
        <Text style={styles.subtitle}>
          This helps us pair you with compatible partners. Connecting your booking platform will refine this automatically.
        </Text>

        <View style={styles.options}>
          {STYLES.map(s => {
            const active = selected === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => setSelected(s.id)}
                activeOpacity={0.75}
              >
                <Text style={styles.optionEmoji}>{s.emoji}</Text>
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                    {s.label}
                  </Text>
                  <Text style={[styles.optionDesc, active && styles.optionDescActive]}>
                    {s.desc}
                  </Text>
                </View>
                {active && <View style={styles.checkDot} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.btn, !selected && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={!selected}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>Continue →</Text>
        </TouchableOpacity>
      </View>
    </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  inner: { flex: 1, paddingHorizontal: 24, paddingBottom: 32 },
  title: {
    fontSize: 26, fontFamily: fonts.headlineBold,
    color: theme.textPrimary, marginBottom: 10, marginTop: 8,
  },
  subtitle: {
    fontSize: 14, color: theme.textMuted, lineHeight: 22,
    marginBottom: 28, fontFamily: fonts.bodyLight,
  },
  options: { gap: 10, marginBottom: 28 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: theme.bgCard, borderRadius: 16,
    padding: 14, borderWidth: 1.5, borderColor: theme.border,
  },
  optionActive: { borderColor: theme.primary, backgroundColor: theme.primaryDim },
  optionEmoji: { fontSize: 22, width: 32, textAlign: 'center' },
  optionText: { flex: 1 },
  optionLabel: {
    fontSize: 16.1, fontFamily: fonts.bodyBold, color: theme.textPrimary, marginBottom: 2,
  },
  optionLabelActive: { color: theme.primary },
  optionDesc: { fontSize: 12.8, color: theme.textMuted, fontFamily: fonts.bodyLight, lineHeight: 17 },
  optionDescActive: { color: 'rgba(0,212,200,0.7)' },
  checkDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.primary },
  btn: {
    backgroundColor: theme.primary, borderRadius: 16,
    paddingVertical: 17, alignItems: 'center', marginTop: 'auto',
  },
  btnDisabled: { opacity: 0.35 },
  btnText: { color: '#05020E', fontSize: 16, fontFamily: fonts.headlineBold },
});
