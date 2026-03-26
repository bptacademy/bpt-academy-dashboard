import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MenuDrawer from './MenuDrawer';
import { useAuth } from '../../context/AuthContext';

const STUDENT_MENU = [
  { icon: '🏠', label: 'Home',        screen: 'Home' },
  { icon: '📚', label: 'Programs',    screen: 'Programs' },
  { icon: '🎬', label: 'Videos',      screen: 'Videos' },
  { icon: '📈', label: 'Progress',    screen: 'Progress' },
  { icon: '🏆', label: 'Leaderboard', screen: 'Leaderboard' },
  { icon: '🎾', label: 'Tournaments', screen: 'Tournaments' },
  { icon: '💬', label: 'Messages',    screen: 'Messages' },
  { icon: '📝', label: 'Coach Notes', screen: 'MyCoachNotes' },
  { icon: '👤', label: 'Profile',     screen: 'Profile' },
];

// Coach: no billing, no settings, no payment reconciliation
const COACH_MENU = [
  { icon: '📊', label: 'Dashboard',   screen: 'Dashboard' },
  { icon: '📋', label: 'Programs',    screen: 'Manage' },
  { icon: '🎬', label: 'Videos',      screen: 'Videos' },
  { icon: '👥', label: 'Students',    screen: 'Students' },
  { icon: '🏅', label: 'Divisions',   screen: 'Divisions' },
  { icon: '🎾', label: 'Tournaments', screen: 'Tournaments' },
  { icon: '💬', label: 'Messages',    screen: 'Messages' },
  { icon: '🔔', label: 'Announce',    screen: 'Announce' },
  { icon: '👤', label: 'Profile',     screen: 'Profile' },
];

// Admin: full access except user management
const ADMIN_MENU = [
  { icon: '📊', label: 'Dashboard',   screen: 'Dashboard' },
  { icon: '📋', label: 'Programs',    screen: 'Manage' },
  { icon: '🎬', label: 'Videos',      screen: 'Videos' },
  { icon: '👥', label: 'Students',    screen: 'Students' },
  { icon: '🏅', label: 'Divisions',   screen: 'Divisions' },
  { icon: '🎾', label: 'Tournaments', screen: 'Tournaments' },
  { icon: '💳', label: 'Payments',    screen: 'Payments' },
  { icon: '💬', label: 'Messages',    screen: 'Messages' },
  { icon: '📣', label: 'Bulk Msg',    screen: 'BulkMsg' },
  { icon: '🔔', label: 'Announce',    screen: 'Announce' },
  { icon: '⚙️', label: 'Settings',    screen: 'AcademySettings' },
  { icon: '👤', label: 'Profile',     screen: 'Profile' },
];

// Super Admin: everything + user management
const SUPER_ADMIN_MENU = [
  { icon: '👑', label: 'Users',        screen: 'SuperAdminHome' },
  { icon: '📊', label: 'Dashboard',    screen: 'Dashboard' },
  { icon: '📋', label: 'Programs',     screen: 'Manage' },
  { icon: '🎬', label: 'Videos',       screen: 'Videos' },
  { icon: '👥', label: 'Students',     screen: 'Students' },
  { icon: '🏅', label: 'Divisions',    screen: 'Divisions' },
  { icon: '🎾', label: 'Tournaments',  screen: 'Tournaments' },
  { icon: '💳', label: 'Payments',     screen: 'Payments' },
  { icon: '💬', label: 'Messages',     screen: 'Messages' },
  { icon: '📣', label: 'Bulk Msg',     screen: 'BulkMsg' },
  { icon: '🔔', label: 'Announce',     screen: 'Announce' },
  { icon: '⚙️', label: 'Settings',     screen: 'AcademySettings' },
  { icon: '💰', label: 'Billing',      screen: 'BillingSettings' },
  { icon: '👤', label: 'Profile',      screen: 'Profile' },
];

interface Props {
  title: string;
  dark?: boolean;
}

export default function ScreenHeader({ title, dark = false }: Props) {
  const [open, setOpen] = useState(false);
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { isSuperAdmin, isAdmin, isCoach } = useAuth();

  const menu = isSuperAdmin ? SUPER_ADMIN_MENU
             : isAdmin      ? ADMIN_MENU
             : isCoach      ? COACH_MENU
             : STUDENT_MENU;

  const homeScreen = isSuperAdmin ? 'SuperAdminHome'
                   : (isAdmin || isCoach) ? 'Dashboard'
                   : 'Home';

  return (
    <>
      <View style={[styles.header, dark && styles.headerDark, { paddingTop: insets.top + 10 }]}>
        {/* Logo — taps to home */}
        <TouchableOpacity onPress={() => navigation.navigate(homeScreen)} style={styles.logoBtn}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </TouchableOpacity>

        {/* Page title — centred */}
        <Text style={[styles.title, dark && styles.titleDark]} numberOfLines={1}>{title}</Text>

        {/* Hamburger */}
        <TouchableOpacity style={styles.menuBtn} onPress={() => setOpen(true)}>
          <Text style={[styles.icon, dark && styles.iconDark]}>☰</Text>
        </TouchableOpacity>
      </View>

      <MenuDrawer
        visible={open}
        onClose={() => setOpen(false)}
        onNavigate={(screen) => navigation.navigate(screen)}
        items={menu}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 10,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerDark: { backgroundColor: '#111827', borderBottomColor: '#1F2937' },
  logoBtn: { width: 88, height: 72, justifyContent: 'center' },
  logo: { width: 88, height: 72 },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center', marginHorizontal: 8 },
  titleDark: { color: '#FFFFFF' },
  menuBtn: { width: 44, alignItems: 'flex-end' },
  icon: { fontSize: 33, color: '#374151' },
  iconDark: { color: '#FFFFFF' },
});
