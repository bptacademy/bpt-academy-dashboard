import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { theme, fonts } from '../../lib/theme';
import { useAuth } from '../../context/AuthContext';
import AnimatedRing from '../../components/AnimatedRing';

const AVATAR_SIZE = 100;
const RING_THICKNESS = 3;

export default function MyProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user, signOut, refreshUser } = useAuth();
  const isFocused = useIsFocused();
  const [ringKey, setRingKey] = useState(0);

  useEffect(() => {
    if (isFocused) {
      refreshUser();
      setRingKey(k => k + 1);
    }
  }, [isFocused]);

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';

  const mainPhoto = user?.photos?.[0] ?? null;
  const lastSynced: string | null = null;

  const ringColor = user?.gender === 'female' ? '#A78BFA' : theme.primary;
  const innerSize = AVATAR_SIZE - RING_THICKNESS * 2;

  const MENU_ITEMS = [
    { icon: '✏️', iconPng: null, label: 'Edit Profile', screen: 'EditProfile' },
    { icon: '📊', iconPng: require('../../../assets/icons/4. Rating.png'), label: 'My Stats', screen: 'MyStats' },
    { icon: '🔔', iconPng: require('../../../assets/icons/Notifications.png'), label: 'Notifications', screen: 'Notifications' },
    { icon: '⚙️', iconPng: require('../../../assets/icons/16. Settings.png'), label: 'Settings', screen: 'Settings' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.profileCard}>

          <AnimatedRing
            key={ringKey}
            size={AVATAR_SIZE}
            thickness={RING_THICKNESS}
            color={ringColor}
            duration={2200}
          >
            {mainPhoto ? (
              <Image
                source={{ uri: mainPhoto }}
                style={{ width: innerSize, height: innerSize }}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.avatarFallback, { width: innerSize, height: innerSize, borderRadius: innerSize / 2 }]}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
          </AnimatedRing>

          <Text style={styles.profileName}>
            {user?.full_name ?? user?.email?.split('@')[0] ?? 'Player'}
          </Text>

          {user?.city && <View style={styles.cityRow}><Image source={require('../../../assets/icons/3. Location.png')} style={styles.cityIcon} /><Text style={styles.profileCity}>{user.city}</Text></View>}

          {/* Home club badge */}
          {user?.home_club_name && (
            <TouchableOpacity
              style={styles.clubBadge}
              onPress={() => navigation.navigate('EditProfile')}
              activeOpacity={0.75}
            >
              <Text style={styles.clubBadgeIcon}>🏟️</Text>
              <Text style={styles.clubBadgeName}>{user.home_club_name}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.badgeRow}>
            {user?.looking_for && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {user.looking_for === 'date' ? '💘 Dating' :
                   user.looking_for === 'partner' ? '🎾 Partner' :
                   user.looking_for === 'both' ? '💘 Open' : '👀 Exploring'}
                </Text>
              </View>
            )}
            <View style={[styles.badge, styles.badgePrimary]}>
              <Text style={[styles.badgeText, styles.badgePrimaryText]}>Level TBD</Text>
            </View>
          </View>

          {user?.bio && <Text style={styles.bio}>"{user.bio}"</Text>}
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>—</Text>
            <Text style={styles.statLabel}>MATCHES</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>—</Text>
            <Text style={styles.statLabel}>WIN RATE</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>—</Text>
            <Text style={styles.statLabel}>LEVEL</Text>
          </View>
        </View>

        <TouchableOpacity
          style={lastSynced ? styles.syncCtaSynced : styles.syncCtaNever}
          onPress={() => navigation.navigate('PlatformSync')}
          activeOpacity={0.8}
        >
          <Text style={styles.syncCtaIcon}>🔄</Text>
          <View style={styles.syncCtaText}>
            <Text style={lastSynced ? styles.syncCtaTitleSynced : styles.syncCtaTitle}>
              Sync History
            </Text>
            <Text style={styles.syncCtaSub}>
              {lastSynced
                ? `Last synced ${lastSynced}`
                : 'Import your match history and get your Volpair score'}
            </Text>
          </View>
          <Text style={styles.syncCtaArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.screen}
              style={[styles.menuRow, i < MENU_ITEMS.length - 1 && styles.menuRowBorder]}
              onPress={() => navigation.navigate(item.screen)}
              activeOpacity={0.75}
            >
              {item.iconPng
                ? <Image source={item.iconPng} style={styles.menuIconImg} />
                : <Text style={styles.menuIcon}>{item.icon}</Text>}
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={() => signOut()} activeOpacity={0.8}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: theme.bgCard,
  },
  headerTitle: { fontSize: 26, fontFamily: fonts.headlineBold, color: theme.textPrimary },
  scroll: { paddingHorizontal: 16, paddingTop: 20 },
  profileCard: {
    backgroundColor: theme.bgCard, borderRadius: 20, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: theme.border, marginBottom: 12,
  },
  avatarFallback: {
    backgroundColor: theme.primaryDim,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontSize: 30, fontFamily: fonts.headlineBold, color: theme.primary },
  profileName: { fontSize: 22, fontFamily: fonts.headlineBold, color: theme.textPrimary, marginBottom: 4, marginTop: 14 },
  profileCity: { fontSize: 13, color: theme.textMuted, marginBottom: 8, fontFamily: fonts.bodyLight },
  clubBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.bgDeep, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: theme.primaryBorder,
    marginBottom: 12,
  },
  clubBadgeIcon: { fontSize: 14 },
  clubBadgeName: { fontSize: 13, fontFamily: fonts.bodyBold, color: theme.primary },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap', justifyContent: 'center' },
  badge: {
    backgroundColor: theme.bgDeep, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: theme.border,
  },
  badgePrimary: { backgroundColor: theme.primaryDim, borderColor: theme.primaryBorder },
  badgeText: { fontSize: 13, color: theme.textSecondary, fontFamily: fonts.bodyBold },
  badgePrimaryText: { color: theme.primary },
  bio: { fontSize: 14, color: theme.textSecondary, fontStyle: 'italic', textAlign: 'center', lineHeight: 20, fontFamily: fonts.bodyLight },
  statsCard: {
    flexDirection: 'row', backgroundColor: theme.bgCard, borderRadius: 16,
    padding: 20, marginBottom: 12, borderWidth: 1, borderColor: theme.border,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontFamily: fonts.headlineLightIt, color: theme.textPrimary, marginBottom: 4 },
  statLabel: { fontSize: 11, color: theme.textMuted, fontFamily: fonts.bodyBold },
  statDivider: { width: 1, backgroundColor: theme.border },
  syncCtaNever: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.primaryDim, borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: theme.primaryBorder, marginBottom: 12,
  },
  syncCtaSynced: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.bgCard, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: theme.border, marginBottom: 12,
  },
  syncCtaIcon: { fontSize: 24 },
  syncCtaText: { flex: 1 },
  syncCtaTitle: { fontSize: 15, fontFamily: fonts.bodyBold, color: theme.primary, marginBottom: 3 },
  syncCtaTitleSynced: { fontSize: 15, fontFamily: fonts.bodyBold, color: theme.textPrimary, marginBottom: 3 },
  syncCtaSub: { fontSize: 12, color: theme.textMuted, lineHeight: 18, fontFamily: fonts.bodyLight },
  syncCtaArrow: { fontSize: 22, color: theme.textMuted },
  menuCard: {
    backgroundColor: theme.bgCard, borderRadius: 16,
    borderWidth: 1, borderColor: theme.border, marginBottom: 12, overflow: 'hidden',
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  menuIcon: { fontSize: 20, width: 28 },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cityIcon: { width: 21, height: 21, tintColor: '#7A9CC0' },
  menuIconImg: { width: 33, height: 33, tintColor: '#7A9CC0', marginRight: 2 },
  menuLabel: { flex: 1, fontSize: 15, color: theme.textPrimary, fontFamily: fonts.bodyLight },
  menuArrow: { fontSize: 20, color: theme.textMuted },
  signOutBtn: {
    backgroundColor: theme.bgCard, borderRadius: 14, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: theme.border,
  },
  signOutText: { fontSize: 15, color: '#EF4444', fontFamily: fonts.bodyBold },
});
