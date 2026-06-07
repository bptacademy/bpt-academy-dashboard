import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Animated, Dimensions, Image, ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../../lib/theme';

const { width, height } = Dimensions.get('window');
const LOGO = require('../../../assets/volpair-logo-nobg.png');
const BG = require('../../../assets/volpair-bg-v2.png');
const LOGO_SIZE = width * 0.65;

export default function WelcomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  const logoScale = useRef(new Animated.Value(0.65)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.8)).current;

  const btnOpacity = useRef(new Animated.Value(0)).current;
  const btnSlide = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(glowOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(glowScale, { toValue: 1.2, duration: 1400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(glowOpacity, { toValue: 0, duration: 900, useNativeDriver: true }),
        Animated.timing(glowScale, { toValue: 1.5, duration: 900, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(btnOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(btnSlide, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <ImageBackground
      source={BG}
      style={styles.container}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Dark overlay so buttons stay legible */}
      <View style={styles.overlay} />

      {/* Glow ring pulse behind logo */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
      />

      {/* Logo — transparent PNG, animated */}
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

      {/* Buttons */}
      <Animated.View
        style={[
          styles.bottom,
          { paddingBottom: insets.bottom + 16 },
          {
            opacity: btnOpacity,
            transform: [{ translateY: btnSlide }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('PhoneAuth', { mode: 'register' })}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Get started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('PhoneAuth', { mode: 'login' })}
          activeOpacity={0.75}
        >
          <Text style={styles.secondaryBtnText}>Sign in</Text>
        </TouchableOpacity>

        <Text style={styles.legalNote}>
          By continuing you agree to our Terms of Service and Privacy Policy
        </Text>
      </Animated.View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#120730',
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 4, 30, 0.45)',
  },

  // Glow ring pulse
  glowRing: {
    position: 'absolute',
    width: LOGO_SIZE * 0.75,
    height: LOGO_SIZE * 0.75,
    borderRadius: LOGO_SIZE * 0.375,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 212, 200, 0.5)',
    backgroundColor: 'transparent',
  },

  // Logo
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: height * 0.12,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },

  // Buttons
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: '#0ACCB5',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#0ACCB5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
  },
  primaryBtnText: {
    color: '#0D1B2A',
    fontSize: 17,
    fontFamily: fonts.headlineBold,
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0,212,200,0.25)',
    backgroundColor: 'rgba(0,212,200,0.12)',
  },
  secondaryBtnText: {
    color: '#0ACCB5',
    fontSize: 17,
    fontFamily: fonts.bodyBold,
  },
  legalNote: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    lineHeight: 16,
    fontFamily: fonts.bodyLight,
  },
});
