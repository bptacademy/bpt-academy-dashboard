import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OnboardingCompleteScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1B2A" />

      <View style={styles.center}>
        <Animated.View style={[styles.emojiContainer, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.emoji}>🎾</Text>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
          <Text style={styles.title}>You're in.</Text>
          <Text style={styles.subtitle}>Your first match is waiting.</Text>

          <View style={styles.highlights}>
            <View style={styles.highlight}>
              <Text style={styles.highlightIcon}>💘</Text>
              <Text style={styles.highlightText}>Discover players you've shared a court with</Text>
            </View>
            <View style={styles.highlight}>
              <Text style={styles.highlightIcon}>🎾</Text>
              <Text style={styles.highlightText}>Find a doubles partner at your level</Text>
            </View>
            <View style={styles.highlight}>
              <Text style={styles.highlightIcon}>⚡</Text>
              <Text style={styles.highlightText}>Your Volpair score builds with every match</Text>
            </View>
          </View>
        </Animated.View>
      </View>

      <Animated.View style={[styles.bottom, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => navigation.replace('MainTabs')}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>Find your pair →</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B2A', paddingHorizontal: 28 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emojiContainer: {
    width: 100, height: 100, borderRadius: 30,
    backgroundColor: 'rgba(230,63,107,0.15)', alignItems: 'center', justifyContent: 'center',
    marginBottom: 28,
  },
  emoji: { fontSize: 52 },
  title: { fontSize: 44, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 18, color: '#E63F6B', marginBottom: 40, fontWeight: '500' },
  highlights: { gap: 16, width: '100%' },
  highlight: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#111E2E', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#1A2C42',
  },
  highlightIcon: { fontSize: 22 },
  highlightText: { flex: 1, fontSize: 14, color: '#7A9CC0', lineHeight: 20 },
  bottom: { paddingBottom: 12 },
  btn: {
    backgroundColor: '#E63F6B', borderRadius: 16, padding: 20, alignItems: 'center',
    shadowColor: '#E63F6B', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 8,
  },
  btnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: 0.3 },
});
