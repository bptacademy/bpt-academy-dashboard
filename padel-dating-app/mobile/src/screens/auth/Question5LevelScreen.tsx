import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, ScrollView,
  ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, fonts } from '../../lib/theme';
import OnboardingProgress from '../../components/common/OnboardingProgress';
const _BG = require('../../../assets/volpair-bg-v2.png');

const LEVELS = [
  { value: 1.5, label: 'Just starting out',    sublabel: 'Still learning the basics',              emoji: '🌱' },
  { value: 2.5, label: 'Beginner',              sublabel: 'Comfortable rallying, learning tactics',  emoji: '🎾' },
  { value: 3.0, label: 'Intermediate',          sublabel: 'Consistent player, winning some matches', emoji: '⚡' },
  { value: 3.5, label: 'Intermediate+',         sublabel: 'Strong fundamentals, competitive',        emoji: '🔥' },
  { value: 4.0, label: 'Competitive',           sublabel: 'Playing in local leagues',                emoji: '🏆' },
  { value: 4.5, label: 'Advanced',              sublabel: 'High win rate, strong game sense',        emoji: '⭐' },
  { value: 5.0, label: 'Advanced+',             sublabel: 'Tournament-level player',                 emoji: '🥇' },
  { value: 5.5, label: 'Elite',                 sublabel: 'Professional or semi-professional',       emoji: '👑' },
];

export default function Question5LevelScreen({ route, navigation }: any) {
  const { first_name, last_name, date_of_birth, city, looking_for, visible_to, bio } = route.params ?? {};
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<number | null>(null);

  const handleContinue = () => {
    if (selected === null) return;
    navigation.navigate('Question6PlayStyle', {
      first_name, last_name, date_of_birth,
      city, looking_for, visible_to, bio, level_value: selected,
    });
  };

  return (
      <ImageBackground source={_BG} style={{ flex: 1 }} resizeMode="cover">
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      
      <ScrollView
        contentContainerStyle={styles.inner}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <OnboardingProgress total={9} current={7} />

        <Text style={styles.title}>What's your level?</Text>
        <Text style={styles.subtitle}>
          Be honest — it helps us match you with the right players. If you connect your booking platform later, this will be updated automatically.
        </Text>

        <View style={styles.options}>
          {LEVELS.map(l => {
            const active = selected === l.value;
            return (
              <TouchableOpacity
                key={l.value}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => setSelected(l.value)}
                activeOpacity={0.75}
              >
                <Text style={styles.optionEmoji}>{l.emoji}</Text>
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                    {l.label}
                  </Text>
                  <Text style={[styles.optionSublabel, active && styles.optionSublabelActive]}>
                    {l.sublabel}
                  </Text>
                </View>
                {active && <View style={styles.checkDot} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.btn, selected === null && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={selected === null}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>Continue →</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  inner: { paddingHorizontal: 24, paddingBottom: 32 },
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
  optionActive: {
    borderColor: theme.primary, backgroundColor: theme.primaryDim,
  },
  optionEmoji: { fontSize: 22, width: 32, textAlign: 'center' },
  optionText: { flex: 1 },
  optionLabel: {
    fontSize: 16.1, fontFamily: fonts.bodyBold, color: theme.textPrimary, marginBottom: 2,
  },
  optionLabelActive: { color: theme.primary },
  optionSublabel: {
    fontSize: 12.8, color: theme.textMuted, fontFamily: fonts.bodyLight,
  },
  optionSublabelActive: { color: 'rgba(0,212,200,0.7)' },
  checkDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: theme.primary,
  },
  btn: {
    backgroundColor: theme.primary, borderRadius: 16,
    paddingVertical: 17, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.35 },
  btnText: { color: '#05020E', fontSize: 16, fontFamily: fonts.headlineBold },
});
