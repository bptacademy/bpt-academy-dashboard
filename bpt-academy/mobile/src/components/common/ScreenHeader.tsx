import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
  { icon: '🏟️', label: 'Book Court',  screen: 'CourtBook' },
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
  title: string;
  dark?: boolean;
}

export default function ScreenHeader({ title, dark = false }: Props) {
  const [open, setOpen] = useState(false);
  const navigation = useNavigation<any>();
  const { effectiveRole } = useAuth();

  const isAdmin = effectiveRole === 'admin' || effectiveRole === 'coach';
  const menu = isAdmin ? ADMIN_MENU : STUDENT_MENU;

  return (
    <>
      <View style={[styles.header, dark && styles.headerDark]}>
        <Text style={[styles.title, dark && styles.titleDark]}>{title}</Text>
        <TouchableOpacity style={styles.btn} onPress={() => setOpen(true)}>
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerDark: { backgroundColor: '#111827', borderBottomColor: '#1F2937' },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  titleDark: { color: '#FFFFFF' },
  btn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 22, color: '#374151' },
  iconDark: { color: '#FFFFFF' },
});
