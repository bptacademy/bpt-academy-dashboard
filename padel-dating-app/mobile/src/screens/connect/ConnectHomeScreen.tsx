import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  StatusBar, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_PLAYERS = [
  {
    id: '1', name: 'Sofia', age: 29, city: 'London',
    level: 4.7, levelLabel: 'Advanced',
    lookingFor: 'both', volpairScore: 91,
    lastPlayed: 'Carbon Padel · 3 days ago',
    matchesTogether: 4, winRate: 68,
    playStyle: 'Aggressive',
    mutualConnections: 3,
    emoji: '🎾',
  },
  {
    id: '2', name: 'Elena', age: 31, city: 'London',
    level: 4.5, levelLabel: 'Competitive',
    lookingFor: 'date', volpairScore: 83,
    lastPlayed: 'Padel Social Club · 1 week ago',
    matchesTogether: 2, winRate: 54,
    playStyle: 'Defensive',
    mutualConnections: 5,
    emoji: '💫',
  },
  {
    id: '3', name: 'Marta', age: 27, city: 'London',
    level: 5.1, levelLabel: 'Advanced+',
    lookingFor: 'partner', volpairScore: 77,
    lastPlayed: 'Destination Padel · 2 weeks ago',
    matchesTogether: 1, winRate: 72,
    playStyle: 'Net dominant',
    mutualConnections: 2,
    emoji: '⚡',
  },
];

const FRIENDS_OF_COURT = [
  {
    id: '4', name: 'Lucia', age: 33, city: 'London',
    level: 4.3, levelLabel: 'Intermediate+',
    lookingFor: 'both', volpairScore: 64,
    mutualVia: 'Sofia', mutualConnections: 1,
    emoji: '🌟',
  },
  {
    id: '5', name: 'Anna', age: 28, city: 'London',
    level: 4.8, levelLabel: 'Advanced',
    lookingFor: 'date', volpairScore: 58,
    mutualVia: 'Elena', mutualConnections: 2,
    emoji: '🔥',
  },
];

// ─── Components ───────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 85 ? '#E63F6B' : score >= 70 ? '#F59E0B' : '#6B7280';
  return (
    <View style={[styles.scoreBadge, { borderColor: color }]}>
      <Text style={[styles.scoreValue, { color }]}>{score}</Text>
      <Text style={[styles.scoreLabel, { color }]}>match</Text>
    </View>
  );
}

function ActionButtons({ onPlayAgain, onConnect, onVolley }: any) {
  return (
    <View style={styles.actionRow}>
      <TouchableOpacity style={styles.actionBtn} onPress={onPlayAgain} activeOpacity={0.75}>
        <Text style={styles.actionEmoji}>🎾</Text>
        <Text style={styles.actionText}>Play again</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionBtn} onPress={onConnect} activeOpacity={0.75}>
        <Text style={styles.actionEmoji}>👋</Text>
        <Text style={styles.actionText}>Connect</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.actionBtn, styles.volleyBtn]} onPress={onVolley} activeOpacity={0.75}>
        <Text style={styles.actionEmoji}>💘</Text>
        <Text style={[styles.actionText, styles.volleyText]}>Volley</Text>
      </TouchableOpacity>
    </View>
  );
}

function PlayerCard({ player, onPlayAgain, onConnect, onVolley }: any) {
  const [actioned, setActioned] = useState<string | null>(null);

  const handle = (type: string, cb: () => void) => {
    setActioned(type);
    cb();
  };

  return (
    <View style={styles.playerCard}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarEmoji}>{player.emoji}</Text>
        </View>
        <View style={styles.cardHeaderInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.playerName}>{player.name}, {player.age}</Text>
            {player.lookingFor === 'date' || player.lookingFor === 'both' ? (
              <View style={styles.intentBadge}>
                <Text style={styles.intentText}>
                  {player.lookingFor === 'both' ? '💘 Open' : '💘 Dating'}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.playerCity}>📍 {player.city}</Text>
          <View style={styles.levelRow}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelValue}>{player.level}</Text>
            </View>
            <Text style={styles.levelLabel}>{player.levelLabel}</Text>
          </View>
        </View>
        <ScoreBadge score={player.volpairScore} />
      </View>

      {/* Stats */}
      {player.lastPlayed && (
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statIcon}>🏟</Text>
            <Text style={styles.statText}>{player.lastPlayed}</Text>
          </View>
        </View>
      )}
      {player.matchesTogether && (
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statIcon}>🤝</Text>
            <Text style={styles.statText}>Played together {player.matchesTogether}x · {player.winRate}% win rate</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statIcon}>⚡</Text>
            <Text style={styles.statText}>{player.playStyle}</Text>
          </View>
        </View>
      )}
      {player.mutualVia && (
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statIcon}>🔗</Text>
            <Text style={styles.statText}>Plays with {player.mutualVia} · {player.mutualConnections} mutual</Text>
          </View>
        </View>
      )}

      {/* Actions */}
      {actioned ? (
        <View style={styles.actionedRow}>
          <Text style={styles.actionedText}>
            {actioned === 'play' ? '🎾 Play request sent!' :
             actioned === 'connect' ? '👋 Connection sent!' :
             '💘 Volley sent — fingers crossed!'}
          </Text>
        </View>
      ) : (
        <ActionButtons
          onPlayAgain={() => handle('play', onPlayAgain)}
          onConnect={() => handle('connect', onConnect)}
          onVolley={() => handle('volley', onVolley)}
        />
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ConnectHomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1B2A" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Connect</Text>
          <Text style={styles.headerSub}>People you've shared a court with</Text>
        </View>
        <TouchableOpacity style={styles.notifBtn}>
          <Text style={styles.notifIcon}>🔔</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Layer 1 — Played with */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🎾 People you've played with</Text>
          <Text style={styles.sectionCount}>{MOCK_PLAYERS.length}</Text>
        </View>
        <Text style={styles.sectionSub}>Strongest signal — you already know if there's something there</Text>

        {MOCK_PLAYERS.map(p => (
          <PlayerCard
            key={p.id}
            player={p}
            onPlayAgain={() => {}}
            onConnect={() => {}}
            onVolley={() => {}}
          />
        ))}

        {/* Layer 2 — Friends of court */}
        <View style={[styles.sectionHeader, { marginTop: 8 }]}>
          <Text style={styles.sectionTitle}>🔗 Friends of your court</Text>
          <Text style={styles.sectionCount}>{FRIENDS_OF_COURT.length}</Text>
        </View>
        <Text style={styles.sectionSub}>Players in your padel circle — not strangers</Text>

        {FRIENDS_OF_COURT.map(p => (
          <PlayerCard
            key={p.id}
            player={p}
            onPlayAgain={() => {}}
            onConnect={() => {}}
            onVolley={() => {}}
          />
        ))}

        {/* Layer 3 teaser */}
        <View style={styles.nearbyTeaser}>
          <Text style={styles.nearbyTeaserIcon}>📍</Text>
          <View style={styles.nearbyTeaserText}>
            <Text style={styles.nearbyTeaserTitle}>12 players nearby</Text>
            <Text style={styles.nearbyTeaserSub}>Connect your location to discover more players in London</Text>
          </View>
          <TouchableOpacity style={styles.nearbyTeaserBtn}>
            <Text style={styles.nearbyTeaserBtnText}>Enable</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B2A' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#111E2E',
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 12, color: '#4A6080', marginTop: 2 },
  notifBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#111E2E', alignItems: 'center', justifyContent: 'center',
  },
  notifIcon: { fontSize: 18 },

  scroll: { paddingHorizontal: 16, paddingTop: 16 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', flex: 1 },
  sectionCount: {
    fontSize: 12, fontWeight: '700', color: '#E63F6B',
    backgroundColor: 'rgba(230,63,107,0.12)', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  sectionSub: { fontSize: 12, color: '#4A6080', marginBottom: 14, lineHeight: 18 },

  playerCard: {
    backgroundColor: '#111E2E', borderRadius: 18, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#1A2C42',
  },

  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  avatarCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(230,63,107,0.12)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(230,63,107,0.2)',
  },
  avatarEmoji: { fontSize: 24 },
  cardHeaderInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  playerName: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  intentBadge: {
    backgroundColor: 'rgba(230,63,107,0.1)', borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  intentText: { fontSize: 11, color: '#E63F6B', fontWeight: '600' },
  playerCity: { fontSize: 12, color: '#4A6080', marginBottom: 6 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  levelBadge: {
    backgroundColor: '#0D1B2A', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: '#1A2C42',
  },
  levelValue: { fontSize: 13, fontWeight: '800', color: '#E63F6B' },
  levelLabel: { fontSize: 12, color: '#4A6080' },

  scoreBadge: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  scoreValue: { fontSize: 16, fontWeight: '800', lineHeight: 18 },
  scoreLabel: { fontSize: 9, fontWeight: '600', lineHeight: 11 },

  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 6 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  statIcon: { fontSize: 13 },
  statText: { fontSize: 12, color: '#7A9CC0', flex: 1 },

  actionRow: {
    flexDirection: 'row', gap: 8, marginTop: 14,
    paddingTop: 14, borderTopWidth: 1, borderTopColor: '#1A2C42',
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10, borderRadius: 12,
    backgroundColor: '#0D1B2A', borderWidth: 1, borderColor: '#1A2C42',
  },
  volleyBtn: {
    backgroundColor: 'rgba(230,63,107,0.08)',
    borderColor: 'rgba(230,63,107,0.3)',
  },
  actionEmoji: { fontSize: 15 },
  actionText: { fontSize: 12, fontWeight: '600', color: '#7A9CC0' },
  volleyText: { color: '#E63F6B' },

  actionedRow: {
    marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#1A2C42',
    alignItems: 'center',
  },
  actionedText: { fontSize: 13, color: '#E63F6B', fontWeight: '600' },

  nearbyTeaser: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#111E2E', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#1A2C42', marginTop: 8,
  },
  nearbyTeaserIcon: { fontSize: 28 },
  nearbyTeaserText: { flex: 1 },
  nearbyTeaserTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 3 },
  nearbyTeaserSub: { fontSize: 12, color: '#4A6080', lineHeight: 18 },
  nearbyTeaserBtn: {
    backgroundColor: '#E63F6B', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  nearbyTeaserBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
