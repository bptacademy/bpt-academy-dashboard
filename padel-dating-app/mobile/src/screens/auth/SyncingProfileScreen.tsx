import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STEPS = [
  'Connecting to Playtomic…',
  'Importing your match history…',
  'Calculating your skill level…',
  'Finding your top clubs…',
  'Building your profile…',
];

export default function SyncingProfileScreen({ route, navigation }: any) {
  const { platform, platformEmail, platformPassword } = route.params ?? {};
  const insets = useSafeAreaInsets();
  const [stepIndex, setStepIndex] = useState(0);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Spin animation
  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
    ).start();
  }, []);

  // Step cycling + navigation
  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => {
        if (prev < STEPS.length - 1) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 1200);

    // After all steps, go to profile preview
    const timeout = setTimeout(() => {
      navigation.replace('ProfilePreview', { platform, platformEmail });
    }, STEPS.length * 1200 + 500);

    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, []);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1B2A" />

      <View style={styles.center}>
        <Animated.Text style={[styles.spinner, { transform: [{ rotate: spin }] }]}>
          🎾
        </Animated.Text>

        <Text style={styles.title}>Hang tight…</Text>
        <Text style={styles.step}>{STEPS[stepIndex]}</Text>

        <View style={styles.dotsRow}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i <= stepIndex && styles.dotActive]}
            />
          ))}
        </View>
      </View>

      <Text style={styles.footer}>
        We're building your profile from your real match history.{'\n'}No questionnaires. No guessing.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  spinner: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: theme.textPrimary },
  step: { fontSize: 15, color: theme.textMuted, textAlign: 'center' },
  dotsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.border },
  dotActive: { backgroundColor: theme.primary },
  footer: {
    fontSize: 13, color: theme.textDim, textAlign: 'center',
    lineHeight: 20, paddingBottom: 48,
  },
});
