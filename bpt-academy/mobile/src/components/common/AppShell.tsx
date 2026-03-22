import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MenuDrawer from './MenuDrawer';

interface Props {
  children: React.ReactNode;
  title: string;
  menuItems: { icon: string; label: string; screen: string }[];
}

export default function AppShell({ children, title, menuItems }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>{title}</Text>
        <TouchableOpacity style={styles.menuBtn} onPress={() => setMenuOpen(true)}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
      </View>

      {/* Page content */}
      <View style={styles.content}>
        {children}
      </View>

      {/* Slide-in menu */}
      <MenuDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigate={(screen) => navigation.navigate(screen)}
        items={menuItems}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#FFFFFF',
  },
  topTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  menuBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  menuIcon: { fontSize: 22, color: '#374151' },
  content: { flex: 1 },
});
