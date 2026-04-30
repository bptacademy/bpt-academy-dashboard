import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../lib/theme';

const MOCK_PARTNERS = [
  {
    id: '1', name: 'James', age: 34, city: 'London',
    level: 4.6, levelLabel: 'Advanced',
    volpairScore: 88, winRate: 71, playStyle: 'Aggressive',
    availability: 'Weekends + Wed evenings', emoji: '🎯',
    topClub: 'Carbon Padel',
  },
  {
    id: '2', name: 'Carlos', age: 28, city: 'London',
    level: 4.9, levelLabel: 'Advanced+',
    volpairScore: 79, winRate: 65, playStyle: 'Net dominant',
    availability: 'Flexible', emoji: '⚡',
    topClub: 'Padel Social Club',
  },
  {
    id: '3', name: 'Marcus', age: 31, city: 'London',
    level: 4.4, levelLabel: 'Competitive',
    volpairScore: 72, winRate: 58, playStyle: 'Defensive',
    availability: 'Weekday evenings', emoji: '🏆',
    topClub: 'Destination Padel',
  },
  {
    id: '4', name: 'Alex', age: 26, city: 'London',
    level: 4.7, levelLabel: 'Advanced',
    volpairScore: 68, winRate: 62, playStyle: 'Balanced',
    availability: 'Weekends', emoji: '🎾',
    topClub: 'LTA Padel Hub',
  },
];

function PartnerCard({ player }: any) {
  const [sent, setSent] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>{player.emoji}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.playerName}>{player.name}, {player.age}</Text>
          <Text style={styles.playerCity}>📍 {player.city} · {player.topClub}</Text>
          <View style={styles.levelRow}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelValue}>{player.level}</Text>
            </View>
            <Text style={styles.levelLabel}>{player.levelLabel}</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.playStyle}>{player.playStyle}</Text>
          </View>
        </View>
        <View style={[styles.scoreBadge, {
          borderColor: player.volpairScore >= 85 ? theme.primary : player.volpairScore >= 70 ? '#F59E0B' : theme.textMuted
        }]}>
          <Text style={[styles.scoreVal, {
            color: player.volpairScore >= 85 ? theme.primary : player.volpairScore >= 70 ? '#F59E0B' : theme.textMuted
          }]}>{player.volpairScore}</Text>
          <Text style={[styles.scoreLbl, {
            color: player.volpairScore >= 85 ? theme.primary : player.volpairScore >= 70 ? '#F59E0B' : theme.textMuted
          }]}>match</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>📅</Text>
          <Text style={styles.statText}>{player.availability}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>🏆</Text>
          <Text style={styles.statText}>{player.winRate}% win rate</Text>
        </View>
      </View>

      {sent ? (
        <View style={styles.sentRow}>
          <Text style={styles.sentText}>🎾 Play request sent!</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.playBtn} onPress={() => setSent(true)} activeOpacity={0.8}>
          <Text style={styles.playBtnText}>🎾 Send a Serve</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function PlayHomeScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'partner' | 'courts'>('partner');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Play</Text>
          <Text style={styles.headerSub}>Find your next match</Text>
        </View>
      </View>

      {/* Sub-tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.subTab, tab === 'partner' && styles.subTabActive]}
          onPress={() => setTab('partner')}
        >
          <Text style={[styles.subTabText, tab === 'partner' && styles.subTabTextActive]}>
            🎾 Find a Partner
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, tab === 'courts' && styles.subTabActive]}
          onPress={() => setTab('courts')}
        >
          <Text style={[styles.subTabText, tab === 'courts' && styles.subTabTextActive]}>
            🏟 Open Courts
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'partner' ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Text style={styles.sectionSub}>
            Compatible players sorted by your Volpair score
          </Text>
          {MOCK_PARTNERS.map(p => <PartnerCard key={p.id} player={p} />)}
          <View style={{ height: 24 }} />
        </ScrollView>
      ) : (
        <View style={styles.comingSoonBox}>
          <Text style={styles.comingSoonEmoji}>🏟</Text>
          <Text style={styles.comingSoonTitle}>Open Courts</Text>
          <Text style={styles.comingSoonText}>
            Live games near you needing players. Coming in v2.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: theme.bgCard,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: theme.textPrimary },
  headerSub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },

  tabRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8,
  },
  subTab: {
    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
    backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.border,
  },
  subTabActive: {
    backgroundColor: theme.primaryDim, borderColor: theme.primaryBorder,
  },
  subTabText: { fontSize: 13, fontWeight: '600', color: theme.textMuted },
  subTabTextActive: { color: theme.primary },

  scroll: { paddingHorizontal: 16 },
  sectionSub: { fontSize: 12, color: theme.textMuted, marginBottom: 14, lineHeight: 18 },

  card: {
    backgroundColor: theme.bgCard, borderRadius: 18, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: theme.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: theme.primaryDim, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: theme.primaryBorder,
  },
  avatarEmoji: { fontSize: 22 },
  cardInfo: { flex: 1 },
  playerName: { fontSize: 16, fontWeight: '800', color: theme.textPrimary, marginBottom: 3 },
  playerCity: { fontSize: 12, color: theme.textMuted, marginBottom: 6 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  levelBadge: {
    backgroundColor: theme.primaryDim, borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1, borderColor: theme.primaryBorder,
  },
  levelValue: { fontSize: 12, fontWeight: '800', color: theme.primary },
  levelLabel: { fontSize: 12, color: theme.textMuted },
  dot: { fontSize: 12, color: theme.textDim },
  playStyle: { fontSize: 12, color: theme.textSecondary },

  scoreBadge: {
    width: 48, height: 48, borderRadius: 24, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  scoreVal: { fontSize: 15, fontWeight: '800', lineHeight: 17 },
  scoreLbl: { fontSize: 9, fontWeight: '600', lineHeight: 11 },

  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  statIcon: { fontSize: 13 },
  statText: { fontSize: 12, color: theme.textSecondary, flex: 1 },

  playBtn: {
    backgroundColor: theme.primaryDim, borderRadius: 12, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: theme.primaryBorder,
  },
  playBtnText: { color: theme.primary, fontSize: 14, fontWeight: '700' },

  sentRow: { alignItems: 'center', paddingVertical: 10 },
  sentText: { color: theme.primary, fontSize: 13, fontWeight: '600' },

  comingSoonBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40,
  },
  comingSoonEmoji: { fontSize: 56, marginBottom: 16 },
  comingSoonTitle: { fontSize: 22, fontWeight: '800', color: theme.textPrimary, marginBottom: 8 },
  comingSoonText: { fontSize: 14, color: theme.textMuted, textAlign: 'center', lineHeight: 22 },
});
