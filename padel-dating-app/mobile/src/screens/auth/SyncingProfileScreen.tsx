import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../lib/theme';
import { connectPlatform, syncPlatform } from '../../lib/platformSync';

const STEPS = [
  'Connecting to Playtomic…',
  'Importing your match history…',
  'Calculating your skill level…',
  'Finding your top clubs…',
  'Building your profile…',
];

export default function SyncingProfileScreen({ route, navigation }: any) {
  const { platform, platformEmail, platformPassword, skipAuth } = route.params ?? {};
  const insets = useSafeAreaInsets();
  const [stepIndex, setStepIndex] = useState(0);
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
    ).start();
    runSync();
  }, []);

  const runSync = async () => {
    try {
      if (!skipAuth) {
        // Step 1: Authenticate with Playtomic + store tokens
        setStepIndex(0);
        await connectPlatform(platform ?? 'playtomic', platformEmail, platformPassword);
      }

      // Step 2–4: Pull match history + calculate stats
      setStepIndex(1);
      const result = await syncPlatform();

      setStepIndex(4);
      await new Promise(r => setTimeout(r, 600));

      navigation.replace('ProfilePreview', { platform, syncResult: result });
    } catch (err: any) {
      const msg = err?.message ?? 'Could not connect to Playtomic.';
      Alert.alert(
        'Connection failed',
        msg + '\n\nPlease check your Playtomic credentials and try again.',
        [{ text: 'Go back', onPress: () => navigation.goBack() }],
      );
    }
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
  footer: {
    fontSize: 13, color: theme.textDim, textAlign: 'center',
    lineHeight: 20, paddingBottom: 48,
  },
});
