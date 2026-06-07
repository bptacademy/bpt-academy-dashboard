import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, fonts } from '../../lib/theme';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { ScreenBackground } from '../../components/ScreenBackground';

const PLATFORMS = [
  {
    id: 'playtomic',
    label: 'Playtomic',
    emoji: '🎾',
    desc: 'The most popular padel booking platform',
    available: true,
  },
  {
    id: 'on_the_court',
    label: 'On the Court',
    emoji: '🎯',
    desc: 'UK & Ireland padel booking',
    available: true,
  },
  {
    id: 'matchi',
    label: 'Matchi',
    emoji: '🏸',
    desc: 'Popular across Scandinavia and Europe',
    available: false,
  },
];

export default function PlatformSelectScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const canGoBack = navigation.canGoBack();
  const { session } = useAuth();

  const [showSkip, setShowSkip] = useState<boolean>(!!route.params?.skipOption);

  useEffect(() => {
    if (route.params?.skipOption) return;
    checkNoPlatform();
  }, []);

  const checkNoPlatform = async () => {
    const authId = session?.user?.id;
    if (!authId) return;

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', authId)
      .maybeSingle();

    if (!user) return;

    const { data: conn } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!conn) {
      setShowSkip(true);
    }
  };

  const handleSkip = async () => {
    const authId = session?.user?.id;
    if (!authId) {
      navigation.replace('Question1Location');
      return;
    }

    const { data: user } = await supabase
      .from('users')
      .select('city, looking_for, visible_to')
      .eq('auth_id', authId)
      .maybeSingle();

    if (user?.city && user?.looking_for && user?.visible_to) {
      navigation.replace('PhotoUpload', {
        city: user.city,
        looking_for: user.looking_for,
        visible_to: user.visible_to,
      });
    } else {
      navigation.replace('Question1Location');
    }
  };

  return (
    <ScreenBackground>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      

      {canGoBack && (
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      )}

      <View style={[styles.header, !canGoBack && styles.headerNoBack]}>
        <Text style={styles.title}>Connect your platform</Text>
        <Text style={styles.subtitle}>
          {"We'll import your match history to build your profile automatically."}
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
            <View style={[styles.platformIcon, p.available && styles.platformIconActive]}>
              <Text style={styles.platformEmoji}>{p.emoji}</Text>
            </View>
            <View style={styles.platformInfo}>
              <Text style={[styles.platformLabel, !p.available && styles.platformLabelDisabled]}>
                {p.label}
              </Text>
              <Text style={styles.platformDesc}>{p.desc}</Text>
            </View>
            {p.available
              ? <Text style={styles.arrow}>›</Text>
              : <View style={styles.comingSoonBadge}><Text style={styles.comingSoonText}>Soon</Text></View>
            }
          </TouchableOpacity>
        ))}
      </View>

      {showSkip && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip for now →</Text>
        </TouchableOpacity>
      )}
    </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', paddingHorizontal: 24 },
  backBtn: { paddingVertical: 16 },
  backText: { color: theme.textSecondary, fontSize: 17.1, fontFamily: fonts.bodyLight },
  header: { marginBottom: 32 },
  headerNoBack: { paddingTop: 24 },
  title: { fontSize: 28, fontFamily: fonts.headlineBold, color: theme.textPrimary, marginBottom: 10 },
  subtitle: { fontSize: 16.1, color: theme.textMuted, lineHeight: 22, fontFamily: fonts.bodyLight },
  list: { gap: 12 },
  platformCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: theme.bgCard, borderRadius: 16, padding: 18,
    borderWidth: 1.5, borderColor: theme.border,
  },
  platformCardDisabled: { opacity: 0.45 },
  platformIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: theme.bgDeep, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: theme.border,
  },
  platformIconActive: {
    backgroundColor: theme.primaryDim, borderColor: theme.primaryBorder,
  },
  platformEmoji: { fontSize: 24 },
  platformInfo: { flex: 1 },
  platformLabel: { fontSize: 18.2, fontFamily: fonts.bodyBold, color: theme.textPrimary, marginBottom: 3 },
  platformLabelDisabled: { color: theme.textMuted },
  platformDesc: { fontSize: 13.9, color: theme.textMuted, fontFamily: fonts.bodyLight },
  arrow: { fontSize: 24, color: theme.primary },
  comingSoonBadge: {
    backgroundColor: theme.bgDeep, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: theme.border,
  },
  comingSoonText: { color: theme.textMuted, fontSize: 11.8, fontFamily: fonts.bodyBold },
  skipBtn: { alignItems: 'center', paddingVertical: 20 },
  skipText: { fontSize: 17.1, color: theme.textSecondary, fontFamily: fonts.bodyBold },
});
