import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Animated, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
      <StatusBar barStyle="light-content" backgroundColor="#0D1B2A" />
      <View style={styles.bgAccent} />

      <Animated.View style={[styles.center, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>🎾</Text>
        </View>
        <Text style={styles.logo}>volpair</Text>
        <Text style={styles.tagline}>Find your pair.</Text>
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

        <Text style={styles.legalNote}>
          By continuing you agree to our Terms of Service and Privacy Policy
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B2A', paddingHorizontal: 28 },
  bgAccent: {
    position: 'absolute', top: -height * 0.15, right: -80,
    width: 320, height: 320, borderRadius: 160,
    backgroundColor: '#E63F6B', opacity: 0.08,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logoContainer: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: 'rgba(230,63,107,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  logoEmoji: { fontSize: 38 },
  logo: { fontSize: 52, fontWeight: '800', color: '#FFFFFF', letterSpacing: -2, marginBottom: 8 },
  tagline: { fontSize: 22, color: '#E63F6B', fontWeight: '600', marginBottom: 12 },
  subTagline: { fontSize: 15, color: '#4A6080', textAlign: 'center', lineHeight: 22 },
  bottom: { paddingBottom: 12, gap: 12 },
  primaryBtn: {
    backgroundColor: '#E63F6B', borderRadius: 16, padding: 18, alignItems: 'center',
    shadowColor: '#E63F6B', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
  legalNote: { fontSize: 11, color: '#2A3C52', textAlign: 'center', lineHeight: 16, marginTop: 4 },
});
