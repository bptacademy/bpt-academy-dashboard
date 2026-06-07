import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../lib/theme';
import { ScreenBackground } from '../../components/ScreenBackground';

// Update these once the app is live on the stores
const APP_STORE_URL = 'https://apps.apple.com/app/id0000000000'; // TODO: replace with real App Store ID
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.volpair.app'; // TODO: confirm package name

export default function ForceUpdateScreen() {
  const insets = useSafeAreaInsets();
  const storeUrl = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;

  return (
    <ScreenBackground>
      <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}>
      <Text style={styles.emoji}>🎾</Text>
      <Text style={styles.title}>Update Required</Text>
      <Text style={styles.subtitle}>
        A new version of volpair is available with important improvements and fixes.{'\n\n'}
        Please update to continue.
      </Text>
      <TouchableOpacity style={styles.btn} onPress={() => Linking.openURL(storeUrl)}>
        <Text style={styles.btnText}>Update Now →</Text>
      </TouchableOpacity>
    </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emoji: { fontSize: 64, marginBottom: 24 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 15,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  btn: {
    backgroundColor: theme.primary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
  },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
