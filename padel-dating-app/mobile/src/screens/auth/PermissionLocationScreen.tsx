import React, { useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { theme, fonts } from '../../lib/theme';
const _BG = require('../../../assets/volpair-bg-v2.png');

export default function PermissionLocationScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const pinAnim = useRef(new Animated.Value(1)).current;

  const pulse = () => {
    Animated.sequence([
      Animated.timing(pinAnim, { toValue: 1.2, duration: 150, useNativeDriver: true }),
      Animated.timing(pinAnim, { toValue: 0.9, duration: 120, useNativeDriver: true }),
      Animated.timing(pinAnim, { toValue: 1,   duration: 120, useNativeDriver: true }),
    ]).start();
  };

  const handleAllow = async () => {
    pulse();

    try {
      // Request foreground location permission — triggers native system dialog
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === 'granted') {
        // Get current position and save to DB so Radar works immediately
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (session?.user?.id) {
          await supabase
            .from('users')
            .update({
              last_lat: loc.coords.latitude,
              last_lon: loc.coords.longitude,
              last_location_at: new Date().toISOString(),
              radar_visible: true,
            })
            .eq('auth_id', session.user.id);
        }
      }
    } catch (_) {}

    navigation.replace('OnboardingComplete');
  };

  const handleSkip = () => {
    navigation.replace('OnboardingComplete');
  };

  return (
      <ImageBackground source={_BG} style={{ flex: 1 }} resizeMode="cover">
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.body}>
        <Animated.Text style={[styles.icon, { transform: [{ scale: pinAnim }] }]}>
          📍
        </Animated.Text>
        <Text style={styles.title}>{'Find players\nnear you'}</Text>
        <Text style={styles.subtitle}>
          Enable location so we can show you padel players on your radar and help you discover courts and partners close by.
        </Text>
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity style={styles.btnPrimary} onPress={handleAllow} activeOpacity={0.85}>
          <Text style={styles.btnPrimaryText}>Allow location</Text>
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
