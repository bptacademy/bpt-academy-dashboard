/**
 * DiscoveryLoader — 3 variants of the "algorithm is working" loading screen
 * shown on Connect after the user taps "Start discovering" for the first time.
 *
 * Variant A — Stepped progress bar with algorithm phases
 * Variant B — Radar pulse animation with scanning feel
 * Variant C — Score building: animated number counting up to reveal a score
 *
 * Switch the default export or pass variant prop to preview each.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, Easing,
} from 'react-native';
import { theme } from '../lib/theme';

// ─── Variant A — Stepped progress bar ────────────────────────────────────────
// Shows the algorithm phases one by one with a filling progress bar

const STEPS_A = [
  { label: 'Getting your location…', icon: '📍' },
  { label: 'Scanning nearby players…', icon: '🔍' },
  { label: 'Analysing skill compatibility…', icon: '🎾' },
  { label: 'Calculating Volpair scores…', icon: '⚡' },
  { label: 'Ranking your top picks…', icon: '🎯' },
];

export function DiscoveryLoaderA() {
  const [stepIndex, setStepIndex] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Step through phases
    const interval = setInterval(() => {
      setStepIndex(i => {
        if (i < STEPS_A.length - 1) return i + 1;
        clearInterval(interval);
        return i;
      });
    }, 900);

    // Smooth progress bar fill over ~5s
    Animated.timing(progress, {
      toValue: 1,
      duration: 4800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    return () => clearInterval(interval);
  }, []);

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const currentStep = STEPS_A[stepIndex];

  return (
    <View style={stylesA.container}>
      <Text style={stylesA.icon}>{currentStep.icon}</Text>
      <Text style={stylesA.title}>Finding your matches</Text>
      <Text style={stylesA.stepLabel}>{currentStep.label}</Text>

      {/* Progress track */}
      <View style={stylesA.track}>
        <Animated.View style={[stylesA.fill, { width }]} />
      </View>

      {/* Step dots */}
      <View style={stylesA.dots}>
        {STEPS_A.map((_, i) => (
          <View
            key={i}
            style={[stylesA.dot, i <= stepIndex && stylesA.dotActive]}
          />
        ))}
      </View>

      <Text style={stylesA.hint}>Sorting by compatibility, not just distance</Text>
    </View>
  );
}

const stylesA = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, gap: 16,
  },
  icon: { fontSize: 52, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '800', color: theme.textPrimary, textAlign: 'center' },
  stepLabel: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', minHeight: 20 },
  track: {
    width: '100%', height: 6, borderRadius: 3,
    backgroundColor: theme.bgCard, overflow: 'hidden',
    marginTop: 8,
  },
  fill: {
    height: 6, borderRadius: 3,
    backgroundColor: theme.primary,
  },
  dots: { flexDirection: 'row', gap: 8, marginTop: 4 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.border,
  },
  dotActive: { backgroundColor: theme.primary, borderColor: theme.primaryBorder },
  hint: { fontSize: 12, color: theme.textMuted, textAlign: 'center', marginTop: 8 },
});

// ─── Variant B — Radar pulse ──────────────────────────────────────────────────
// 3 expanding rings pulse outward from a central court icon — feels like scanning

export function DiscoveryLoaderB() {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;
  const [phase, setPhase] = useState(0);

  const PHASES = [
    'Scanning your area…',
    'Found players nearby…',
    'Calculating compatibility…',
    'Almost ready…',
  ];

  useEffect(() => {
    const pulse = (ring: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(ring, {
            toValue: 1,
            duration: 1800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(ring, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();

    pulse(ring1, 0);
    pulse(ring2, 600);
    pulse(ring3, 1200);

    const interval = setInterval(() => {
      setPhase(p => (p < PHASES.length - 1 ? p + 1 : p));
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  const ringStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.5, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] }) }],
  });

  return (
    <View style={stylesB.container}>
      <View style={stylesB.radarWrapper}>
        <Animated.View style={[stylesB.ring, ringStyle(ring1)]} />
        <Animated.View style={[stylesB.ring, ringStyle(ring2)]} />
        <Animated.View style={[stylesB.ring, ringStyle(ring3)]} />
        <View style={stylesB.core}>
          <Text style={stylesB.coreIcon}>🎾</Text>
        </View>
      </View>

      <Text style={stylesB.title}>Scanning your area</Text>
      <Text style={stylesB.phase}>{PHASES[phase]}</Text>
      <Text style={stylesB.hint}>Finding players sorted by your Volpair score</Text>
    </View>
  );
}

const RADAR_SIZE = 130;

const stylesB = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, gap: 20,
  },
  radarWrapper: {
    width: RADAR_SIZE, height: RADAR_SIZE,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  ring: {
    position: 'absolute',
    width: RADAR_SIZE, height: RADAR_SIZE, borderRadius: RADAR_SIZE / 2,
    borderWidth: 2, borderColor: theme.primary,
  },
  core: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: theme.primaryDim,
    borderWidth: 2, borderColor: theme.primaryBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  coreIcon: { fontSize: 28 },
  title: { fontSize: 22, fontWeight: '800', color: theme.textPrimary, textAlign: 'center' },
  phase: { fontSize: 14, color: theme.primary, fontWeight: '600', textAlign: 'center' },
  hint: { fontSize: 12, color: theme.textMuted, textAlign: 'center', lineHeight: 18 },
});

// ─── Variant C — Score reveal ─────────────────────────────────────────────────
// A score counter animates from 0 → 94, then the screen transitions to "Ready!"
// Teases the product's core promise before showing the real cards.

export function DiscoveryLoaderC() {
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const fadeIn = useRef(new Animated.Value(0)).current;
  const scaleIn = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Count up to 94
    let current = 0;
    const target = 94;
    const totalDuration = 2600;
    const stepMs = totalDuration / target;

    const interval = setInterval(() => {
      current += 1;
      setScore(current);
      if (current >= target) {
        clearInterval(interval);
        setTimeout(() => {
          setDone(true);
          Animated.parallel([
            Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.spring(scaleIn, { toValue: 1, friction: 5, useNativeDriver: true }),
          ]).start();
        }, 400);
      }
    }, stepMs);

    return () => clearInterval(interval);
  }, []);

  const scoreColor = score >= 85 ? theme.scoreHigh : score >= 70 ? theme.scoreMid : theme.textMuted;

  return (
    <View style={stylesC.container}>
      {!done ? (
        <>
          <Text style={stylesC.eyebrow}>Calculating your top match</Text>
          <Text style={[stylesC.scoreNum, { color: scoreColor }]}>{score}</Text>
          <Text style={stylesC.scoreSub}>Volpair Score</Text>
          <Text style={stylesC.hint}>
            Based on skill level · play style · location · availability
          </Text>
        </>
      ) : (
        <Animated.View style={[stylesC.doneBox, { opacity: fadeIn, transform: [{ scale: scaleIn }] }]}>
          <Text style={stylesC.doneIcon}>🎯</Text>
          <Text style={stylesC.doneTitle}>Your picks are ready</Text>
          <Text style={stylesC.doneSub}>We found compatible players near you</Text>
        </Animated.View>
      )}
    </View>
  );
}

const stylesC = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, gap: 12,
  },
  eyebrow: { fontSize: 13, color: theme.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  scoreNum: {
    fontSize: 96, fontWeight: '800', lineHeight: 100,
    textAlign: 'center',
  },
  scoreSub: { fontSize: 16, color: theme.textSecondary, fontWeight: '600' },
  hint: { fontSize: 12, color: theme.textMuted, textAlign: 'center', lineHeight: 20, marginTop: 8 },
  doneBox: { alignItems: 'center', gap: 12 },
  doneIcon: { fontSize: 56 },
  doneTitle: { fontSize: 24, fontWeight: '800', color: theme.textPrimary, textAlign: 'center' },
  doneSub: { fontSize: 14, color: theme.textSecondary, textAlign: 'center' },
});

// ─── Default export — change variant here to preview ─────────────────────────
// Options: DiscoveryLoaderA | DiscoveryLoaderB | DiscoveryLoaderC

export default DiscoveryLoaderA;
