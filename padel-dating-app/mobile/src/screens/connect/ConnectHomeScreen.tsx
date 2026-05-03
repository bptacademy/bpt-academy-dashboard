import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  StatusBar, ActivityIndicator, RefreshControl, Share, Image, Platform, FlatList,
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

// ─── Player card (vertical feed) ─────────────────────────────────────────────

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
      <View style={styles.cardBody}>
        <View style={[styles.avatar, !player.isOnVolpair && styles.avatarMuted]}>
          {player.photos[0]
            ? <Image source={{ uri: player.photos[0] }} style={styles.avatarImg} />
            : <Text style={styles.avatarInitials}>
                {player.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </Text>}
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.playerName}>{firstName}</Text>
            {player.isOnVolpair && (player.lookingFor === 'date' || player.lookingFor === 'both') && (
              <View style={styles.intentBadge}>
                <Text style={styles.intentText}>{player.lookingFor === 'both' ? '💘 Open' : '💘 Dating'}</Text>
              </View>
            )}
          </View>
          {player.city && <Text style={styles.metaText}>📍 {player.city}</Text>}
          {player.levelValue !== null && (
            <View style={styles.levelRow}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelValue}>{player.levelValue.toFixed(1)}</Text>
              </View>
              {player.levelLabel && <Text style={styles.levelLabel}>{player.levelLabel}</Text>}
            </View>
          )}
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
          <View style={{ marginTop: 6 }}>
            <ScoreBadge score={player.volpairScore} muted={!player.isOnVolpair} />
          </View>
        </View>
      </View>
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

// ─── Court Pick horizontal mini-card ─────────────────────────────────────────

function CourtPickMiniCard({ pick, navigation, onAction, blurred }: {
  pick: CourtPick | null;
  navigation: any;
  onAction?: (type: 'play_again' | 'connect' | 'volley') => void;
  blurred?: boolean;
}) {
  const [myAction, setMyAction] = useState<string | null>(null);

  if (blurred || !pick) {
    return (
      <View style={styles.miniCard}>
        <View style={styles.miniAvatarGhost} />
        <View style={styles.miniNameGhost} />
        <View style={styles.miniScoreGhost} />
        <View style={styles.miniMetaGhost} />
      </View>
    );
  }

  const initials = pick.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const scoreColor = pick.volpair_score && pick.volpair_score >= 85 ? theme.scoreHigh
    : pick.volpair_score && pick.volpair_score >= 70 ? theme.scoreMid
    : theme.scoreLow;

  const handleAction = (type: 'play_again' | 'connect' | 'volley') => {
    setMyAction(type);
    onAction?.(type);
  };

  return (
    <TouchableOpacity
      style={styles.miniCard}
      onPress={() => navigation.navigate('PlayerProfile', { userId: pick.id })}
      activeOpacity={0.88}
    >
      <View style={styles.miniAvatar}>
        {pick.photo_url
          ? <Image source={{ uri: pick.photo_url }} style={styles.miniAvatarImg} />
          : <Text style={styles.miniAvatarInitials}>{initials}</Text>}
      </View>
      <Text style={styles.miniName} numberOfLines={1}>{pick.full_name.split(' ')[0]}</Text>
      {pick.city && <Text style={styles.miniCity} numberOfLines={1}>📍 {pick.city}</Text>}
      <View style={[styles.miniScorePill, { borderColor: scoreColor }]}>
        <Text style={[styles.miniScoreValue, { color: scoreColor }]}>{pick.volpair_score ?? '—'}</Text>
        <Text style={styles.miniScoreLabel}> match</Text>
      </View>
      {myAction ? (
        <Text style={styles.miniActioned}>
          {myAction === 'volley' ? '💘 Sent!' : myAction === 'connect' ? '👋 Sent!' : '🎾 Sent!'}
        </Text>
      ) : (
        <View style={styles.miniActions}>
          <TouchableOpacity style={styles.miniActionBtn} onPress={() => handleAction('connect')} activeOpacity={0.75}>
            <Text style={styles.miniActionText}>👋</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.miniActionBtn, styles.miniVolleyBtn]} onPress={() => handleAction('volley')} activeOpacity={0.75}>
            <Text style={styles.miniActionText}>💘</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Court Picks horizontal strip ────────────────────────────────────────────

const GHOST_PICKS = [null, null, null];

function CourtPicksStrip({ navigation, excludeIds, myLevel, myLookingFor, onAction }: {
  navigation: any;
  excludeIds: string[];
  myLevel: number | null;
  myLookingFor: string | null;
  onAction: (player: CourtPick, type: 'play_again' | 'connect' | 'volley') => void;
}) {
  const { picks, loading, locationDenied, enabled, setEnabled } = useCourtPicks({ excludeIds, myLevel, myLookingFor });

  return (
    <View style={styles.stripSection}>
      <View style={styles.stripHeader}>
        <View style={styles.stripTitleRow}>
          <Text style={styles.stripTitle}>🎯 Court Picks</Text>
          {enabled && picks.length > 0 && (
            <View style={styles.sectionCountBadge}>
              <Text style={styles.sectionCount}>{picks.length}</Text>
            </View>
          )}
        </View>
        <Text style={styles.stripSub}>
          {enabled ? 'Top matches near you — sorted by compatibility' : 'Your best matches nearby, sorted by compatibility'}
        </Text>
      </View>

      <View style={styles.stripBody}>
        {enabled && loading ? (
          <View style={styles.stripLoading}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={styles.stripLoadingText}>Finding picks…</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stripScroll}
          >
            {(enabled && !locationDenied && picks.length > 0 ? picks : GHOST_PICKS).map((pick, i) => (
              <CourtPickMiniCard
                key={pick ? pick.id : `ghost-${i}`}
                pick={pick}
                navigation={navigation}
                blurred={!enabled || locationDenied || picks.length === 0}
                onAction={pick ? type => onAction(pick, type) : undefined}
              />
            ))}
          </ScrollView>
        )}

        {/* Dark overlay when not enabled — no native blur needed */}
        {(!enabled || locationDenied) && (
          <View style={styles.stripOverlay}>
            <View style={styles.stripOverlayContent}>
              <Text style={styles.stripOverlayIcon}>🎯</Text>
              <Text style={styles.stripOverlayTitle}>
                {locationDenied ? 'Location needed' : 'Enable Court Picks'}
              </Text>
              <Text style={styles.stripOverlaySub}>
                {locationDenied
                  ? 'Allow location access to see picks near you'
                  : 'See your highest-rated matches in your area'}
              </Text>
              <TouchableOpacity
                style={styles.stripEnableBtn}
                onPress={() => setEnabled(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.stripEnableBtnText}>
                  {locationDenied ? 'Allow location' : 'Enable'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
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

  const handleCourtPickAction = async (pick: CourtPick, type: 'play_again' | 'connect' | 'volley') => {
    if (!user?.id) return;
    try {
      await supabase.from('connections').insert({
        sender_id: user.id,
        receiver_id: pick.id,
        action_type: type,
      });
    } catch (e) { console.error('courtPick action error:', e); }
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
          <TouchableOpacity style={styles.retryBtn} onPress={reload}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        >
          <CourtPicksStrip
            navigation={navigation}
            excludeIds={excludeIds ?? []}
            myLevel={myStats?.level_value ?? null}
            myLookingFor={(user as any)?.looking_for ?? null}
            onAction={handleCourtPickAction}
          />

          <View style={[styles.sectionHeader, { marginTop: 20 }]}>
            <Text style={styles.sectionTitle}>🎾 People you've played with</Text>
            {layer1.length > 0 && (
              <View style={styles.sectionCountBadge}>
                <Text style={styles.sectionCount}>{layer1.length}</Text>
              </View>
            )}
          </View>
          <Text style={styles.sectionSub}>Strongest signal — you already know if there's something there</Text>

          {layer1.length === 0
            ? <EmptyState message="Sync your Playtomic account to discover people you've played with" />
            : layer1.map(p => (
                <PlayerCard key={p.platformUserId} player={p} navigation={navigation} onAction={type => handleAction(p, type)} />
              ))
          }

          {layer2.length > 0 && (
            <>
              <View style={[styles.sectionHeader, { marginTop: 8 }]}>
                <Text style={styles.sectionTitle}>🔗 Friends of your court</Text>
                <View style={styles.sectionCountBadge}>
                  <Text style={styles.sectionCount}>{layer2.length}</Text>
                </View>
              </View>
              <Text style={styles.sectionSub}>Players in your padel circle — not strangers</Text>
              {layer2.map(p => (
                <PlayerCard key={p.platformUserId} player={p} navigation={navigation} onAction={type => handleAction(p, type)} />
              ))}
            </>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const AVATAR_SIZE = 130;
const MINI_CARD_WIDTH = 148;
const MINI_AVATAR_SIZE = 72;

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

  // ── Court Picks strip ──
  stripSection: { marginBottom: 4 },
  stripHeader: { marginBottom: 10 },
  stripTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  stripTitle: { fontSize: 15, fontWeight: '700', color: theme.textPrimary },
  stripSub: { fontSize: 12, color: theme.textMuted, lineHeight: 18 },
  stripBody: { position: 'relative', minHeight: 210 },
  stripLoading: { height: 210, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  stripLoadingText: { fontSize: 13, color: theme.textMuted },
  stripScroll: { paddingRight: 8, gap: 10 },
  stripOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(13,27,42,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripOverlayContent: { alignItems: 'center', gap: 6, paddingHorizontal: 24 },
  stripOverlayIcon: { fontSize: 28, marginBottom: 2 },
  stripOverlayTitle: { fontSize: 16, fontWeight: '800', color: theme.textPrimary, textAlign: 'center' },
  stripOverlaySub: { fontSize: 12, color: theme.textSecondary, textAlign: 'center', lineHeight: 18 },
  stripEnableBtn: {
    marginTop: 8, backgroundColor: theme.primary,
    borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10,
  },
  stripEnableBtnText: { color: theme.bg, fontSize: 14, fontWeight: '800' },

  // ── Mini card ──
  miniCard: {
    width: MINI_CARD_WIDTH, backgroundColor: theme.bgCard, borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: 'rgba(0,212,200,0.15)', alignItems: 'center', gap: 6,
    ...Platform.select({
      ios: { shadowColor: theme.primary, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  miniAvatar: {
    width: MINI_AVATAR_SIZE, height: MINI_AVATAR_SIZE, borderRadius: MINI_AVATAR_SIZE / 2,
    backgroundColor: theme.primaryDim, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(0,212,200,0.3)', overflow: 'hidden',
  },
  miniAvatarImg: { width: MINI_AVATAR_SIZE, height: MINI_AVATAR_SIZE },
  miniAvatarInitials: { fontSize: 22, fontWeight: '800', color: theme.primary },
  miniName: { fontSize: 14, fontWeight: '800', color: theme.textPrimary, textAlign: 'center' },
  miniCity: { fontSize: 11, color: theme.textMuted, textAlign: 'center' },
  miniScorePill: {
    flexDirection: 'row', alignItems: 'baseline',
    borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  miniScoreValue: { fontSize: 14, fontWeight: '800' },
  miniScoreLabel: { fontSize: 10, color: theme.textMuted, fontWeight: '600' },
  miniActions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  miniActionBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: theme.bgDeep, borderWidth: 1, borderColor: theme.border,
    alignItems: 'center', justifyContent: 'center',
  },
  miniVolleyBtn: { backgroundColor: theme.secondaryDim, borderColor: theme.secondaryBorder },
  miniActionText: { fontSize: 16 },
  miniActioned: { fontSize: 12, color: theme.primary, fontWeight: '700', marginTop: 2 },
  miniAvatarGhost: {
    width: MINI_AVATAR_SIZE, height: MINI_AVATAR_SIZE, borderRadius: MINI_AVATAR_SIZE / 2,
    backgroundColor: theme.bgDeep, borderWidth: 2, borderColor: theme.border,
  },
  miniNameGhost: { width: 70, height: 12, borderRadius: 6, backgroundColor: theme.bgDeep },
  miniScoreGhost: { width: 50, height: 24, borderRadius: 10, backgroundColor: theme.bgDeep },
  miniMetaGhost: { width: 90, height: 28, borderRadius: 10, backgroundColor: theme.bgDeep },

  // ── Section headers ──
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.textPrimary, flex: 1 },
  sectionCountBadge: { backgroundColor: theme.primaryDim, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: theme.primaryBorder },
  sectionCount: { fontSize: 12, fontWeight: '700', color: theme.primary },
  sectionSub: { fontSize: 12, color: theme.textMuted, marginBottom: 14, lineHeight: 18 },

  // ── Empty state ──
  emptyBox: { alignItems: 'center', paddingVertical: 32, gap: 10, backgroundColor: theme.bgCard, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: theme.border },
  emptyEmoji: { fontSize: 36 },
  emptyText: { fontSize: 13, color: theme.textMuted, textAlign: 'center', paddingHorizontal: 24 },

  // ── Player card (feed) ──
  playerCard: {
    backgroundColor: theme.bgCard, borderRadius: 18, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: 'rgba(0,212,200,0.15)',
    ...Platform.select({
      ios: { shadowColor: theme.primary, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  playerCardMuted: { opacity: 0.75 },
  cardBody: { flexDirection: 'row', alignItems: 'stretch', marginBottom: 10, gap: 14 },
  avatar: {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: 14,
    backgroundColor: theme.primaryDim, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(0,212,200,0.3)', overflow: 'hidden', flexShrink: 0,
  },
  avatarMuted: { backgroundColor: theme.bgDeep, borderColor: theme.border },
  avatarImg: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: 14 },
  avatarInitials: { fontSize: 38, fontWeight: '800', color: theme.primary },
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
});
