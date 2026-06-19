import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Dimensions, Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const APP_STORE_URL = 'https://apps.apple.com/app/id6769894988';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.bptacademy.app';
// Send each platform to its own store — never the wrong one.
const STORE_URL = Platform.OS === 'android' ? PLAY_STORE_URL : APP_STORE_URL;

export default function ForceUpdateScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Image source={require('../../../assets/bg.png')} style={styles.bg} resizeMode="cover" />
      <View style={[styles.inner, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}>
        <Text style={styles.emoji}>🎾</Text>
        <Text style={styles.title}>Update Required</Text>
        <Text style={styles.subtitle}>
          A new version of BPT Academy is available with important improvements and fixes.{'\n\n'}
          Please update to continue using the app.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={() => Linking.openURL(STORE_URL)}>
          <Text style={styles.btnText}>Update Now →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1628' },
  bg: { position: 'absolute', top: 0, left: 0, width, height },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emoji: { fontSize: 64, marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '800', color: '#F0F6FC', textAlign: 'center', marginBottom: 16 },
  subtitle: { fontSize: 15, color: '#7A8FA6', textAlign: 'center', lineHeight: 24, marginBottom: 40 },
  btn: { backgroundColor: '#3B82F6', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 40 },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
