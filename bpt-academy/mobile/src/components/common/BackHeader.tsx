import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

interface Props {
  title?: string;
  dark?: boolean; // kept for backward compat — now ignored, always dark
}

export default function BackHeader({ title }: Props) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const state = navigation.getState();
  const isDeep = state && state.index > 0;

  return (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      {isDeep ? (
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>‹</Text>
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

      {title
        ? <Text style={styles.title} numberOfLines={1}>{title}</Text>
        : <View style={{ flex: 1 }} />
      }

      <View style={styles.rightPlaceholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 10,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.10)',
  },
  backBtn: { width: 44, height: 36, justifyContent: 'center' },
  backIcon: { fontSize: 28, color: '#F0F6FC', lineHeight: 34 },
  logoBtn: { width: 88, height: 72, justifyContent: 'center' },
  logo: { width: 88, height: 72 },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: '#F0F6FC', textAlign: 'center', marginHorizontal: 8 },
  rightPlaceholder: { width: 44 },
});
