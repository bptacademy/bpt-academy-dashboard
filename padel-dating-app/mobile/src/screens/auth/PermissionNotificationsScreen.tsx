import React, { useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Platform,
, ImageBackground } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { theme, fonts } from '../../lib/theme';
const _BG = require('../../../assets/volpair-bg-v2.png');

export default function PermissionNotificationsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const bellAnim = useRef(new Animated.Value(1)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(bellAnim, { toValue: 1.15, duration: 120, useNativeDriver: true }),
      Animated.timing(bellAnim, { toValue: 0.9,  duration: 100, useNativeDriver: true }),
      Animated.timing(bellAnim, { toValue: 1.08, duration: 100, useNativeDriver: true }),
      Animated.timing(bellAnim, { toValue: 1,    duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const handleAllow = async () => {
    shake();

    // Set up Android channel before requesting permission
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Volpair',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#0ACCB5',
        });
      } catch (_) {}
    }

    // Request the native system permission dialog
    try {
      await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
    } catch (_) {}

    navigation.replace('PermissionLocation');
  };

  const handleSkip = () => {
    navigation.replace('PermissionLocation');
  };

  return (
      <ImageBackground source={_BG} style={{ flex: 1 }} resizeMode="cover">
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.body}>
        <Animated.Text style={[styles.icon, { transform: [{ scale: bellAnim }] }]}>
          🔔
        </Animated.Text>
        <Text style={styles.title}>{"Don't miss a beat,\nor a match"}</Text>
        <Text style={styles.subtitle}>
          Turn on notifications so we can let you know when you have new matches, volleys, or messages.
        </Text>
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity style={styles.btnPrimary} onPress={handleAllow} activeOpacity={0.85}>
          <Text style={styles.btnPrimaryText}>Allow notifications</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSkip} onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.btnSkipText}>Not now</Text>
        </TouchableOpacity>
      </View>
    </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 28,
    justifyContent: 'space-between',
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  icon: {
    fontSize: 80,
    marginBottom: 36,
  },
  title: {
    fontSize: 34,
    fontFamily: fonts.headlineBold,
    color: theme.textPrimary,
    marginBottom: 16,
    lineHeight: 42,
  },
  subtitle: {
    fontSize: 16,
    color: theme.textSecondary,
    lineHeight: 24,
  },
  bottom: {
    gap: 12,
  },
  btnPrimary: {
    backgroundColor: theme.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  btnPrimaryText: {
    color: '#05020E',
    fontSize: 17,
    fontFamily: fonts.headlineBold,
  },
  btnSkip: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  btnSkipText: {
    color: theme.textSecondary,
    fontSize: 16,
    fontFamily: fonts.bodyLight,
  },
});
