import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  StatusBar, ActivityIndicator, RefreshControl, Share, Image, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../lib/theme';
import { useDiscovery, DiscoveredPlayer } from '../../hooks/useDiscovery';
import { useCourtPicks, CourtPick } from '../../hooks/useCourtPicks';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

// ─── Score badge ──────────────────────────────────────────────────────────────

function ScoreBadge({ score, muted }: { score: number; muted?: boolean }) {
  const color = muted ? theme.textMuted
    : score >= 85 ? theme.scoreHigh
    : score >= 70 ? theme.scoreMid
    : theme.scoreLow;
  return (
    <View style={[styles.scoreBadge, { borderColor: color }]}>
      <Text style={[styles.scoreValue, { color }]}>{score}</Text>
      <Text style={[styles.scoreLabel, { color }]}>match</Text>
    </View>
  );
}

// ─── Action buttons ───────────────────────────────────────────────────────────

function ActionButtons({ onPlayAgain, onConnect, onVolley }: {
  onPlayAgain: () => void; onConnect: () => void; onVolley: () => void;
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

// ─── Invite row ───────────────────────────────────────────────────────────────

function InviteRow({ playerName }: { playerName: string }) {
  const [invited, setInvited] = useState(false);
  const handleInvite = async () => {
    const firstName = playerName.split(' ')[0];
    try {
      await Share.share({ message: `Hey ${firstName}! I found you on Volpair — the app that connects padel players by their real match history. Join me and let's see our compatibility score 🎾\n\nDownload: volpair.app` });
      setInvited(true);
    } catch {}
  };
  if (invited) return <View style={styles.inviteRow}><Text style={styles.invitedText}>✅ Invite sent!</Text></View>;
  return (
    <View style={styles.inviteRow}>
      <Text style={styles.inviteText}>Not on Volpair yet</Text>
      <TouchableOpacity style={styles.inviteBtn} onPress={handleInvite} activeOpacity={0.8}>
        <Text style={styles.inviteBtnText}>📲 Invite</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Player card ──────────────────────────────────────────────────────────────

function PlayerCard({ player, navigation, onAction }: {
  player: DiscoveredPlayer;
  navigation: any;
  onAction: (type: 'play_again' | 'connect' | 'volley') => void;
}) {
  const firstName = player.fullName.split(' ')[0];
  const handlePress = () => {
    if (player.isOnVolpair && player.userId) navigation.navigate('PlayerProfile', { userId: player.userId });
  };

  return (
    <TouchableOpacity
      style={[styles.playerCard, !player.isOnVolpair && styles.playerCardMuted]}
      onPress={handlePress}
      activeOpacity={player.isOnVolpair ? 0.92 : 1}
    >
      {/* Top section: photo left, all info right */}
      <View style={styles.cardBody}>
        {/* Photo */}
        <View style={[styles.avatar, !player.isOnVolpair && styles.avatarMuted]}>
          {player.photos[0]
            ? <Image source={{ uri: player.photos[0] }} style={styles.avatarImg} />
            : <Text style={styles.avatarInitials}>
                {player.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </Text>}
        </View>

        {/* Info column */}
        <View style={styles.cardInfo}>
          {/* Name + intent badge */}
          <View style={styles.nameRow}>
            <Text style={styles.playerName}>{firstName}</Text>
            {player.isOnVolpair && (player.lookingFor === 'date' || player.lookingFor === 'both') && (
              <View style={styles.intentBadge}>
                <Text style={styles.intentText}>{player.lookingFor === 'both' ? '💘 Open' : '💘 Dating'}</Text>
              </View>
            )}
          </View>

          {/* City */}
          {player.city && <Text style={styles.metaText}>📍 {player.city}</Text>}

          {/* Level */}
          {player.levelValue !== null && (
            <View style={styles.levelRow}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelValue}>{player.levelValue.toFixed(1)}</Text>
              </View>
              {player.levelLabel && <Text style={styles.levelLabel}>{player.levelLabel}</Text>}
            </View>
          )}

          {/* Club + matches */}
          {player.lastClubName && <Text style={styles.metaText}>🏟 {player.lastClubName}</Text>}
          {player.matchesTogether > 0 && (
            <Text style={styles.metaText}>
              🤝 Together {player.matchesTogether}x
              {player.winRate !== null ? ` · ${player.winRate}%` : ''}
              {player.playStyle ? ` · ${player.playStyle}` : ''}
            </Text>
          )}
          {player.mutualVia && (
            <Text style={styles.metaText}>
              🔗 Plays with {player.mutualVia}
              {player.mutualConnections > 1 ? ` · ${player.mutualConnections} shared` : ''}
            </Text>
          )}

          {/* Score badge */}
          <View style={{ marginTop: 6 }}>
            <ScoreBadge score={player.volpairScore} muted={!player.isOnVolpair} />
          </View>
        </View>
      </View>

      {/* Actions */}
      {player.isOnVolpair ? (
        player.myAction ? (
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
        )
      ) : (
        <InviteRow playerName={player.fullName} />
      )}
    </TouchableOpacity>
  );
}

// ─── CourtPickCard ────────────────────────────────────────────────────────────

function CourtPickCard({ pick, navigation, onAction }: {
  pick: CourtPick;
  navigation: any;
  onAction: (type: 'play_again' | 'connect' | 'volley') => void;
}) {
  const [myAction, setMyAction] = useState<string | null>(null);
  const initials = pick.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const handleAction = (type: 'play_again' | 'connect' | 'volley') => { setMyAction(type); onAction(type); };
  const scoreColor = pick.volpair_score && pick.volpair_score >= 80 ? theme.primary : theme.textMuted;

  return (
    <TouchableOpacity style={styles.playerCard} onPress={() => navigation.navigate('PlayerProfile', { userId: pick.id })} activeOpacity={0.92}>
      <View style={styles.cardBody}>
        <View style={styles.avatar}>
          {pick.photo_url
            ? <Image source={{ uri: pick.photo_url }} style={styles.avatarImg} />
            : <Text style={styles.avatarInitials}>{initials}</Text>}
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.playerName}>{pick.full_name.split(' ')[0]}</Text>
          {pick.city && <Text style={styles.metaText}>📍 {pick.city}</Text>}
          {pick.level_value !== null && (
            <View style={styles.levelRow}>
              <View style={styles.levelBadge}><Text style={styles.levelValue}>{pick.level_value.toFixed(1)}</Text></View>
            </View>
          )}
          <Text style={styles.metaText}>{pick.distance_miles.toFixed(1)} mi · {pick.total_matches ?? 0} matches</Text>
          <View style={[styles.scoreBadge, { borderColor: scoreColor, marginTop: 6 }]}>
            <Text style={[styles.scoreValue, { color: scoreColor }]}>{pick.volpair_score ?? '—'}</Text>
            <Text style={[styles.scoreLabel, { color: theme.textMuted }]}>match</Text>
          </View>
        </View>
      </View>
      {myAction ? (
        <View style={styles.actionedRow}>
          <Text style={styles.actionedText}>
            {myAction === 'play_again' ? '🎾 Play request sent!' : myAction === 'connect' ? '👋 Connection sent!' : '💘 Volley sent — fingers crossed!'}
          </Text>
        </View>
      ) : (
        <ActionButtons onPlayAgain={() => handleAction('play_again')} onConnect={() => handleAction('connect')} onVolley={() => handleAction('volley')} />
      )}
    </TouchableOpacity>
  );
}

// ─── CourtPicksSection ────────────────────────────────────────────────────────

function CourtPicksSection({ navigation, excludeIds, myLevel, myLookingFor, onAction }: {
  navigation: any; excludeIds: string[]; myLevel: number | null; myLookingFor: string | null;
  onAction: (player: any, type: 'play_again' | 'connect' | 'volley') => void;
}) {
  const { picks, loading, locationDenied, enabled, setEnabled } = useCourtPicks({ excludeIds, myLevel, myLookingFor });

  if (!enabled) {
    return (
      <View style={styles.courtPicksBanner}>
        <View style={styles.courtPicksBannerLeft}>
          <Text style={styles.courtPicksIcon}>🎯</Text>
          <View>
            <Text style={styles.courtPicksTitle}>Court Picks</Text>
            <Text style={styles.courtPicksSub}>Your best matches nearby</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.courtPicksEnableBtn} onPress={() => setEnabled(true)}>
          <Text style={styles.courtPicksEnableBtnText}>Enable</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (locationDenied) return (
    <View style={styles.courtPicksBanner}>
      <Text style={styles.courtPicksIcon}>📍</Text>
      <Text style={styles.courtPicksSub}>Location permission needed for Court Picks</Text>
    </View>
  );
  if (loading) return (
    <View style={[styles.sectionHeader, { marginTop: 8 }]}>
      <Text style={styles.sectionTitle}>🎯 Court Picks</Text>
      <ActivityIndicator size="small" color={theme.primary} style={{ marginLeft: 8 }} />
    </View>
  );
  if (picks.length === 0) return null;

  return (
    <>
      <View style={[styles.sectionHeader, { marginTop: 8 }]}>
        <Text style={styles.sectionTitle}>🎯 Court Picks</Text>
        <View style={styles.sectionCountBadge}><Text style={styles.sectionCount}>{picks.length}</Text></View>
      </View>
      <Text style={styles.sectionSub}>Top matches near you — sorted by compatibility, not distance</Text>
      {picks.map(pick => (
        <CourtPickCard key={pick.id} pick={pick} navigation={navigation} onAction={type => onAction(pick, type)} />
      ))}
    </>
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
  const { user } = useAuth();
  const { layer1, layer2, loading, error, reload, sendAction, excludeIds } = useDiscovery();
  const [refreshing, setRefreshing] = useState(false);
  const [myStats, setMyStats] = useState<{ level_value: number | null } | null>(null);

  useEffect(() => {
    if (user?.id) {
      supabase.from('player_stats').select('level_value').eq('user_id', user.id).maybeSingle()
        .then(({ data }) => setMyStats(data));
    }
  }, [user?.id]);

  const onRefresh = async () => { setRefreshing(true); await reload(); setRefreshing(false); };

  const handleAction = async (player: DiscoveredPlayer, type: 'play_again' | 'connect' | 'volley') => {
    if (!player.userId) return;
    try { await sendAction(player.userId, type); } catch (e) { console.error('sendAction error:', e); }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Connect</Text>
          <Text style={styles.headerSub}>People you've shared a court with</Text>
        </View>
        <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Notifications')}>
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
          <TouchableOpacity style={styles.retryBtn} onPress={reload}><Text style={styles.retryText}>Try again</Text></TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🎾 People you've played with</Text>
            {layer1.length > 0 && <View style={styles.sectionCountBadge}><Text style={styles.sectionCount}>{layer1.length}</Text></View>}
          </View>
          <Text style={styles.sectionSub}>Strongest signal — you already know if there's something there</Text>

          {layer1.length === 0
            ? <EmptyState message="Sync your Playtomic account to discover people you've played with" />
            : layer1.map(p => <PlayerCard key={p.platformUserId} player={p} navigation={navigation} onAction={type => handleAction(p, type)} />)
          }

          {layer2.length > 0 && (
            <>
              <View style={[styles.sectionHeader, { marginTop: 8 }]}>
                <Text style={styles.sectionTitle}>🔗 Friends of your court</Text>
                <View style={styles.sectionCountBadge}><Text style={styles.sectionCount}>{layer2.length}</Text></View>
              </View>
              <Text style={styles.sectionSub}>Players in your padel circle — not strangers</Text>
              {layer2.map(p => <PlayerCard key={p.platformUserId} player={p} navigation={navigation} onAction={type => handleAction(p, type)} />)}
            </>
          )}

          <CourtPicksSection
            navigation={navigation}
            excludeIds={excludeIds ?? []}
            myLevel={myStats?.level_value ?? null}
            myLookingFor={(user as any)?.looking_for ?? null}
            onAction={handleAction}
          />

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const AVATAR_SIZE = 130;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: theme.bgCard,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: theme.textPrimary },
  headerSub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  notifBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.bgCard, alignItems: 'center', justifyContent: 'center' },
  notifIcon: { fontSize: 18 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { fontSize: 14, color: theme.textMuted },
  errorText: { fontSize: 14, color: '#EF4444', textAlign: 'center' },
  retryBtn: { backgroundColor: theme.primaryDim, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: theme.primaryBorder },
  retryText: { color: theme.primary, fontWeight: '700' },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.textPrimary, flex: 1 },
  sectionCountBadge: { backgroundColor: theme.primaryDim, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: theme.primaryBorder },
  sectionCount: { fontSize: 12, fontWeight: '700', color: theme.primary },
  sectionSub: { fontSize: 12, color: theme.textMuted, marginBottom: 14, lineHeight: 18 },
  emptyBox: { alignItems: 'center', paddingVertical: 32, gap: 10, backgroundColor: theme.bgCard, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: theme.border },
  emptyEmoji: { fontSize: 36 },
  emptyText: { fontSize: 13, color: theme.textMuted, textAlign: 'center', paddingHorizontal: 24 },

  playerCard: {
    backgroundColor: theme.bgCard, borderRadius: 18, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: 'rgba(0,212,200,0.15)',
    ...Platform.select({
      ios: { shadowColor: theme.primary, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  playerCardMuted: { opacity: 0.75 },

  // Card body: photo left, info right — same height
  cardBody: { flexDirection: 'row', alignItems: 'stretch', marginBottom: 10, gap: 14 },

  // Photo — tall, fills card height
  avatar: {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: 14,
    backgroundColor: theme.primaryDim, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(0,212,200,0.3)', overflow: 'hidden',
    flexShrink: 0,
  },
  avatarMuted: { backgroundColor: theme.bgDeep, borderColor: theme.border },
  avatarImg: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: 14 },
  avatarInitials: { fontSize: 38, fontWeight: '800', color: theme.primary },

  // Info column — takes remaining space, content stacked top-to-bottom
  cardInfo: { flex: 1, justifyContent: 'flex-start', gap: 3, alignItems: 'flex-end' },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2, justifyContent: 'flex-end' },
  playerName: { fontSize: 18, fontWeight: '800', color: theme.textPrimary },
  intentBadge: { backgroundColor: theme.secondaryDim, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: theme.secondaryBorder },
  intentText: { fontSize: 11, color: '#A78BFA', fontWeight: '600' },

  metaText: { fontSize: 12, color: theme.textSecondary, lineHeight: 18, textAlign: 'right' },

  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-end' },
  levelBadge: { backgroundColor: theme.primaryDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: theme.primaryBorder },
  levelValue: { fontSize: 13, fontWeight: '800', color: theme.primary },
  levelLabel: { fontSize: 12, color: theme.textMuted },

  scoreBadge: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  scoreValue: { fontSize: 16, fontWeight: '800', lineHeight: 18 },
  scoreLabel: { fontSize: 9, fontWeight: '600', lineHeight: 11 },

  actionRow: { flexDirection: 'row', gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 12, backgroundColor: theme.bgDeep, borderWidth: 1, borderColor: theme.border },
  volleyBtn: { backgroundColor: theme.secondaryDim, borderColor: theme.secondaryBorder },
  actionEmoji: { fontSize: 14 },
  actionText: { fontSize: 12, fontWeight: '600', color: theme.textSecondary },
  volleyText: { color: '#A78BFA' },
  actionedRow: { paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border, alignItems: 'center' },
  actionedText: { fontSize: 13, color: theme.primary, fontWeight: '600' },
  inviteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border },
  inviteText: { fontSize: 12, color: theme.textMuted },
  inviteBtn: { backgroundColor: theme.primaryDim, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: theme.primaryBorder },
  inviteBtnText: { color: theme.primary, fontSize: 13, fontWeight: '700' },
  invitedText: { fontSize: 13, color: theme.primary, fontWeight: '600' },

  courtPicksBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(0,212,200,0.2)', marginTop: 8 },
  courtPicksBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  courtPicksIcon: { fontSize: 26 },
  courtPicksTitle: { fontSize: 15, fontWeight: '700', color: theme.textPrimary },
  courtPicksSub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  courtPicksEnableBtn: { backgroundColor: theme.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  courtPicksEnableBtnText: { color: theme.bg, fontSize: 13, fontWeight: '800' },
});
