import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../lib/theme';

// Mock — will use route.params.matchedUserId to fetch real user
const MOCK_MATCH = { name: 'Sofia', emoji: '🎾' };

export default function MutualVolleyMatchScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const scaleA = useRef(new Animated.Value(0.3)).current;
  const scaleB = useRef(new Animated.Value(0.3)).current;
  const fadeText = useRef(new Animated.Value(0)).current;
  const scaleBadge = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleA, { toValue: 1, friction: 4, useNativeDriver: true }),
        Animated.spring(scaleB, { toValue: 1, friction: 4, delay: 200, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(scaleBadge, { toValue: 1, friction: 4, useNativeDriver: true }),
        Animated.timing(fadeText, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const handleSendServe = () => {
    navigation.navigate('Conversation', { connectionId: 'mock-connection-id' });
  };

  const handleMaybeLater = () => {
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

      {/* Background glow */}
      <View style={styles.glowViolet} />
      <View style={styles.glowTurquoise} />

      <View style={styles.center}>
        {/* Avatars */}
        <View style={styles.avatarRow}>
          <Animated.View style={[styles.avatarCircle, { transform: [{ scale: scaleA }] }]}>
            <Text style={styles.avatarEmoji}>👤</Text>
          </Animated.View>
          <Animated.View style={[styles.matchBadge, { transform: [{ scale: scaleBadge }] }]}>
            <Text style={styles.matchBadgeEmoji}>💘</Text>
          </Animated.View>
          <Animated.View style={[styles.avatarCircle, styles.avatarCircleB, { transform: [{ scale: scaleB }] }]}>
            <Text style={styles.avatarEmoji}>{MOCK_MATCH.emoji}</Text>
          </Animated.View>
        </View>

        <Animated.View style={{ opacity: fadeText, alignItems: 'center' }}>
          <Text style={styles.title}>It's a match!</Text>
          <Text style={styles.subtitle}>
            You and {MOCK_MATCH.name} both sent a Volley.
          </Text>
          <View style={styles.courtCard}>
            <Text style={styles.courtText}>The court is yours.</Text>
          </View>
        </Animated.View>
      </View>

      <Animated.View style={[styles.bottom, { opacity: fadeText }]}>
        <TouchableOpacity style={styles.serveBtn} onPress={handleSendServe} activeOpacity={0.85}>
          <Text style={styles.serveBtnText}>Send your first Serve →</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleMaybeLater}>
          <Text style={styles.laterText}>Maybe later</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: 28 },
  glowViolet: {
    position: 'absolute', top: '20%', left: -80,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: theme.secondary, opacity: 0.1,
  },
  glowTurquoise: {
    position: 'absolute', bottom: '20%', right: -80,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: theme.primary, opacity: 0.08,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 24 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  avatarCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: theme.primaryDim, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: theme.primaryBorder,
  },
  avatarCircleB: {
    backgroundColor: theme.secondaryDim, borderColor: theme.secondaryBorder,
  },
  avatarEmoji: { fontSize: 40 },
  matchBadge: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: theme.secondaryDim, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: theme.secondaryBorder,
    zIndex: 1, marginHorizontal: -8,
  },
  matchBadgeEmoji: { fontSize: 24 },
  title: { fontSize: 36, fontWeight: '800', color: theme.textPrimary, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: theme.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 20 },
  courtCard: {
    backgroundColor: theme.primaryDim, borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14,
    borderWidth: 1.5, borderColor: theme.primaryBorder,
  },
  courtText: { fontSize: 18, fontWeight: '700', color: theme.primary },
  bottom: { paddingBottom: 12, gap: 12 },
  serveBtn: {
    backgroundColor: theme.primary, borderRadius: 16, padding: 18, alignItems: 'center',
    shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 6,
  },
  serveBtnText: { color: theme.bg, fontSize: 17, fontWeight: '800' },
  laterText: { color: theme.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 8 },
});
