import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../lib/theme';

// Mock — replaced with real data from player_stats + matches tables after Playtomic sync
const MOCK_STATS = {
  level: 4.7, levelLabel: 'Advanced Competitive', levelConfidence: 0.92,
  totalMatches: 124, wins: 84, losses: 40, winRate: 68,
  avgSetFor: 5.8, avgSetAgainst: 4.2,
  playStyle: 'Aggressive',
  preferredTime: 'Evening',
  preferredDays: ['Tuesday', 'Thursday', 'Saturday'],
  topClubs: [
    { name: 'Carbon Padel', count: 38 },
    { name: 'Padel Social Club', count: 24 },
    { name: 'Destination Padel', count: 17 },
  ],
  topPartners: [
    { name: 'James', matches: 22, winRate: 71, emoji: '🎯' },
    { name: 'Carlos', matches: 14, winRate: 57, emoji: '⚡' },
    { name: 'Sofia', matches: 4, winRate: 75, emoji: '🎾' },
  ],
  levelHistory: [4.1, 4.3, 4.4, 4.5, 4.6, 4.7, 4.7],
};

export default function MyStatsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const s = MOCK_STATS;

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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Level */}
        <View style={styles.levelCard}>
          <View style={styles.levelLeft}>
            <Text style={styles.levelValue}>{s.level}</Text>
            <Text style={styles.levelLabel}>{s.levelLabel}</Text>
            <View style={styles.confidenceRow}>
              <View style={styles.confidenceBg}>
                <View style={[styles.confidenceFill, { width: `${s.levelConfidence * 100}%` }]} />
              </View>
              <Text style={styles.confidenceText}>{Math.round(s.levelConfidence * 100)}% confidence</Text>
            </View>
          </View>
          <Text style={styles.levelEmoji}>🏆</Text>
        </View>

        {/* Overview */}
        <View style={styles.overviewRow}>
          <View style={styles.overviewBox}>
            <Text style={styles.overviewValue}>{s.totalMatches}</Text>
            <Text style={styles.overviewLabel}>Matches</Text>
          </View>
          <View style={styles.overviewBox}>
            <Text style={styles.overviewValue}>{s.winRate}%</Text>
            <Text style={styles.overviewLabel}>Win rate</Text>
          </View>
          <View style={styles.overviewBox}>
            <Text style={styles.overviewValue}>{s.wins}</Text>
            <Text style={styles.overviewLabel}>Wins</Text>
          </View>
          <View style={styles.overviewBox}>
            <Text style={styles.overviewValue}>{s.losses}</Text>
            <Text style={styles.overviewLabel}>Losses</Text>
          </View>
        </View>

        {/* Set scores */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Average set scores</Text>
          <View style={styles.setRow}>
            <View style={styles.setBox}>
              <Text style={styles.setFor}>{s.avgSetFor}</Text>
              <Text style={styles.setLabel}>Sets won</Text>
            </View>
            <Text style={styles.setVs}>vs</Text>
            <View style={styles.setBox}>
              <Text style={styles.setAgainst}>{s.avgSetAgainst}</Text>
              <Text style={styles.setLabel}>Sets lost</Text>
            </View>
          </View>
        </View>

        {/* Play style */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Play style</Text>
          <View style={styles.styleRow}>
            <View style={styles.styleBadge}>
              <Text style={styles.styleValue}>{s.playStyle}</Text>
            </View>
            <View style={styles.styleBadge}>
              <Text style={styles.styleValue}>🕐 {s.preferredTime}</Text>
            </View>
          </View>
          <View style={styles.daysRow}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
              const active = s.preferredDays.some(d => d.startsWith(day.slice(0, 3)));
              return (
                <View key={day} style={[styles.dayBox, active && styles.dayBoxActive]}>
                  <Text style={[styles.dayText, active && styles.dayTextActive]}>{day}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Top clubs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Top clubs</Text>
          {s.topClubs.map((c, i) => (
            <View key={i} style={styles.clubRow}>
              <Text style={styles.clubRank}>#{i + 1}</Text>
              <Text style={styles.clubName}>{c.name}</Text>
              <Text style={styles.clubCount}>{c.count} matches</Text>
            </View>
          ))}
        </View>

        {/* Top partners */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤝 Top partners</Text>
          {s.topPartners.map((p, i) => (
            <View key={i} style={styles.partnerRow}>
              <View style={styles.partnerAvatar}>
                <Text style={styles.partnerEmoji}>{p.emoji}</Text>
              </View>
              <View style={styles.partnerInfo}>
                <Text style={styles.partnerName}>{p.name}</Text>
                <Text style={styles.partnerSub}>{p.matches} matches together</Text>
              </View>
              <Text style={styles.partnerWin}>{p.winRate}% win</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.textPrimary },
  backText: { fontSize: 16, color: theme.textSecondary },
  scroll: { padding: 16 },

  levelCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: theme.primaryDim, borderRadius: 18, padding: 20,
    marginBottom: 12, borderWidth: 1.5, borderColor: theme.primaryBorder,
  },
  levelLeft: { flex: 1 },
  levelValue: { fontSize: 40, fontWeight: '800', color: theme.primary, marginBottom: 4 },
  levelLabel: { fontSize: 14, color: theme.textSecondary, marginBottom: 10 },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  confidenceBg: { flex: 1, height: 4, backgroundColor: theme.bgDeep, borderRadius: 2, overflow: 'hidden' },
  confidenceFill: { height: 4, backgroundColor: theme.primary, borderRadius: 2 },
  confidenceText: { fontSize: 11, color: theme.textMuted },
  levelEmoji: { fontSize: 40 },

  overviewRow: {
    flexDirection: 'row', backgroundColor: theme.bgCard, borderRadius: 16,
    padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.border,
  },
  overviewBox: { flex: 1, alignItems: 'center' },
  overviewValue: { fontSize: 20, fontWeight: '800', color: theme.textPrimary, marginBottom: 4 },
  overviewLabel: { fontSize: 11, color: theme.textMuted },

  section: {
    backgroundColor: theme.bgCard, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: theme.border,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: theme.textSecondary, marginBottom: 14 },

  setRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  setBox: { alignItems: 'center' },
  setFor: { fontSize: 32, fontWeight: '800', color: theme.primary },
  setAgainst: { fontSize: 32, fontWeight: '800', color: theme.textMuted },
  setLabel: { fontSize: 12, color: theme.textMuted, marginTop: 4 },
  setVs: { fontSize: 16, color: theme.textDim, fontWeight: '600' },

  styleRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  styleBadge: {
    backgroundColor: theme.primaryDim, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: theme.primaryBorder,
  },
  styleValue: { fontSize: 14, fontWeight: '600', color: theme.primary },

  daysRow: { flexDirection: 'row', gap: 6 },
  dayBox: {
    flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
    backgroundColor: theme.bgDeep, borderWidth: 1, borderColor: theme.border,
  },
  dayBoxActive: { backgroundColor: theme.primaryDim, borderColor: theme.primaryBorder },
  dayText: { fontSize: 11, fontWeight: '600', color: theme.textMuted },
  dayTextActive: { color: theme.primary },

  clubRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  clubRank: { fontSize: 13, fontWeight: '700', color: theme.textDim, width: 24 },
  clubName: { flex: 1, fontSize: 14, color: theme.textPrimary },
  clubCount: { fontSize: 12, color: theme.textMuted },

  partnerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  partnerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.primaryDim, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: theme.primaryBorder,
  },
  partnerEmoji: { fontSize: 18 },
  partnerInfo: { flex: 1 },
  partnerName: { fontSize: 15, fontWeight: '700', color: theme.textPrimary, marginBottom: 2 },
  partnerSub: { fontSize: 12, color: theme.textMuted },
  partnerWin: { fontSize: 13, fontWeight: '700', color: theme.primary },
});
