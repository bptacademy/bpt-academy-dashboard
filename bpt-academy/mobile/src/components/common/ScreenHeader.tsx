import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useNotifications } from '../../hooks/useNotifications';

const BELL_ICON = require('../../../assets/icons/notification.png');

interface Props {
  title: string;
  dark?: boolean;
  /** When true: shows avatar + welcome name on left, bell on right (home screen style). */
  homeHeader?: boolean;
  profileName?: string | null;
  profileRole?: string | null;
  profileAvatar?: string | null;
  onAvatarPress?: () => void;
}

export default function ScreenHeader({
  title,
  dark = false,
  homeHeader = false,
  profileName,
  profileRole,
  profileAvatar,
  onAvatarPress,
}: Props) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotifications();

  // Show back arrow whenever we're deeper than the root of this stack
  const state = navigation.getState();
  const canGoBack = state && state.index > 0;

  const handleLogoPress = () => {
    const parent = navigation.getParent();
    if (parent) {
      const parentState = parent.getState();
      const firstTab = parentState?.routeNames?.[0];
      if (firstTab) parent.navigate(firstTab);
    }
  };

  const badgeLabel = unreadCount > 9 ? '9+' : String(unreadCount);

  // ── Home Header variant (avatar + welcome name) ────────────────────────────
  if (homeHeader) {
    const initials = profileName
      ? profileName
          .split(' ')
          .map((w: string) => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : '?';
    const rolePill = profileRole
      ? profileRole.charAt(0).toUpperCase() + profileRole.slice(1).replace('_', ' ')
      : null;
    const nameParts = profileName ? profileName.split(' ') : [];
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ').toUpperCase();

    return (
      <View style={[styles.header, styles.homeHeaderRow, { paddingTop: insets.top + 10 }]}>
        {/* Left: avatar + welcome */}
        <TouchableOpacity style={styles.homeLeft} onPress={onAvatarPress} activeOpacity={0.8}>
          {profileAvatar ? (
            <Image source={{ uri: profileAvatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <View style={styles.welcomeBlock}>
            <Text style={styles.welcomeLabel}>Welcome,</Text>
            <Text style={styles.welcomeName} numberOfLines={1}>
              {firstName}
              {lastName ? ` ${lastName}` : ''}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Right: role pill + bell (PNG icon) */}
        <View style={styles.homeRight}>
          {rolePill && (
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>{rolePill}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.bellBtnHome}
            onPress={() => navigation.navigate('Notifications')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Image source={BELL_ICON} style={styles.bellIconImg} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badgeLabel}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Default header ─────────────────────────────────────────────────────────
  return (
    <View style={[styles.header, dark && styles.headerDark, { paddingTop: insets.top + 10 }]}>
      {/* Left: ‹ Back always (goes back if deep, navigates to first tab if at root) */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => (canGoBack ? navigation.goBack() : handleLogoPress())}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={[styles.backIcon, dark && styles.backIconDark]}>‹</Text>
        <Text style={[styles.backLabel, dark && styles.backLabelDark]}>Back</Text>
      </TouchableOpacity>

      {/* Title */}
      <Text style={[styles.title, dark && styles.titleDark]} numberOfLines={1}>{title}</Text>

      {/* Right: bell (PNG icon) always visible */}
      <TouchableOpacity
        style={styles.bellBtn}
        onPress={() => navigation.navigate('Notifications')}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Image source={BELL_ICON} style={styles.bellIconImg} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeLabel}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 10,
    backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: 'rgba(30,48,80,0.5)',
  },
  headerDark: { backgroundColor: '#111827', borderBottomColor: '#1F2937' },

  // Back button (all states)
  backBtn: { flexDirection: 'row', alignItems: 'center', width: 64, height: 44, justifyContent: 'flex-start' },
  backIcon: { fontSize: 28, color: '#F0F6FC', lineHeight: 34, marginRight: 2 },
  backIconDark: { color: '#FFFFFF' },
  backLabel: { fontSize: 14, fontWeight: '600', color: '#F0F6FC' },
  backLabelDark: { color: '#FFFFFF' },

  title: {
    flex: 1, fontSize: 17, fontWeight: '700', color: '#F0F6FC',
    textAlign: 'center', marginHorizontal: 8,
  },
  titleDark: { color: '#FFFFFF' },

  // Bell button (default header)
  bellBtn: {
    width: 64, height: 44, justifyContent: 'center', alignItems: 'center',
  },
  bellIconImg: { width: 24, height: 24, tintColor: '#F0F6FC' },
  badge: {
    position: 'absolute', top: -4, right: -6,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },

  // ── Home Header styles ──────────────────────────────────────────────────────
  homeHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  homeLeft: {
    flexDirection: 'row', alignItems: 'center', flex: 1,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    borderWidth: 2, borderColor: '#16A34A',
  },
  avatarPlaceholder: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#16A34A',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#22C55E',
  },
  avatarInitials: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  welcomeBlock: { marginLeft: 10, flex: 1 },
  welcomeLabel: { fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },
  welcomeName: { fontSize: 16, fontWeight: '700', color: '#F0F6FC' },
  homeRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rolePill: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rolePillText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  bellBtnHome: { padding: 6 },
});
