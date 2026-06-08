import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, fonts } from '../../lib/theme';

const HIGHLIGHTS = [
  { icon: '💘', text: "Discover players you've shared a court with", color: '#A78BFA' },
  { icon: '🎾', text: 'Find a doubles partner at your level', color: '#0ACCB5' },
  { icon: '⚡', text: 'Your Volpair score builds with every match', color: '#0ACCB5' },
];

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
      
      <View style={styles.center}>
        <Animated.View style={[styles.emojiContainer, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.emoji}>🎾</Text>
        </Animated.View>
        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
          <Text style={styles.title}>{"You're in."}</Text>
          <Text style={styles.subtitle}>Your first match is waiting.</Text>
          <View style={styles.highlights}>
            {HIGHLIGHTS.map((item, i) => (
              <View key={i} style={styles.highlight}>
                <Text style={styles.highlightIcon}>{item.icon}</Text>
                <Text style={[styles.highlightText, { color: item.color }]}>{item.text}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </View>
      <Animated.View style={[styles.bottom, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.replace('MainTabs')} activeOpacity={0.85}>
          <Text style={styles.btnText}>Find your pair →</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', paddingHorizontal: 28 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emojiContainer: {
    width: 100, height: 100, borderRadius: 30,
    backgroundColor: theme.primaryDim, alignItems: 'center', justifyContent: 'center',
    marginBottom: 28, borderWidth: 2, borderColor: theme.primaryBorder,
  },
  emoji: { fontSize: 52 },
  title: { fontSize: 44, fontFamily: fonts.headlineBold, color: theme.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 19.3, color: theme.primary, marginBottom: 40, fontFamily: fonts.bodyBold },
  highlights: { gap: 12, width: '100%' },
  highlight: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: theme.bgCard, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: theme.border,
  },
  highlightIcon: { fontSize: 22 },
  highlightText: { flex: 1, fontSize: 15, lineHeight: 20, fontFamily: fonts.bodyLight },
  bottom: { paddingBottom: 12 },
  btn: {
    backgroundColor: theme.primary, borderRadius: 16, padding: 20, alignItems: 'center',
    shadowColor: theme.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 8,
  },
  btnText: { color: '#05020E', fontSize: 18, fontFamily: fonts.headlineBold, letterSpacing: 0.3 },
});
