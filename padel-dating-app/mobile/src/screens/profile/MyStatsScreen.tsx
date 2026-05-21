import React, { useEffect, useState } from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, StatusBar, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, fonts } from '../../lib/theme';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

function levelLabel(value: number): string {
  if (value >= 5.5) return 'Elite';
  if (value >= 5.0) return 'Advanced+';
  if (value >= 4.5) return 'Advanced';
  if (value >= 4.0) return 'Competitive';
  if (value >= 3.5) return 'Intermediate+';
  if (value >= 3.0) return 'Intermediate';
  return 'Beginner';
}

const DAY_SHORT: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

export default function MyStatsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('player_stats')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', 'playtomic')
        .maybeSingle();
      setStats(data);
    } catch (e) {
      console.error('MyStatsScreen load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const winRatePct = stats ? Math.round((stats.win_rate ?? 0) * 100) : null;
  const playStyleFormatted = stats?.play_style?.replace('_', ' ') ?? null;
  const preferredDays: string[] = stats?.preferred_days ?? [];
  const topClubs: { club_id: string; club_name: string; play_count: number }[] = stats?.top_clubs ?? [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Stats</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={theme.primary} size="large" />
          <Text style={styles.loadingText}>Loading your stats…</Text>
        </View>
      ) : !stats ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>🎾</Text>
          <Text style={styles.emptyTitle}>No stats yet</Text>
          <Text style={styles.emptyText}>
            Sync your Playtomic history to see your level, win rate, play style and more.
          </Text>
          <TouchableOpacity
            style={styles.syncBtn}
            onPress={() => navigation.navigate('PlatformSync')}
          >
            <Text style={styles.syncBtnText}>🔄 Sync History</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* Level card */}
          <View style={styles.levelCard}>
            <View style={styles.levelLeft}>
              <Text style={styles.levelValue}>
                {stats.level_value?.toFixed(2) ?? '—'}
              </Text>
              <Text style={styles.levelLabel}>
                {stats.level_value ? levelLabel(stats.level_value) : '—'}
              </Text>
              {stats.level_confidence != null && (
                <View style={styles.confidenceRow}>
                  <View style={styles.confidenceBg}>
                    <View style={[styles.confidenceFill, { width: `${Math.round(stats.level_confidence * 100)}%` as any }]} />
                  </View>
                  <Text style={styles.confidenceText}>
                    {Math.round(stats.level_confidence * 100)}% confidence
                  </Text>
                </View>
              )}
            </View>
            <Image source={require('../../../assets/icons/13. Trophy.png')} style={styles.trophyWatermark} />
          </View>

          {/* Overview */}
          <View style={styles.overviewRow}>
            <View style={styles.overviewBox}>
              <Text style={styles.overviewValue}>{stats.total_matches ?? 0}</Text>
              <Text style={styles.overviewLabel}>Matches</Text>
            </View>
            <View style={styles.overviewBox}>
              <Text style={styles.overviewValue}>{winRatePct != null ? `${winRatePct}%` : '—'}</Text>
              <Text style={styles.overviewLabel}>Win rate</Text>
            </View>
            <View style={styles.overviewBox}>
              <Text style={styles.overviewValue}>{stats.wins ?? 0}</Text>
              <Text style={styles.overviewLabel}>Wins</Text>
            </View>
            <View style={styles.overviewBox}>
              <Text style={styles.overviewValue}>{stats.losses ?? 0}</Text>
              <Text style={styles.overviewLabel}>Losses</Text>
            </View>
          </View>

          {/* Set scores */}
          {(stats.avg_set_score_for != null || stats.avg_set_score_against != null) && (
            <View style={styles.section}>
              <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:14}}><Image source={require('../../../assets/icons/4. Rating.png')} style={{width:24,height:24,tintColor:'#7A9CC0'}} /><Text style={[styles.sectionTitle,{marginBottom:0}]}>Average set scores</Text></View>
              <View style={styles.setRow}>
                <View style={styles.setBox}>
                  <Text style={styles.setFor}>
                    {stats.avg_set_score_for?.toFixed(1) ?? '—'}
                  </Text>
                  <Text style={styles.setLabel}>Sets won</Text>
                </View>
                <Text style={styles.setVs}>vs</Text>
                <View style={styles.setBox}>
                  <Text style={styles.setAgainst}>
                    {stats.avg_set_score_against?.toFixed(1) ?? '—'}
                  </Text>
                  <Text style={styles.setLabel}>Sets lost</Text>
                </View>
              </View>
            </View>
          )}

          {/* Play style + preferred days */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚡ Play style</Text>
            <View style={styles.styleRow}>
              {playStyleFormatted && (
                <View style={styles.styleBadge}>
                  <Text style={styles.styleValue}>
                    {playStyleFormatted.charAt(0).toUpperCase() + playStyleFormatted.slice(1)}
                  </Text>
                </View>
              )}
              {stats.preferred_time_of_day && (
                <View style={styles.styleBadge}>
                  <Text style={styles.styleValue}>
                    🕐 {stats.preferred_time_of_day.charAt(0).toUpperCase() + stats.preferred_time_of_day.slice(1)}
                  </Text>
                </View>
              )}
            </View>
            {preferredDays.length > 0 && (
              <View style={styles.daysRow}>
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                  const active = preferredDays.includes(day);
                  return (
                    <View key={day} style={[styles.dayBox, active && styles.dayBoxActive]}>
                      <Text style={[styles.dayText, active && styles.dayTextActive]}>
                        {DAY_SHORT[day]}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Top clubs */}
          {topClubs.length > 0 && (
            <View style={styles.section}>
              <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:14}}><Image source={require('../../../assets/icons/3. Location.png')} style={{width:24,height:24,tintColor:'#7A9CC0'}} /><Text style={[styles.sectionTitle,{marginBottom:0}]}>Top clubs</Text></View>
              {topClubs.map((c, i) => (
                <View key={i} style={styles.clubRow}>
                  <Text style={styles.clubRank}>#{i + 1}</Text>
                  <Text style={styles.clubName}>{c.club_name}</Text>
                  <Text style={styles.clubCount}>{c.play_count} matches</Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: theme.bgCard,
  },
  headerTitle: { fontSize: 17, fontFamily: fonts.bodyBold, color: theme.textPrimary },
  backText: { fontSize: 16, color: theme.textSecondary, fontFamily: fonts.bodyLight },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
  loadingText: { fontSize: 14, color: theme.textMuted, fontFamily: fonts.bodyLight },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontFamily: fonts.headlineBold, color: theme.textPrimary },
  emptyText: { fontSize: 14, color: theme.textMuted, textAlign: 'center', lineHeight: 22, fontFamily: fonts.bodyLight },
  syncBtn: {
    marginTop: 8, backgroundColor: theme.primaryDim, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12, borderWidth: 1, borderColor: theme.primaryBorder,
  },
  syncBtnText: { color: theme.primary, fontSize: 15, fontFamily: fonts.bodyBold },
  scroll: { padding: 16 },
  levelCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: theme.primaryDim, borderRadius: 18, padding: 20,
    marginBottom: 12, borderWidth: 1.5, borderColor: theme.primaryBorder,
    overflow: 'hidden', position: 'relative',
  },
  levelLeft: { flex: 1 },
  levelValue: { fontSize: 40, fontFamily: fonts.headlineLightIt, color: theme.primary, marginBottom: 4 },
  levelLabel: { fontSize: 14, color: theme.textSecondary, marginBottom: 10, fontFamily: fonts.bodyLight },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  confidenceBg: { flex: 1, height: 4, backgroundColor: theme.bgDeep, borderRadius: 2, overflow: 'hidden' },
  confidenceFill: { height: 4, backgroundColor: theme.primary, borderRadius: 2 },
  confidenceText: { fontSize: 11, color: theme.textMuted, fontFamily: fonts.bodyLight },
  levelEmoji: { fontSize: 40 },
  overviewRow: {
    flexDirection: 'row', backgroundColor: theme.bgCard, borderRadius: 16,
    padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.border,
  },
  overviewBox: { flex: 1, alignItems: 'center' },
  overviewValue: { fontSize: 20, fontFamily: fonts.headlineLightIt, color: theme.textPrimary, marginBottom: 4 },
  overviewLabel: { fontSize: 11, color: theme.textMuted, fontFamily: fonts.bodyLight },
  section: {
    backgroundColor: theme.bgCard, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: theme.border,
  },
  sectionTitle: { fontSize: 14, fontFamily: fonts.bodyBold, color: theme.textSecondary, marginBottom: 14 },
  setRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  setBox: { alignItems: 'center' },
  setFor: { fontSize: 32, fontFamily: fonts.headlineLightIt, color: theme.primary },
  setAgainst: { fontSize: 32, fontFamily: fonts.headlineLightIt, color: theme.textMuted },
  setLabel: { fontSize: 12, color: theme.textMuted, marginTop: 4, fontFamily: fonts.bodyLight },
  setVs: { fontSize: 16, color: theme.textDim, fontFamily: fonts.bodyBold },
  styleRow: { flexDirection: 'row', gap: 10, marginBottom: 14, flexWrap: 'wrap' },
  styleBadge: {
    backgroundColor: theme.primaryDim, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: theme.primaryBorder,
  },
  styleValue: { fontSize: 14, fontFamily: fonts.bodyBold, color: theme.primary },
  daysRow: { flexDirection: 'row', gap: 6 },
  dayBox: {
    flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
    backgroundColor: theme.bgDeep, borderWidth: 1, borderColor: theme.border,
  },
  dayBoxActive: { backgroundColor: theme.primaryDim, borderColor: theme.primaryBorder },
  dayText: { fontSize: 10, fontFamily: fonts.bodyBold, color: theme.textMuted },
  dayTextActive: { color: theme.primary },
  clubRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  clubRank: { fontSize: 13, fontFamily: fonts.bodyBold, color: theme.textDim, width: 24 },
  clubName: { flex: 1, fontSize: 14, color: theme.textPrimary, fontFamily: fonts.bodyLight },
  clubCount: { fontSize: 12, color: theme.textMuted, fontFamily: fonts.bodyLight },
});
