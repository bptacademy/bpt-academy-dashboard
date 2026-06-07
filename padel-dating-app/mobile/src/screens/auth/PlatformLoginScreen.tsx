import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, fonts } from '../../lib/theme';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const SUPABASE_URL = 'https://qmdewocktouqoibbqurh.supabase.co';

export default function PlatformLoginScreen({ route, navigation }: any) {
  const { platform, label } = route.params;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // ── Playtomic: open WebView login ────────────────────────────────────────
  const handlePlaytomicLogin = () => {
    navigation.navigate('PlaytomicWebLogin', {
      onSuccess: (userId: string) => {
        navigation.navigate('SyncingProfile', { platform, platformUserId: userId });
      },
    });
  };

  // ── OTC: skip API auth, register connection, go to onboarding questions ─
  const handleOTCConnect = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      // Register OTC platform connection (no API auth — placeholder for real API later)
      const res = await fetch(`${SUPABASE_URL}/functions/v1/platform-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          platform: 'on_the_court',
          otcUserId: user.id, // use volpair user ID as placeholder
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not connect OTC account');

      // OTC doesn't provide match history — go straight to onboarding questions
      navigation.navigate('Question1Location', { platform: 'on_the_court' });
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isOTC = platform === 'on_the_court';

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.platformBadge}>
            <Text style={styles.platformBadgeText}>
              {isOTC ? '🎯' : '🎾'} {label}
            </Text>
          </View>
          <Text style={styles.title}>
            {isOTC ? 'Connect On The Court' : 'Connect your account'}
          </Text>
          <Text style={styles.subtitle}>
            {isOTC
              ? "We'll build your profile based on your preferences. When our On The Court integration goes live, your match history will sync automatically."
              : `Sign in to ${label} so we can import your match history — any login method works.`
            }
          </Text>
        </View>

        {isOTC ? (
          <>
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>🏗️ Integration coming soon</Text>
              <Text style={styles.infoText}>
                Full On The Court match history sync is in development. For now, we'll ask a few quick questions to set up your profile — takes less than 2 minutes.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.connectBtn, loading && styles.connectBtnDisabled]}
              onPress={handleOTCConnect}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color={theme.bg} />
                : <>
                    <Text style={styles.connectBtnText}>Continue with On The Court</Text>
                    <Text style={styles.connectBtnSub}>Set up your profile manually</Text>
                  </>
              }
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.connectBtn} onPress={handlePlaytomicLogin} activeOpacity={0.85}>
            <Text style={styles.connectBtnText}>Connect via Playtomic</Text>
            <Text style={styles.connectBtnSub}>Apple · Google · Phone · Email</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: 24 },
  backBtn: { paddingVertical: 16 },
  backText: { color: theme.textSecondary, fontSize: 17.1, fontFamily: fonts.bodyLight },
  header: { marginBottom: 32 },
  platformBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(0,212,200,0.1)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 16,
  },
  platformBadgeText: { color: theme.primary, fontFamily: fonts.bodyBold, fontSize: 13.9 },
  title: { fontSize: 28, fontFamily: fonts.headlineBold, color: theme.textPrimary, marginBottom: 10 },
  subtitle: { fontSize: 15, color: theme.textMuted, lineHeight: 22, fontFamily: fonts.bodyLight },
  infoBox: {
    backgroundColor: theme.bgCard, borderRadius: 16, padding: 20,
    borderWidth: 1.5, borderColor: theme.border, marginBottom: 24,
  },
  infoTitle: { fontSize: 16.1, fontFamily: fonts.bodyBold, color: theme.textPrimary, marginBottom: 8 },
  infoText: { fontSize: 13.9, color: theme.textMuted, lineHeight: 20, fontFamily: fonts.bodyLight },
  connectBtn: {
    backgroundColor: theme.primary, borderRadius: 16, paddingVertical: 20,
    alignItems: 'center',
    shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  connectBtnDisabled: { opacity: 0.5 },
  connectBtnText: { color: '#0D1B2A', fontSize: 17, fontFamily: fonts.headlineBold },
  connectBtnSub: { color: 'rgba(13,27,42,0.6)', fontSize: 12.8, marginTop: 4, fontFamily: fonts.bodyLight },
});
