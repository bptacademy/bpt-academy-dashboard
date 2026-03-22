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
        {canGoBack ? (
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={[styles.backIcon, dark && styles.lightText]}>‹</Text>
            <Text style={[styles.backText, dark && styles.lightText]}>Back</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate(homeScreen)}>
            <Text style={[styles.backIcon, dark && styles.lightText]}>🏠</Text>
          </TouchableOpacity>
        )}

        {title ? <Text style={[styles.title, dark && styles.lightText]} numberOfLines={1}>{title}</Text> : <View style={{ flex: 1 }} />}

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
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerDark: { backgroundColor: '#111827', borderBottomColor: '#1F2937' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 60 },
  backIcon: { fontSize: 26, color: '#374151', lineHeight: 30 },
  backText: { fontSize: 16, color: '#374151' },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center' },
  lightText: { color: '#FFFFFF' },
  menuBtn: { minWidth: 40, alignItems: 'flex-end' },
  menuIcon: { fontSize: 22, color: '#374151' },
});
