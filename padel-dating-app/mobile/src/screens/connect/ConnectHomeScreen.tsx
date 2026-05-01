import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../lib/theme';
import { useDiscovery, DiscoveredPlayer } from '../../hooks/useDiscovery';

// ─── Score badge ──────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 85 ? theme.scoreHigh : score >= 70 ? theme.scoreMid : theme.scoreLow;
  return (
    <View style={[styles.scoreBadge, { borderColor: color }]}>
      <Text style={[styles.scoreValue, { color }]}>{score}</Text>
      <Text style={[styles.scoreLabel, { color }]}>match</Text>
    </View>
  );
}

// ─── Action buttons ───────────────────────────────────────────────────────────

function ActionButtons({
  onPlayAgain, onConnect, onVolley,
}: {
  onPlayAgain: () => void;
  onConnect: () => void;
  onVolley: () => void;
}) {
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

// ─── Player card ──────────────────────────────────────────────────────────────

function PlayerCard({
  player,
  navigation,
  onAction,
}: {
  player: DiscoveredPlayer;
  navigation: any;
  onAction: (type: 'play_again' | 'connect' | 'volley') => void;
}) {
  const firstName = player.fullName.split(' ')[0];

  // Derive age from... we don't have DOB in the discovery type, so skip for now
  // (PlayerProfileScreen shows full details)

  return (
    <TouchableOpacity
      style={styles.playerCard}
      onPress={() => navigation.navigate('PlayerProfile', { userId: player.userId })}
      activeOpacity={0.92}
    >
      <View style={styles.cardHeader}>
        {/* Avatar placeholder — show initials until we have photos */}
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitials}>
            {player.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </Text>
        </View>

        <View style={styles.cardHeaderInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.playerName}>{firstName}</Text>
            {(player.lookingFor === 'date' || player.lookingFor === 'both') && (
              <View style={styles.intentBadge}>
                <Text style={styles.intentText}>
                  {player.lookingFor === 'both' ? '💘 Open' : '💘 Dating'}
                </Text>
              </View>
            )}
          </View>
          {player.city && (
            <Text style={styles.playerCity}>📍 {player.city}</Text>
          )}
          {player.levelValue !== null && (
            <View style={styles.levelRow}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelValue}>{player.levelValue.toFixed(1)}</Text>
              </View>
              {player.levelLabel && (
                <Text style={styles.levelLabel}>{player.levelLabel}</Text>
              )}
            </View>
          )}
        </View>

        <ScoreBadge score={player.volpairScore} />
      </View>

      {/* Court stats */}
      {player.lastClubName && (
        <View style={styles.statsRow}>
          <Text style={styles.statIcon}>🏟</Text>
          <Text style={styles.statText}>{player.lastClubName}</Text>
        </View>
      )}
      {player.matchesTogether > 0 && (
        <View style={styles.statsRow}>
          <Text style={styles.statIcon}>🤝</Text>
          <Text style={styles.statText}>
            Together {player.matchesTogether}x
            {player.winRate !== null ? ` · ${player.winRate}% win rate` : ''}
          </Text>
          {player.playStyle && (
            <>
              <Text style={styles.statIcon}>⚡</Text>
              <Text style={styles.statText}>{player.playStyle}</Text>
            </>
          )}
        </View>
      )}
      {player.mutualVia && (
        <View style={styles.statsRow}>
          <Text style={styles.statIcon}>🔗</Text>
          <Text style={styles.statText}>
            Plays with {player.mutualVia}
            {player.mutualConnections > 1 ? ` · ${player.mutualConnections} shared matches` : ''}
          </Text>
        </View>
      )}

      {/* Action row — or sent state */}
      {player.myAction ? (
        <View style={styles.actionedRow}>
          <Text style={styles.actionedText}>
            {player.myAction === 'play_again' ? '🎾 Play request sent!' :
             player.myAction === 'connect' ? '👋 Connection sent!' :
             '💘 Volley sent — fingers crossed!'}
          </Text>
        </View>
      ) : (
        <ActionButtons
          onPlayAgain={() => onAction('play_again')}
          onConnect={() => onAction('connect')}
          onVolley={() => onAction('volley')}
        />
      )}
    </TouchableOpacity>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyEmoji}>🎾</Text>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ConnectHomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { layer1, layer2, loading, error, reload, sendAction } = useDiscovery();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const handleAction = async (
    player: DiscoveredPlayer,
    type: 'play_again' | 'connect' | 'volley',
  ) => {
    try {
      await sendAction(player.userId, type);
    } catch (e) {
      // silently fail — user sees UI unchanged and can retry
      console.error('sendAction error:', e);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Connect</Text>
          <Text style={styles.headerSub}>People you've shared a court with</Text>
        </View>
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Text style={styles.notifIcon}>🔔</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Finding your court connections…</Text>
        </View>
      ) : error ? (
        <View style={styles.loadingBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={reload}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
        >
          {/* ── Layer 1: played together ──────────────────────────────────── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🎾 People you've played with</Text>
            {layer1.length > 0 && (
              <View style={styles.sectionCountBadge}>
                <Text style={styles.sectionCount}>{layer1.length}</Text>
              </View>
            )}
          </View>
          <Text style={styles.sectionSub}>
            Strongest signal — you already know if there's something there
          </Text>

          {layer1.length === 0 ? (
            <EmptyState message="Sync your Playtomic account to discover people you've played with" />
          ) : (
            layer1.map(p => (
              <PlayerCard
                key={p.userId}
                player={p}
                navigation={navigation}
                onAction={type => handleAction(p, type)}
              />
            ))
          )}

          {/* ── Layer 2: friends of your court ───────────────────────────── */}
          {layer2.length > 0 && (
            <>
              <View style={[styles.sectionHeader, { marginTop: 8 }]}>
                <Text style={styles.sectionTitle}>🔗 Friends of your court</Text>
                <View style={styles.sectionCountBadge}>
                  <Text style={styles.sectionCount}>{layer2.length}</Text>
                </View>
              </View>
              <Text style={styles.sectionSub}>
                Players in your padel circle — not strangers
              </Text>
              {layer2.map(p => (
                <PlayerCard
                  key={p.userId}
                  player={p}
                  navigation={navigation}
                  onAction={type => handleAction(p, type)}
                />
              ))}
            </>
          )}

          {/* ── Layer 3: nearby teaser ────────────────────────────────────── */}
          <View style={styles.nearbyTeaser}>
            <Text style={styles.nearbyTeaserIcon}>📍</Text>
            <View style={styles.nearbyTeaserText}>
              <Text style={styles.nearbyTeaserTitle}>Players nearby</Text>
              <Text style={styles.nearbyTeaserSub}>
                Enable location to discover players in your city
              </Text>
            </View>
            <TouchableOpacity style={styles.nearbyTeaserBtn}>
              <Text style={styles.nearbyTeaserBtnText}>Enable</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

  loadingBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14,
  },
  loadingText: { fontSize: 14, color: theme.textMuted },
  errorText: { fontSize: 14, color: '#EF4444', textAlign: 'center' },
  retryBtn: {
    backgroundColor: theme.primaryDim, borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 10,
    borderWidth: 1, borderColor: theme.primaryBorder,
  },
  retryText: { color: theme.primary, fontWeight: '700' },

  scroll: { paddingHorizontal: 16, paddingTop: 16 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.textPrimary, flex: 1 },
  sectionCountBadge: {
    backgroundColor: theme.primaryDim, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: theme.primaryBorder,
  },
  sectionCount: { fontSize: 12, fontWeight: '700', color: theme.primary },
  sectionSub: { fontSize: 12, color: theme.textMuted, marginBottom: 14, lineHeight: 18 },

  emptyBox: {
    alignItems: 'center', paddingVertical: 32, gap: 10,
    backgroundColor: theme.bgCard, borderRadius: 16, marginBottom: 16,
    borderWidth: 1, borderColor: theme.border,
  },
  emptyEmoji: { fontSize: 36 },
  emptyText: { fontSize: 13, color: theme.textMuted, textAlign: 'center', paddingHorizontal: 24 },

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
  avatarInitials: { fontSize: 18, fontWeight: '800', color: theme.primary },
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

  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
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
  volleyBtn: { backgroundColor: theme.secondaryDim, borderColor: theme.secondaryBorder },
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
