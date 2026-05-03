import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../lib/theme';

export default function PlatformLoginScreen({ route, navigation }: any) {
  const { platform, label } = route.params;
  const insets = useSafeAreaInsets();

  const handleWebLogin = () => {
    navigation.navigate('PlaytomicWebLogin', {
      onSuccess: (userId: string) => {
        navigation.navigate('SyncingProfile', { platform, platformUserId: userId });
      },
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.platformBadge}>
            <Text style={styles.platformBadgeText}>🎾 {label}</Text>
          </View>
          <Text style={styles.title}>Connect your account</Text>
          <Text style={styles.subtitle}>
            Sign in to {label} so we can import your match history — any login method works.
          </Text>
        </View>

        <TouchableOpacity style={styles.connectBtn} onPress={handleWebLogin}>
          <Text style={styles.connectBtnText}>Connect via Playtomic</Text>
          <Text style={styles.connectBtnSub}>Apple · Google · Phone · Email</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: 24 },
  backBtn: { paddingVertical: 16 },
  backText: { color: theme.textSecondary, fontSize: 16 },
  header: { marginBottom: 40 },
  platformBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(230,63,107,0.1)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 16,
  },
  platformBadgeText: { color: theme.primary, fontWeight: '700', fontSize: 13 },
  title: { fontSize: 28, fontWeight: '800', color: theme.textPrimary, marginBottom: 10 },
  subtitle: { fontSize: 14, color: theme.textMuted, lineHeight: 22 },
  connectBtn: {
    backgroundColor: theme.primary, borderRadius: 16, paddingVertical: 20,
    alignItems: 'center',
    shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  connectBtnText: { color: '#0D1B2A', fontSize: 17, fontWeight: '800' },
  connectBtnSub: { color: 'rgba(13,27,42,0.6)', fontSize: 12, marginTop: 4 },
});
