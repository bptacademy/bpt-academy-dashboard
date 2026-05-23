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

  // --- Logo ---
  const logoScale   = useRef(new Animated.Value(0.55)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoY       = useRef(new Animated.Value(20)).current;

  // --- Glow ring 1 (close pulse) ---
  const ring1Scale   = useRef(new Animated.Value(0.8)).current;
  const ring1Opacity = useRef(new Animated.Value(0)).current;

  // --- Glow ring 2 (far pulse) ---
  const ring2Scale   = useRef(new Animated.Value(0.8)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;

  // --- Wordmark ---
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkY       = useRef(new Animated.Value(8)).current;

  // --- Tagline ---
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY       = useRef(new Animated.Value(6)).current;

  // --- Screen fade out ---
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const ease = Animated.spring;

    // 1. Logo springs in (0–600ms)
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 55,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.spring(logoY, {
        toValue: 0,
        tension: 55,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Ring 1 pulses outward (starts at 350ms)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(ring1Opacity, {
          toValue: 0.5,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(ring1Scale, {
          toValue: 1.55,
          duration: 700,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.timing(ring1Opacity, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }).start();
      });
    }, 350);

    // 3. Ring 2 pulses outward slightly later (starts at 550ms) — outer ring
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(ring2Opacity, {
          toValue: 0.25,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(ring2Scale, {
          toValue: 2.1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.timing(ring2Opacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start();
      });
    }, 550);

    // 4. Wordmark rises in (starts at 700ms)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(wordmarkOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(wordmarkY, {
          toValue: 0,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }, 700);

    // 5. Tagline rises in (starts at 950ms)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(taglineY, {
          toValue: 0,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }, 950);

    // 6. Hold, then fade out entire screen (starts at 2500ms)
    setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, 2500);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Background glow blobs */}
      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowBottom} />

      {/* Pulse ring 2 — outer */}
      <Animated.View
        style={[
          styles.pulseRing,
          {
            opacity: ring2Opacity,
            transform: [{ scale: ring2Scale }],
            borderColor: 'rgba(124, 58, 237, 0.4)',
          },
        ]}
      />

      {/* Pulse ring 1 — inner */}
      <Animated.View
        style={[
          styles.pulseRing,
          {
            opacity: ring1Opacity,
            transform: [{ scale: ring1Scale }],
            borderColor: 'rgba(0, 212, 200, 0.5)',
          },
        ]}
      />

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoWrapper,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }, { translateY: logoY }],
          },
        ]}
      >
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
      </Animated.View>

      {/* Wordmark */}
      <Animated.Text
        style={[
          styles.wordmark,
          {
            opacity: wordmarkOpacity,
            transform: [{ translateY: wordmarkY }],
          },
        ]}
      >
        volpair
      </Animated.Text>

      {/* Tagline */}
      <Animated.Text
        style={[
          styles.tagline,
          {
            opacity: taglineOpacity,
            transform: [{ translateY: taglineY }],
          },
        ]}
      >
        EVERY RALLY STARTS WITH A MATCH.
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1628',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgGlowTop: {
    position: 'absolute',
    top: -height * 0.15,
    alignSelf: 'center',
    width: width * 1.1,
    height: height * 0.55,
    borderRadius: height * 0.28,
    backgroundColor: '#7C3AED',
    opacity: 0.18,
  },
  bgGlowBottom: {
    position: 'absolute',
    bottom: -height * 0.18,
    alignSelf: 'center',
    width: width * 0.85,
    height: height * 0.45,
    borderRadius: height * 0.23,
    backgroundColor: '#00D4C8',
    opacity: 0.12,
  },
  pulseRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  logo: {
    width: 220,
    height: 220,
  },
  wordmark: {
    fontFamily: 'Brinnan Bold',
    fontSize: 32,
    letterSpacing: 10,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 8,
  },
  tagline: {
    fontFamily: 'Brinnan Light',
    fontSize: 10,
    letterSpacing: 3,
    color: '#00D4C8',
    textAlign: 'center',
    marginTop: 12,
    opacity: 0.85,
  },
});
