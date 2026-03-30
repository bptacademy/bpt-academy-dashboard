import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

interface Props {
  title?: string;
  dark?: boolean;
}

export default function BackHeader({ title, dark = false }: Props) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const state = navigation.getState();
  const isDeep = state && state.index > 0;

  return (
    <View style={[styles.header, dark && styles.headerDark, { paddingTop: insets.top + 10 }]}>
      {/* Back button when deeper than root, logo at root */}
      {isDeep ? (
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={[styles.backIcon, dark && styles.lightText]}>‹</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.logoBtn} onPress={() => {}}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </TouchableOpacity>
      )}

      {/* Title */}
      {title
        ? <Text style={[styles.title, dark && styles.lightText]} numberOfLines={1}>{title}</Text>
        : <View style={{ flex: 1 }} />
      }

      {/* Empty placeholder for balance */}
      <View style={styles.rightPlaceholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 10,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerDark: { backgroundColor: '#111827', borderBottomColor: '#1F2937' },
  backBtn: { width: 44, height: 36, justifyContent: 'center' },
  backIcon: { fontSize: 28, color: '#374151', lineHeight: 34 },
  logoBtn: { width: 88, height: 72, justifyContent: 'center' },
  logo: { width: 88, height: 72 },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center', marginHorizontal: 8 },
  lightText: { color: '#FFFFFF' },
  rightPlaceholder: { width: 44 },
});
