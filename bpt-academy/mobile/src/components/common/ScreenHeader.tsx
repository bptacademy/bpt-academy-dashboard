import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MenuDrawer from './MenuDrawer';

interface Props {
  title: string;
  menuItems: { icon: string; label: string; screen: string }[];
  dark?: boolean;
}

export default function ScreenHeader({ title, menuItems, dark = false }: Props) {
  const [open, setOpen] = useState(false);
  const navigation = useNavigation<any>();

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
        items={menuItems}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 48, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerDark: { backgroundColor: '#111827', borderBottomColor: '#1F2937' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  titleDark: { color: '#FFFFFF' },
  btn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 22, color: '#374151' },
  iconDark: { color: '#FFFFFF' },
});
