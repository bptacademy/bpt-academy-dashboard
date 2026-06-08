import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, Animated, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, fonts } from '../../lib/theme';
import { useAuth } from '../../context/AuthContext';

export default function MutualVolleyMatchScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { connectionId, matchedUserName, matchedUserPhoto } = route.params ?? {};

  const scaleA = useRef(new Animated.Value(0.3)).current;
  const scaleB = useRef(new Animated.Value(0.3)).current;
  const fadeText = useRef(new Animated.Value(0)).current;
  const scaleBadge = useRef(new Animated.Value(0)).current;

  const firstName = matchedUserName?.split(' ')[0] ?? 'them';
  const myPhoto = user?.photos?.[0] ?? null;
  const myInitials = user?.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '👤';
  const theirInitials = matchedUserName
    ? matchedUserName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '👤';

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
    navigation.replace('Conversation', { connectionId });
  };

  const handleMaybeLater = () => {
    navigation.goBack();
  };

  return (
    <View style={{flex:1, backgroundColor:'transparent'}}>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      

      <View style={styles.glowViolet} />
      <View style={styles.glowTurquoise} />

      <View style={styles.center}>
        <View style={styles.avatarRow}>
          {/* My avatar */}
          <Animated.View style={[styles.avatarCircle, { transform: [{ scale: scaleA }] }]}>
            {myPhoto ? (
              <Image source={{ uri: myPhoto }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <Text style={styles.avatarText}>{myInitials}</Text>
            )}
          </Animated.View>

          {/* Match badge */}
          <Animated.View style={[styles.matchBadge, { transform: [{ scale: scaleBadge }] }]}>
            <Text style={styles.matchBadgeEmoji}>💘</Text>
          </Animated.View>

          {/* Their avatar */}
          <Animated.View style={[styles.avatarCircle, styles.avatarCircleB, { transform: [{ scale: scaleB }] }]}>
            {matchedUserPhoto ? (
              <Image source={{ uri: matchedUserPhoto }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <Text style={styles.avatarText}>{theirInitials}</Text>
            )}
          </Animated.View>
        </View>

        <Animated.View style={{ opacity: fadeText, alignItems: 'center' }}>
          <Text style={styles.title}>It's a match!</Text>
          <Text style={styles.subtitle}>
            You and {firstName} both sent a Volley.
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
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: theme.primaryDim,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: theme.primaryBorder,
    overflow: 'hidden',
  },
  avatarCircleB: {
    backgroundColor: theme.secondaryDim, borderColor: theme.secondaryBorder,
  },
  avatarImage: { width: 90, height: 90 },
  avatarText: { fontSize: 28, fontFamily: fonts.headlineBold, color: theme.primary },
  matchBadge: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: theme.secondaryDim, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: theme.secondaryBorder,
    zIndex: 1, marginHorizontal: -8,
  },
  matchBadgeEmoji: { fontSize: 24 },
  title: { fontSize: 36, fontFamily: fonts.headlineBold, color: theme.textPrimary, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 17.1, color: theme.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 20, fontFamily: fonts.bodyLight },
  courtCard: {
    backgroundColor: theme.primaryDim, borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14,
    borderWidth: 1.5, borderColor: theme.primaryBorder,
  },
  courtText: { fontSize: 19.3, fontFamily: fonts.bodyBold, color: theme.primary },
  bottom: { paddingBottom: 12, gap: 12 },
  serveBtn: {
    backgroundColor: theme.primary, borderRadius: 16, padding: 18, alignItems: 'center',
    shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 6,
  },
  serveBtnText: { color: '#05020E', fontSize: 17, fontFamily: fonts.headlineBold },
  laterText: { color: theme.textMuted, fontSize: 15, textAlign: 'center', paddingVertical: 8, fontFamily: fonts.bodyLight },
});
