import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, fonts } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function ProfilePreviewScreen({ route, navigation }: any) {
  const { syncResult } = route.params ?? {};
  const insets = useSafeAreaInsets();
  const { user: authUser } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Get the Volpair user record
      const { data: volpairUser } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('auth_id', authUser?.id ?? '')
        .maybeSingle();

      if (!volpairUser) { setLoading(false); return; }

      // Get player stats
      const { data: playerStats } = await supabase
        .from('player_stats')
        .select('*')
        .eq('user_id', volpairUser.id)
        .eq('platform', 'playtomic')
        .maybeSingle();

      setStats({
        full_name: volpairUser.full_name ?? authUser?.email?.split('@')[0] ?? 'Player',
        level_value: playerStats?.level_value ?? syncResult?.level ?? null,
        level_confidence: playerStats?.level_confidence ?? null,
        total_matches: playerStats?.total_matches ?? syncResult?.matches_imported ?? 0,
        win_rate: playerStats?.win_rate ? Math.round(playerStats.win_rate * 100) : null,
        top_clubs: playerStats?.top_clubs?.slice(0, 3) ?? [],
        play_style: playerStats?.play_style ?? null,
      });
    } catch (err) {
      console.error('ProfilePreview load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const levelLabel = (level: number | null) => {
    if (!level) return 'Unknown';
    if (level < 2.5) return 'Beginner';
    if (level < 3.5) return 'Intermediate';
    if (level < 4.5) return 'Competitive';
    if (level < 5.5) return 'Advanced';
    return 'Elite';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={theme.primary} size="large" />
        <Text style={styles.loadingText}>Loading your profile…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Here's what we found</Text>
          <Text style={styles.subtitle}>
            Built from your Playtomic history. Does this look right?
          </Text>
        </View>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitials}>
              {(stats?.full_name ?? 'P').split(' ').map((n: string) => n[0]).join('').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{stats?.full_name ?? 'Player'}</Text>

          {stats?.level_value ? (
            <View style={styles.levelBadge}>
              <Text style={styles.levelValue}>{stats.level_value.toFixed(2)}</Text>
              <Text style={styles.levelLabel}>{levelLabel(stats.level_value)}</Text>
            </View>
          ) : (
            <View style={styles.levelBadge}>
              <Text style={styles.levelLabel}>Level not yet calculated</Text>
            </View>
          )}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats?.total_matches ?? 0}</Text>
            <Text style={styles.statLabel}>Matches</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {stats?.win_rate != null ? `${stats.win_rate}%` : '—'}
            </Text>
            <Text style={styles.statLabel}>Win rate</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats?.top_clubs?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Clubs</Text>
          </View>
        </View>

        {/* Top clubs */}
        {stats?.top_clubs?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 Regular clubs</Text>
            {stats.top_clubs.map((c: any, i: number) => (
              <View key={i} style={styles.clubRow}>
                <View style={styles.clubDot} />
                <Text style={styles.clubName}>{c.club_name}</Text>
                <Text style={styles.clubCount}>{c.play_count} matches</Text>
              </View>
            ))}
          </View>
        )}

        {stats?.play_style && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚡ Play style</Text>
            <View style={styles.styleBadge}>
              <Text style={styles.styleText}>
                {stats.play_style.charAt(0).toUpperCase() + stats.play_style.slice(1).replace('_', ' ')}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>✨</Text>
          <Text style={styles.infoText}>
            Your Volpair score builds as more players join. The more you play, the more accurate it gets.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={() => navigation.navigate('Question1Location')}
          activeOpacity={0.85}
        >
          <Text style={styles.confirmBtnText}>Looks good — continue →</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.wrongLink}>Something's wrong</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1, backgroundColor: theme.bg,
    justifyContent: 'center', alignItems: 'center', gap: 16,
  },
  loadingText: { fontSize: 16.1, color: theme.textMuted, fontFamily: fonts.bodyLight },
  container: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: 24 },
  header: { paddingTop: 24, marginBottom: 24 },
  title: { fontSize: 28, fontFamily: fonts.headlineBold, color: theme.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 16.1, color: theme.textMuted, lineHeight: 22, fontFamily: fonts.bodyLight },
  profileCard: {
    backgroundColor: theme.bgCard, borderRadius: 20, padding: 24,
    alignItems: 'center', borderWidth: 1.5, borderColor: theme.border, marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: theme.primaryDim, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12, borderWidth: 2, borderColor: theme.primaryBorder,
  },
  avatarInitials: { fontSize: 28, fontFamily: fonts.headlineBold, color: theme.primary },
  name: { fontSize: 22, fontFamily: fonts.headlineBold, color: theme.textPrimary, marginBottom: 10 },
  levelBadge: {
    backgroundColor: theme.primaryDim, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center',
    borderWidth: 1, borderColor: theme.primaryBorder,
  },
  levelValue: { fontSize: 24, fontFamily: fonts.headlineLightIt, color: theme.primary },
  levelLabel: { fontSize: 12.8, color: theme.textSecondary, fontFamily: fonts.bodyBold, marginTop: 2 },
  statsRow: {
    flexDirection: 'row', backgroundColor: theme.bgCard, borderRadius: 16,
    padding: 20, marginBottom: 12, borderWidth: 1, borderColor: theme.border,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontFamily: fonts.headlineLightIt, color: theme.textPrimary, marginBottom: 4 },
  statLabel: { fontSize: 12.8, color: theme.textMuted, fontFamily: fonts.bodyBold },
  statDivider: { width: 1, backgroundColor: theme.border },
  section: {
    backgroundColor: theme.bgCard, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: theme.border,
  },
  sectionTitle: { fontSize: 15, fontFamily: fonts.bodyBold, color: theme.textSecondary, marginBottom: 12 },
  clubRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  clubDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.primary },
  clubName: { flex: 1, fontSize: 15, color: theme.textPrimary, fontFamily: fonts.bodyLight },
  clubCount: { fontSize: 12.8, color: theme.textMuted, fontFamily: fonts.bodyLight },
  styleBadge: {
    backgroundColor: theme.primaryDim, borderRadius: 10, alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: theme.primaryBorder,
  },
  styleText: { fontSize: 15, fontFamily: fonts.bodyBold, color: theme.primary },
  infoBox: {
    flexDirection: 'row', gap: 10, backgroundColor: theme.bgCard,
    borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 100,
  },
  infoIcon: { fontSize: 18 },
  infoText: { flex: 1, fontSize: 13.9, color: theme.textMuted, lineHeight: 20, fontFamily: fonts.bodyLight },
  actions: { paddingBottom: 16, gap: 12 },
  confirmBtn: {
    backgroundColor: theme.primary, borderRadius: 16, padding: 18, alignItems: 'center',
    shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  confirmBtnText: { color: '#05020E', fontSize: 17, fontFamily: fonts.headlineBold },
  wrongLink: { color: theme.textMuted, fontSize: 15, textAlign: 'center', paddingVertical: 8, fontFamily: fonts.bodyLight },
});
