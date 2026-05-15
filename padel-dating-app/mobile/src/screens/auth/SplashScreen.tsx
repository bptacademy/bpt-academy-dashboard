import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions, StatusBar, Image,
} from 'react-native';

const { width, height } = Dimensions.get('window');
const LOGO = require('../../../assets/volpair-logo-nobg.png');

interface Props {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: Props) {
  // Phase 1 — logo scales in from small
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  // Phase 2 — glow pulse (scale breathes outward)
  const glowScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  // Phase 3 — whole screen fades out
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // Step 1: Logo scales + fades in (0 → 600ms)
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),

      // Step 2: Glow pulse — rings bloom outward then fade (600ms → 1400ms)
      Animated.parallel([
        Animated.timing(glowOpacity, {
          toValue: 0.6,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(glowScale, {
          toValue: 1.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),

      // Step 3: Glow fades out, hold for a beat
      Animated.parallel([
        Animated.timing(glowOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(glowScale, {
          toValue: 1.6,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),

      // Step 4: Hold on fully loaded logo
      Animated.delay(300),

      // Step 5: Whole screen fades to black → transition
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish();
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Background radial glow blobs */}
      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowBottom} />

      {/* Glow ring behind logo */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
      />

      {/* Logo image — Andrei's neon heart with glow */}
      <Animated.View
        style={[
          styles.logoWrapper,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A0A3B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgGlowTop: {
    position: 'absolute',
    top: -height * 0.1,
    width: width * 1.2,
    height: height * 0.6,
    borderRadius: height * 0.3,
    backgroundColor: '#6B21A8',
    opacity: 0.45,
  },
  bgGlowBottom: {
    position: 'absolute',
    bottom: -height * 0.15,
    width: width * 0.9,
    height: height * 0.5,
    borderRadius: height * 0.25,
    backgroundColor: '#3B0764',
    opacity: 0.5,
  },
  glowRing: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 200, 0.3)',
    shadowColor: '#00D4C8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 260,
    height: 260,
  },
});
