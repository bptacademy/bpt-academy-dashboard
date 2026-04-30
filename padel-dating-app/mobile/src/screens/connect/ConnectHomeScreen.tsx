import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../lib/theme';

const MOCK_PLAYERS = [
  {
    id: '1', name: 'Sofia', age: 29, city: 'London',
    level: 4.7, levelLabel: 'Advanced',
    lookingFor: 'both', volpairScore: 91,
    lastPlayed: 'Carbon Padel · 3 days ago',
    matchesTogether: 4, winRate: 68, playStyle: 'Aggressive',
    mutualConnections: 3, emoji: '🎾',
  },
  {
    id: '2', name: 'Elena', age: 31, city: 'London',
    level: 4.5, levelLabel: 'Competitive',
    lookingFor: 'date', volpairScore: 83,
    lastPlayed: 'Padel Social Club · 1 week ago',
    matchesTogether: 2, winRate: 54, playStyle: 'Defensive',
    mutualConnections: 5, emoji: '💫',
  },
  {
    id: '3', name: 'Marta', age: 27, city: 'London',
    level: 5.1, levelLabel: 'Advanced+',
    lookingFor: 'partner', volpairScore: 77,
    lastPlayed: 'Destination Padel · 2 weeks ago',
    matchesTogether: 1, winRate: 72, playStyle: 'Net dominant',
    mutualConnections: 2, emoji: '⚡',
  },
];

const FRIENDS_OF_COURT = [
  {
    id: '4', name: 'Lucia', age: 33, city: 'London',
    level: 4.3, levelLabel: 'Intermediate+',
    lookingFor: 'both', volpairScore: 64,
    mutualVia: 'Sofia', mutualConnections: 1, emoji: '🌟',
  },
  {
    id: '5', name: 'Anna', age: 28, city: 'London',
    level: 4.8, levelLabel: 'Advanced',
    lookingFor: 'date', volpairScore: 58,
    mutualVia: 'Elena', mutualConnections: 2, emoji: '🔥',
  },
];

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 85 ? theme.scoreHigh : score >= 70 ? theme.scoreMid : theme.scoreLow;
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

function PlayerCard({ player, navigation }: any) {
  const [actioned, setActioned] = useState<string | null>(null);

  const handle = (type: string) => setActioned(type);

  return (
    <TouchableOpacity
      style={styles.playerCard}
      onPress={() => navigation.navigate('PlayerProfile', { userId: player.id })}
      activeOpacity={0.92}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarEmoji}>{player.emoji}</Text>
        </View>
        <View style={styles.cardHeaderInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.playerName}>{player.name}, {player.age}</Text>
            {(player.lookingFor === 'date' || player.lookingFor === 'both') && (
              <View style={styles.intentBadge}>
                <Text style={styles.intentText}>
                  {player.lookingFor === 'both' ? '💘 Open' : '💘 Dating'}
                </Text>
              </View>
            )}
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

      {player.lastPlayed && (
        <View style={styles.statsRow}>
          <Text style={styles.statIcon}>🏟</Text>
          <Text style={styles.statText}>{player.lastPlayed}</Text>
        </View>
      )}
      {player.matchesTogether && (
        <View style={styles.statsRow}>
          <Text style={styles.statIcon}>🤝</Text>
          <Text style={styles.statText}>
            Together {player.matchesTogether}x · {player.winRate}% win rate
          </Text>
          <Text style={styles.statIcon}>⚡</Text>
          <Text style={styles.statText}>{player.playStyle}</Text>
        </View>
      )}
      {player.mutualVia && (
        <View style={styles.statsRow}>
          <Text style={styles.statIcon}>🔗</Text>
          <Text style={styles.statText}>
            Plays with {player.mutualVia} · {player.mutualConnections} mutual
          </Text>
        </View>
      )}

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
          onPlayAgain={() => handle('play')}
          onConnect={() => handle('connect')}
          onVolley={() => handle('volley')}
        />
      )}
    </TouchableOpacity>
  );
}

export default function ConnectHomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Connect</Text>
          <Text style={styles.headerSub}>People you've shared a court with</Text>
        </View>
        <TouchableOpacity style={styles.notifBtn}>
          <Text style={styles.notifIcon}>🔔</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🎾 People you've played with</Text>
          <View style={styles.sectionCountBadge}>
            <Text style={styles.sectionCount}>{MOCK_PLAYERS.length}</Text>
          </View>
        </View>
        <Text style={styles.sectionSub}>Strongest signal — you already know if there's something there</Text>
        {MOCK_PLAYERS.map(p => <PlayerCard key={p.id} player={p} navigation={navigation} />)}

        <View style={[styles.sectionHeader, { marginTop: 8 }]}>
          <Text style={styles.sectionTitle}>🔗 Friends of your court</Text>
          <View style={styles.sectionCountBadge}>
            <Text style={styles.sectionCount}>{FRIENDS_OF_COURT.length}</Text>
          </View>
        </View>
        <Text style={styles.sectionSub}>Players in your padel circle — not strangers</Text>
        {FRIENDS_OF_COURT.map(p => <PlayerCard key={p.id} player={p} navigation={navigation} />)}

        <View style={styles.nearbyTeaser}>
          <Text style={styles.nearbyTeaserIcon}>📍</Text>
          <View style={styles.nearbyTeaserText}>
            <Text style={styles.nearbyTeaserTitle}>12 players nearby</Text>
            <Text style={styles.nearbyTeaserSub}>Enable location to discover players in London</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: theme.bgCard,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: theme.textPrimary },
  headerSub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  notifBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.bgCard, alignItems: 'center', justifyContent: 'center',
  },
  notifIcon: { fontSize: 18 },

  scroll: { paddingHorizontal: 16, paddingTop: 16 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.textPrimary, flex: 1 },
  sectionCountBadge: {
    backgroundColor: theme.primaryDim, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: theme.primaryBorder,
  },
  sectionCount: { fontSize: 12, fontWeight: '700', color: theme.primary },
  sectionSub: { fontSize: 12, color: theme.textMuted, marginBottom: 14, lineHeight: 18 },

  playerCard: {
    backgroundColor: theme.bgCard, borderRadius: 18, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: theme.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  avatarCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: theme.primaryDim, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: theme.primaryBorder,
  },
  avatarEmoji: { fontSize: 24 },
  cardHeaderInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  playerName: { fontSize: 17, fontWeight: '800', color: theme.textPrimary },
  intentBadge: {
    backgroundColor: theme.secondaryDim, borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1, borderColor: theme.secondaryBorder,
  },
  intentText: { fontSize: 11, color: '#A78BFA', fontWeight: '600' },
  playerCity: { fontSize: 12, color: theme.textMuted, marginBottom: 6 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  levelBadge: {
    backgroundColor: theme.primaryDim, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: theme.primaryBorder,
  },
  levelValue: { fontSize: 13, fontWeight: '800', color: theme.primary },
  levelLabel: { fontSize: 12, color: theme.textMuted },

  scoreBadge: {
    width: 50, height: 50, borderRadius: 25,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  scoreValue: { fontSize: 16, fontWeight: '800', lineHeight: 18 },
  scoreLabel: { fontSize: 9, fontWeight: '600', lineHeight: 11 },

  statsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5,
  },
  statIcon: { fontSize: 13 },
  statText: { fontSize: 12, color: theme.textSecondary, flex: 1 },

  actionRow: {
    flexDirection: 'row', gap: 8, marginTop: 12,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10, borderRadius: 12,
    backgroundColor: theme.bgDeep, borderWidth: 1, borderColor: theme.border,
  },
  volleyBtn: {
    backgroundColor: theme.secondaryDim,
    borderColor: theme.secondaryBorder,
  },
  actionEmoji: { fontSize: 14 },
  actionText: { fontSize: 12, fontWeight: '600', color: theme.textSecondary },
  volleyText: { color: '#A78BFA' },

  actionedRow: {
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: theme.border, alignItems: 'center',
  },
  actionedText: { fontSize: 13, color: theme.primary, fontWeight: '600' },

  nearbyTeaser: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.bgCard, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: theme.border, marginTop: 8,
  },
  nearbyTeaserIcon: { fontSize: 28 },
  nearbyTeaserText: { flex: 1 },
  nearbyTeaserTitle: { fontSize: 15, fontWeight: '700', color: theme.textPrimary, marginBottom: 3 },
  nearbyTeaserSub: { fontSize: 12, color: theme.textMuted, lineHeight: 18 },
  nearbyTeaserBtn: {
    backgroundColor: theme.primary, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  nearbyTeaserBtnText: { color: theme.bg, fontSize: 13, fontWeight: '800' },
});
