import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Animated, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../lib/theme';

const { height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

      {/* Accent blobs */}
      <View style={styles.blobTurquoise} />
      <View style={styles.blobViolet} />

      <Animated.View style={[styles.center, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>🎾</Text>
        </View>
        <Text style={styles.logo}>volpair</Text>
        <View style={styles.taglineRow}>
          <Text style={styles.taglineTurquoise}>Play</Text>
          <Text style={styles.taglineDot}> · </Text>
          <Text style={styles.taglineViolet}>Connect</Text>
          <Text style={styles.taglineDot}> · </Text>
          <Text style={styles.taglineWhite}>Match</Text>
        </View>
        <Text style={styles.subTagline}>The court is where it starts.</Text>
      </Animated.View>

      <Animated.View style={[styles.bottom, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('EmailSignup')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Get started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('EmailSignup')}
          activeOpacity={0.75}
        >
          <Text style={styles.secondaryBtnText}>Sign in</Text>
        </TouchableOpacity>

        <Text style={styles.legalNote}>
          By continuing you agree to our Terms of Service and Privacy Policy
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: 28 },
  blobTurquoise: {
    position: 'absolute', top: -height * 0.1, right: -60,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: theme.primary, opacity: 0.07,
  },
  blobViolet: {
    position: 'absolute', bottom: height * 0.2, left: -80,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: theme.secondary, opacity: 0.08,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logoContainer: {
    width: 84, height: 84, borderRadius: 26,
    backgroundColor: theme.primaryDim,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    borderWidth: 1.5, borderColor: theme.primaryBorder,
  },
  logoEmoji: { fontSize: 40 },
  logo: {
    fontSize: 52, fontWeight: '800', color: theme.textPrimary,
    letterSpacing: -2, marginBottom: 12,
  },
  taglineRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  taglineTurquoise: { fontSize: 20, fontWeight: '700', color: theme.primary },
  taglineViolet: { fontSize: 20, fontWeight: '700', color: '#A78BFA' },
  taglineWhite: { fontSize: 20, fontWeight: '700', color: theme.textPrimary },
  taglineDot: { fontSize: 20, color: theme.textMuted },
  subTagline: { fontSize: 15, color: theme.textMuted, textAlign: 'center' },
  bottom: { paddingBottom: 12, gap: 12 },
  primaryBtn: {
    backgroundColor: theme.primary, borderRadius: 16, padding: 18, alignItems: 'center',
    shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 6,
  },
  primaryBtnText: { color: '#0D1B2A', fontSize: 17, fontWeight: '800', letterSpacing: 0.2 },
  secondaryBtn: {
    borderRadius: 16, padding: 18, alignItems: 'center',
    borderWidth: 1.5, borderColor: theme.primaryBorder,
    backgroundColor: theme.primaryDim,
  },
  secondaryBtnText: { color: theme.primary, fontSize: 17, fontWeight: '700' },
  legalNote: { fontSize: 11, color: theme.textDim, textAlign: 'center', lineHeight: 16 },
});
