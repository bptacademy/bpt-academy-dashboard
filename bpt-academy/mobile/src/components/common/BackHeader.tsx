import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
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
  { icon: '👤', label: 'Profile',     screen: 'Profile' },
];

interface Props {
  title?: string;
  dark?: boolean;
}

export default function BackHeader({ title, dark = false }: Props) {
  const navigation = useNavigation<any>();
  const { effectiveRole } = useAuth();
  const [open, setOpen] = useState(false);

  const isAdmin = effectiveRole === 'admin' || effectiveRole === 'coach';
  const menu = isAdmin ? ADMIN_MENU : STUDENT_MENU;
  const homeScreen = isAdmin ? 'Dashboard' : 'Home';
  const canGoBack = navigation.canGoBack();

  return (
    <>
      <View style={[styles.header, dark && styles.headerDark]}>
        {/* Back or logo */}
        {canGoBack ? (
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={[styles.backIcon, dark && styles.lightText]}>‹</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.logoBtn} onPress={() => navigation.navigate(homeScreen)}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}

        {/* Title — centred */}
        {title
          ? <Text style={[styles.title, dark && styles.lightText]} numberOfLines={1}>{title}</Text>
          : <View style={{ flex: 1 }} />
        }

        {/* Hamburger */}
        <TouchableOpacity style={styles.menuBtn} onPress={() => setOpen(true)}>
          <Text style={[styles.menuIcon, dark && styles.lightText]}>☰</Text>
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
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 10,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerDark: { backgroundColor: '#111827', borderBottomColor: '#1F2937' },
  backBtn: { width: 44, height: 36, justifyContent: 'center' },
  backIcon: { fontSize: 28, color: '#374151', lineHeight: 34 },
  logoBtn: { width: 88, height: 72, justifyContent: 'center' },
  logo: { width: 88, height: 72 },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center', marginHorizontal: 8 },
  lightText: { color: '#FFFFFF' },
  menuBtn: { width: 44, alignItems: 'flex-end' },
  menuIcon: { fontSize: 33, color: '#374151' },
});
