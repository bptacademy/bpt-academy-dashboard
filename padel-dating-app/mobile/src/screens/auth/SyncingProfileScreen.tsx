import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar, Alert, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../lib/theme';
import { connectPlatform, connectPlatformWithUserId, syncPlatform } from '../../lib/platformSync';

const STEPS = [
  'Connecting to Playtomic…',
  'Importing your match history…',
  'Calculating your skill level…',
  'Finding your top clubs…',
  'Building your profile…',
];

const SLOW_THRESHOLD_MS = 20_000;

export default function SyncingProfileScreen({ route, navigation }: any) {
  const { platform, platformEmail, platformPassword, platformUserId, skipAuth } = route.params ?? {};
  const insets = useSafeAreaInsets();
  const [stepIndex, setStepIndex] = useState(0);
  const [isSlow, setIsSlow] = useState(false);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didNavigate = useRef(false);

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
    ).start();

    slowTimer.current = setTimeout(() => setIsSlow(true), SLOW_THRESHOLD_MS);
    runSync();

    return () => {
      if (slowTimer.current) clearTimeout(slowTimer.current);
    };
  }, []);

  const runSync = async () => {
    try {
      if (!skipAuth) {
        setStepIndex(0);
        if (platformUserId) {
          await connectPlatformWithUserId(platform ?? 'playtomic', platformUserId);
        } else {
          await connectPlatform(platform ?? 'playtomic', platformEmail, platformPassword);
        }
      }

      setStepIndex(1);
      const result = await syncPlatform();

      if (didNavigate.current) return;
      didNavigate.current = true;

      setStepIndex(4);
      await new Promise(r => setTimeout(r, 600));
      navigation.replace('ProfilePreview', { platform, syncResult: result });
    } catch (err: any) {
      if (didNavigate.current) return;
      const msg = err?.message ?? 'Could not connect to Playtomic.';
      Alert.alert(
        'Connection failed',
        msg + '\n\nPlease try again.',
        [{
          text: 'Go back',
          onPress: () => {
            // Use navigate instead of goBack — this screen may be root of stack
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('PlatformLogin', { platform, label: 'Playtomic' });
            }
          },
        }],
      );
    }
  };

  const handleSkip = () => {
    if (didNavigate.current) return;
    didNavigate.current = true;
    navigation.replace('ProfilePreview', { platform, syncResult: null });
  };

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
      <View style={styles.center}>
        <Animated.Text style={[styles.spinner, { transform: [{ rotate: spin }] }]}>
          🎾
        </Animated.Text>
        <Text style={styles.title}>Hang tight…</Text>
        <Text style={styles.step}>{STEPS[stepIndex]}</Text>
        <View style={styles.dotsRow}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i <= stepIndex && styles.dotActive]} />
          ))}
        </View>

        {isSlow && (
          <View style={styles.slowBox}>
            <Text style={styles.slowText}>
              Still importing… Playtomic can be slow with large match histories.
            </Text>
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
              <Text style={styles.skipText}>Skip for now →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <Text style={styles.footer}>
        Building your profile from your real match history.{'\n'}No questionnaires. No guessing.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  spinner: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: theme.textPrimary },
  step: { fontSize: 15, color: theme.textMuted, textAlign: 'center' },
  dotsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.bgCard },
  dotActive: { backgroundColor: theme.primary },
  slowBox: {
    marginTop: 24, alignItems: 'center', gap: 12,
    backgroundColor: theme.bgCard, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: theme.border,
  },
  slowText: { fontSize: 13, color: theme.textMuted, textAlign: 'center', lineHeight: 20 },
  skipBtn: {
    backgroundColor: theme.primaryDim, borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 10,
    borderWidth: 1, borderColor: theme.primaryBorder,
  },
  skipText: { color: theme.primary, fontSize: 14, fontWeight: '700' },
  footer: {
    fontSize: 13, color: theme.textDim, textAlign: 'center',
    lineHeight: 20, paddingBottom: 48,
  },
});
