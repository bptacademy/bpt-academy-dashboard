import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PLATFORMS = [
  {
    id: 'playtomic',
    label: 'Playtomic',
    emoji: '🎾',
    desc: 'The most popular padel booking platform',
    available: true,
  },
  {
    id: 'matchi',
    label: 'Matchi',
    emoji: '🏸',
    desc: 'Popular across Scandinavia and Europe',
    available: false,
  },
  {
    id: 'on_the_court',
    label: 'On the Court',
    emoji: '🎯',
    desc: 'UK & Ireland padel booking',
    available: false,
  },
];

export default function PlatformSelectScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1B2A" />

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>Choose your platform</Text>
        <Text style={styles.subtitle}>
          We'll import your match history to build your profile automatically.
        </Text>
      </View>

      <View style={styles.list}>
        {PLATFORMS.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.platformCard, !p.available && styles.platformCardDisabled]}
            onPress={() => p.available && navigation.navigate('PlatformLogin', { platform: p.id, label: p.label })}
            activeOpacity={p.available ? 0.75 : 1}
          >
            <View style={styles.platformIcon}>
              <Text style={styles.platformEmoji}>{p.emoji}</Text>
            </View>
            <View style={styles.platformInfo}>
              <Text style={[styles.platformLabel, !p.available && styles.platformLabelDisabled]}>
                {p.label}
              </Text>
              <Text style={styles.platformDesc}>{p.desc}</Text>
            </View>
            {p.available ? (
              <Text style={styles.arrow}>›</Text>
            ) : (
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Soon</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B2A', paddingHorizontal: 24 },
  backBtn: { paddingVertical: 16 },
  backText: { color: '#7A9CC0', fontSize: 16 },
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginBottom: 10 },
  subtitle: { fontSize: 15, color: '#4A6080', lineHeight: 22 },
  list: { gap: 12 },
  platformCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#111E2E', borderRadius: 16, padding: 18,
    borderWidth: 1.5, borderColor: '#1A2C42',
  },
  platformCardDisabled: { opacity: 0.45 },
  platformIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(230,63,107,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  platformEmoji: { fontSize: 24 },
  platformInfo: { flex: 1 },
  platformLabel: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', marginBottom: 3 },
  platformLabelDisabled: { color: '#4A6080' },
  platformDesc: { fontSize: 13, color: '#4A6080' },
  arrow: { fontSize: 24, color: '#E63F6B', fontWeight: '300' },
  comingSoonBadge: {
    backgroundColor: '#1A2C42', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  comingSoonText: { color: '#4A6080', fontSize: 11, fontWeight: '600' },
});
