import React, { useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { theme } from '../../lib/theme';
import { useAuth } from '../../context/AuthContext';

export default function MyProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user, signOut, refreshUser } = useAuth();
  const isFocused = useIsFocused();

  // Refresh user data every time this screen comes into focus
  // (catches updates from EditProfile, PlatformSync, etc.)
  useEffect(() => {
    if (isFocused) refreshUser();
  }, [isFocused]);

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';

  const mainPhoto = user?.photos?.[0] ?? null;
  const lastSynced: string | null = null;

  const MENU_ITEMS = [
    { icon: '✏️', label: 'Edit Profile', screen: 'EditProfile' },
    { icon: '📊', label: 'My Stats', screen: 'MyStats' },
    { icon: '🔗', label: 'Connected Platforms', screen: 'PlatformSync' },
    { icon: '🔔', label: 'Notifications', screen: 'Notifications' },
    { icon: '⚙️', label: 'Settings', screen: 'Settings' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <View style={styles.profileCard}>
          {mainPhoto ? (
            <Image source={{ uri: mainPhoto }} style={styles.avatarPhoto} />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <Text style={styles.profileName}>
            {user?.full_name ?? user?.email?.split('@')[0] ?? 'Player'}
          </Text>
          {user?.city && <Text style={styles.profileCity}>📍 {user.city}</Text>}
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

        {/* Stats card */}
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

        {/* Sync CTA */}
        <TouchableOpacity
          style={lastSynced ? styles.syncCtaSynced : styles.syncCtaNever}
          onPress={() => navigation.navigate('PlatformSync')}
          activeOpacity={0.8}
        >
          <Text style={styles.syncCtaIcon}>🎾</Text>
          <View style={styles.syncCtaText}>
            <Text style={lastSynced ? styles.syncCtaTitleSynced : styles.syncCtaTitle}>
              {lastSynced ? 'Playtomic connected' : 'Connect Playtomic'}
            </Text>
            <Text style={styles.syncCtaSub}>
              {lastSynced ? `Last synced ${lastSynced}` : 'Import your match history and get your Volpair score'}
            </Text>
          </View>
          <Text style={styles.syncCtaArrow}>›</Text>
        </TouchableOpacity>

        {/* Menu */}
        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.screen}
              style={[styles.menuRow, i < MENU_ITEMS.length - 1 && styles.menuRowBorder]}
              onPress={() => navigation.navigate(item.screen)}
              activeOpacity={0.75}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={() => signOut()}
          activeOpacity={0.8}
        >
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
  headerTitle: { fontSize: 26, fontWeight: '800', color: theme.textPrimary },
  scroll: { paddingHorizontal: 16, paddingTop: 20 },
  profileCard: {
    backgroundColor: theme.bgCard, borderRadius: 20, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: theme.border, marginBottom: 12,
  },
  avatarPhoto: {
    width: 90, height: 90, borderRadius: 45,
    marginBottom: 14, borderWidth: 2.5, borderColor: theme.primaryBorder,
  },
  avatarCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: theme.primaryDim, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: theme.primaryBorder, marginBottom: 14,
  },
  avatarInitials: { fontSize: 32, fontWeight: '800', color: theme.primary },
  profileName: { fontSize: 22, fontWeight: '800', color: theme.textPrimary, marginBottom: 4 },
  profileCity: { fontSize: 13, color: theme.textMuted, marginBottom: 12 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap', justifyContent: 'center' },
  badge: {
    backgroundColor: theme.bgDeep, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: theme.border,
  },
  badgePrimary: { backgroundColor: theme.primaryDim, borderColor: theme.primaryBorder },
  badgeText: { fontSize: 13, color: theme.textSecondary, fontWeight: '600' },
  badgePrimaryText: { color: theme.primary },
  bio: { fontSize: 14, color: theme.textSecondary, fontStyle: 'italic', textAlign: 'center', lineHeight: 20 },
  statsCard: {
    flexDirection: 'row', backgroundColor: theme.bgCard, borderRadius: 16,
    padding: 20, marginBottom: 12, borderWidth: 1, borderColor: theme.border,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: theme.textPrimary, marginBottom: 4 },
  statLabel: { fontSize: 11, color: theme.textMuted, fontWeight: '600' },
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
  syncCtaTitle: { fontSize: 15, fontWeight: '700', color: theme.primary, marginBottom: 3 },
  syncCtaTitleSynced: { fontSize: 15, fontWeight: '700', color: theme.textPrimary, marginBottom: 3 },
  syncCtaSub: { fontSize: 12, color: theme.textMuted, lineHeight: 18 },
  syncCtaArrow: { fontSize: 22, color: theme.textMuted },
  menuCard: {
    backgroundColor: theme.bgCard, borderRadius: 16,
    borderWidth: 1, borderColor: theme.border, marginBottom: 12, overflow: 'hidden',
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  menuIcon: { fontSize: 20, width: 28 },
  menuLabel: { flex: 1, fontSize: 15, color: theme.textPrimary, fontWeight: '500' },
  menuArrow: { fontSize: 20, color: theme.textMuted },
  signOutBtn: {
    backgroundColor: theme.bgCard, borderRadius: 14, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: theme.border,
  },
  signOutText: { fontSize: 15, color: '#EF4444', fontWeight: '600' },
});
