import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BELL = require('../../../assets/icons/notification.png');
const NOTIF_PROMPTED_KEY = 'bpt_notif_prompted_v1';

interface Props {
  onDone: () => void;
}

export default function NotificationPromptScreen({ onDone }: Props) {
  const insets = useSafeAreaInsets();

  const requestAndContinue = async () => {
    try {
      const Notifications = await import('expo-notifications');
      await Notifications.requestPermissionsAsync();
    } catch {}
    await AsyncStorage.setItem(NOTIF_PROMPTED_KEY, 'true');
    onDone();
  };

  const skipAndContinue = async () => {
    await AsyncStorage.setItem(NOTIF_PROMPTED_KEY, 'true');
    onDone();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.iconWrap}>
        <Image source={BELL} style={styles.icon} tintColor="#3B82F6" resizeMode="contain" />
      </View>

      <Text style={styles.title}>Stay in the loop</Text>
      <Text style={styles.subtitle}>
        Get notified about session reminders, attendance confirmations, coach messages, and academy updates.
      </Text>

      <TouchableOpacity style={styles.primaryBtn} onPress={requestAndContinue} activeOpacity={0.85}>
        <Text style={styles.primaryBtnText}>Enable Notifications</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipBtn} onPress={skipAndContinue} activeOpacity={0.7}>
        <Text style={styles.skipBtnText}>Not now</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1628',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(59,130,246,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  icon: {
    width: 48,
    height: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 48,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  skipBtn: {
    paddingVertical: 12,
  },
  skipBtnText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 15,
  },
});
