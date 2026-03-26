import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  Image, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';

interface MenuItem {
  icon: string;
  label: string;
  screen: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onNavigate: (screen: string) => void;
  items: MenuItem[];
}

export default function MenuDrawer({ visible, onClose, onNavigate, items }: Props) {
  const { profile, signOut, effectiveRole, setPreviewRole } = useAuth();
  const insets = useSafeAreaInsets();
  const isActualAdmin = profile?.role === 'admin' || profile?.role === 'coach';
  const isViewingAsStudent = effectiveRole === 'student';

  const initials = (name: string) =>
    name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) ?? '?';

  const handleNav = (screen: string) => {
    onClose();
    setTimeout(() => onNavigate(screen), 100);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={[styles.drawer, { paddingTop: insets.top }]}>
          <ScrollView
            bounces={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          >
            {/* Profile header */}
            <View style={styles.header}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarText}>{initials(profile?.full_name ?? '')}</Text>
                </View>
              )}
              <Text style={styles.name}>{profile?.full_name}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>
                  {isViewingAsStudent && isActualAdmin ? 'Viewing as Student' : (profile?.role ?? '')}
                </Text>
              </View>
            </View>

            {/* Nav items */}
            <View style={styles.nav}>
              {items.map((item) => (
                <TouchableOpacity
                  key={item.screen}
                  style={styles.navItem}
                  onPress={() => handleNav(item.screen)}
                >
                  <Text style={styles.navIcon}>{item.icon}</Text>
                  <Text style={styles.navLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Admin preview toggle */}
            {isActualAdmin && (
              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  setPreviewRole(isViewingAsStudent ? null : 'student');
                  onClose();
                }}
              >
                <Text style={styles.navIcon}>{isViewingAsStudent ? '🔀' : '👁️'}</Text>
                <Text style={styles.navLabel}>
                  {isViewingAsStudent ? 'Switch to Admin' : 'Preview as Student'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Sign out */}
            <TouchableOpacity
              style={styles.signOutItem}
              onPress={() => { onClose(); signOut(); }}
            >
              <Text style={styles.navIcon}>🚪</Text>
              <Text style={styles.signOutLabel}>Sign Out</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: 'row' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  drawer: { width: 300, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: -2, height: 0 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 16 },
  header: { padding: 24, paddingTop: 24, backgroundColor: '#111827', alignItems: 'center' },
  avatar: { width: 70, height: 70, borderRadius: 35, marginBottom: 10 },
  avatarFallback: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  avatarText: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  name: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
  roleBadge: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  roleText: { fontSize: 12, color: '#D1FAE5', fontWeight: '600', textTransform: 'capitalize' },
  nav: { paddingTop: 8 },
  navItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14 },
  navIcon: { fontSize: 20, width: 28 },
  navLabel: { fontSize: 15, color: '#374151', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 20, marginVertical: 8 },
  signOutItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14 },
  signOutLabel: { fontSize: 15, color: '#DC2626', fontWeight: '500' },
});
