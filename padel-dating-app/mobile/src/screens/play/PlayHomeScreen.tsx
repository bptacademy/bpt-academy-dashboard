/**
 * PlayHomeScreen
 *
 * 3 sub-tabs:
 *   🤝 Court History  — people you've already played with (was Connect Layer 1 + 2)
 *   🎾 Find a Partner — compatible players for doubles/training
 *   🏟 Open Courts    — coming in v2
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  StatusBar, ActivityIndicator, RefreshControl, Image, Platform, Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, fonts } from '../../lib/theme';
import { usePartners, Partner } from '../../hooks/usePartners';
import { useDiscovery, DiscoveredPlayer } from '../../hooks/useDiscovery';

// ─── Shared helpers ───────────────────────────────────────────────────────────

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

// ─── Court History: player card ───────────────────────────────────────────────

function HistoryCard({ player, navigation, onAction }: {
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
      style={[styles.card, !player.isOnVolpair && { opacity: 0.75 }]}
      onPress={handlePress}
      activeOpacity={player.isOnVolpair ? 0.92 : 1}
    >
      <View style={styles.cardBody}>
        <View style={[styles.cardAvatar, !player.isOnVolpair && { borderColor: theme.border, backgroundColor: theme.bgDeep }]}>
          {player.photos[0]
            ? <Image source={{ uri: player.photos[0] }} style={styles.cardAvatarImg} />
            : <Text style={styles.cardAvatarInitials}>
                {player.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </Text>}
        </View>

        <View style={styles.cardInfo}>
          <View style={styles.cardNameRow}>
            <Text style={styles.cardName}>{firstName}</Text>
            {player.isOnVolpair && (player.lookingFor === 'date' || player.lookingFor === 'both') && (
              <View style={styles.intentBadge}>
                <Text style={styles.intentText}>{player.lookingFor === 'both' ? '💘 Open' : '💘 Dating'}</Text>
              </View>
            )}
          </View>
          {player.city && <View style={{flexDirection:'row',alignItems:'center',gap:3}}><Image source={require('../../../assets/icons/3. Location.png')} style={{width:12,height:12,tintColor:'#7A9CC0'}} /><Text style={styles.cardMeta}>{player.city}</Text></View>}
          {player.levelValue !== null && (
            <View style={styles.levelRow}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelValue}>{player.levelValue.toFixed(1)}</Text>
              </View>
              {player.levelLabel && <Text style={styles.levelLabel}>{player.levelLabel}</Text>}
            </View>
          )}
          {player.lastClubName && <Text style={styles.cardMeta}>🏟 {player.lastClubName}</Text>}
          {player.matchesTogether > 0 && (
            <Text style={styles.cardMeta}>
              🤝 {player.matchesTogether} match{player.matchesTogether > 1 ? 'es' : ''} together
              {player.winRate !== null ? ` · ${player.winRate}% win` : ''}
            </Text>
          )}
          {player.mutualVia && (
            <Text style={styles.cardMeta}>🔗 Via {player.mutualVia}</Text>
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
              {player.myAction === 'play_again' ? '🎾 Play request sent!'
                : player.myAction === 'connect' ? '👋 Connection sent!'
                : '💘 Volley sent!'}
            </Text>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => onAction('play_again')} activeOpacity={0.75}>
              <Text style={styles.actionEmoji}>🎾</Text>
              <Text style={styles.actionText}>Play again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => onAction('connect')} activeOpacity={0.75}>
              <Text style={styles.actionEmoji}>👋</Text>
              <Text style={styles.actionText}>Connect</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.volleyBtn]} onPress={() => onAction('volley')} activeOpacity={0.75}>
              <Text style={styles.actionEmoji}>💘</Text>
              <Text style={[styles.actionText, styles.volleyText]}>Volley</Text>
            </TouchableOpacity>
          </View>
        )
      ) : (
        <InviteRow playerName={player.fullName} />
      )}
    </TouchableOpacity>
  );
}

function InviteRow({ playerName }: { playerName: string }) {
  const [invited, setInvited] = useState(false);
  const handleInvite = async () => {
    try {
      await Share.share({ message: `Hey ${playerName.split(' ')[0]}! Join me on Volpair — the app for padel players 🎾\n\nDownload: volpair.app` });
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

// ─── Court History tab ────────────────────────────────────────────────────────

function CourtHistoryTab({ navigation }: { navigation: any }) {
  const { layer1, layer2, loading, error, reload, sendAction } = useDiscovery();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => { setRefreshing(true); await reload(); setRefreshing(false); };

  const handleAction = async (player: DiscoveredPlayer, type: 'play_again' | 'connect' | 'volley') => {
    if (!player.userId) return;
    try { await sendAction(player.userId, type); } catch (e) { console.error('sendAction error:', e); }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Loading your court history…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingBox}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={reload}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>🎾 Played with</Text>
        {layer1.length > 0 && (
          <View style={styles.countBadge}><Text style={styles.countText}>{layer1.length}</Text></View>
        )}
      </View>
      <Text style={styles.sectionSub}>Players you've shared a court with</Text>

      {layer1.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>🎾</Text>
          <Text style={styles.emptyText}>Sync your Playtomic account to see your court history</Text>
        </View>
      ) : (
        layer1.map(p => (
          <HistoryCard key={p.platformUserId} player={p} navigation={navigation} onAction={type => handleAction(p, type)} />
        ))
      )}

      {layer2.length > 0 && (
        <>
          <View style={[styles.sectionHeader, { marginTop: 8 }]}>
            <Text style={styles.sectionTitle}>🔗 Friends of your court</Text>
            <View style={styles.countBadge}><Text style={styles.countText}>{layer2.length}</Text></View>
          </View>
          <Text style={styles.sectionSub}>In your padel circle — one degree away</Text>
          {layer2.map(p => (
            <HistoryCard key={p.platformUserId} player={p} navigation={navigation} onAction={type => handleAction(p, type)} />
          ))}
        </>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

// ─── Find a Partner tab ───────────────────────────────────────────────────────

function PartnerCard({ partner, navigation, onServe }: {
  partner: Partner;
  navigation: any;
  onServe: () => void;
}) {
  const firstName = partner.fullName.split(' ')[0];
  const scoreColor = partner.volpairScore >= 85 ? theme.primary
    : partner.volpairScore >= 70 ? '#F59E0B'
    : theme.textMuted;

  const availabilityText = (() => {
    const days = partner.preferredDays ?? [];
    if (days.length === 0) return 'Flexible';
    const map: Record<string, string> = {
      monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
      thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
    };
    const short = days.map(d => map[d.toLowerCase()] ?? d);
    if (short.length <= 2) return short.join(' & ');
    const hasWeekend = days.some(d => ['saturday', 'sunday'].includes(d.toLowerCase()));
    const hasWeekday = days.some(d => !['saturday', 'sunday'].includes(d.toLowerCase()));
    if (hasWeekend && hasWeekday) return 'Weekdays + weekends';
    if (hasWeekend) return 'Weekends';
    return 'Weekday evenings';
  })();

  const photoUrl = partner.photos?.[0];

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('PlayerProfile', { userId: partner.userId })}
      activeOpacity={0.92}
    >
      <View style={styles.partnerCardHeader}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.partnerAvatar} />
        ) : (
          <View style={[styles.partnerAvatar, styles.partnerAvatarFallback]}>
            <Text style={styles.partnerAvatarInitials}>
              {partner.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.partnerInfo}>
          <Text style={styles.cardName}>{firstName}</Text>
          <Text style={styles.cardMeta}>
            {partner.city ? `📍 ${partner.city}` : ''}
            {partner.city && partner.topClub ? ' · ' : ''}
            {partner.topClub ?? ''}
          </Text>
          <View style={styles.levelRow}>
            {partner.levelValue !== null && (
              <>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelValue}>{partner.levelValue.toFixed(1)}</Text>
                </View>
                {partner.levelLabel && <Text style={styles.levelLabel}>{partner.levelLabel}</Text>}
              </>
            )}
            {partner.playStyle && (
              <Text style={styles.cardMeta}> · {partner.playStyle}</Text>
            )}
          </View>
        </View>
        <View style={[styles.scoreBadge, { borderColor: scoreColor }]}>
          <Text style={[styles.scoreValue, { color: scoreColor }]}>{partner.volpairScore}</Text>
          <Text style={[styles.scoreLabel, { color: scoreColor }]}>match</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Image source={require('../../../assets/icons/14. Calendar.png')} style={styles.statIconImg} />
          <Text style={styles.statText}>{availabilityText}</Text>
        </View>
        {partner.winRate !== null && (
          <View style={styles.statItem}>
            <Image source={require('../../../assets/icons/13. Trophy.png')} style={styles.statIconImg} />
            <Text style={styles.statText}>{partner.winRate}% win rate</Text>
          </View>
        )}
      </View>

      {partner.myAction ? (
        <View style={styles.actionedRow}>
          <Text style={styles.actionedText}>🎾 Play request sent!</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.serveBtn}
          onPress={e => { e.stopPropagation?.(); onServe(); }}
          activeOpacity={0.8}
        >
          <Text style={styles.serveBtnText}>🎾 Send a Serve</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

function FindPartnerTab({ navigation }: { navigation: any }) {
  const { partners, loading, error, reload, sendServe } = usePartners();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => { setRefreshing(true); await reload(); setRefreshing(false); };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Finding compatible players…</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.loadingBox}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={reload}><Text style={styles.retryText}>Try again</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
    >
      {partners.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>🎾</Text>
          <Text style={styles.emptyText}>No compatible players found yet.{'\n'}Sync your Playtomic account to get matched.</Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionSub}>Compatible players sorted by your Volpair score</Text>
          {partners.map(p => (
            <PartnerCard
              key={p.userId}
              partner={p}
              navigation={navigation}
              onServe={async () => {
                try { await sendServe(p.userId); } catch (e) { console.error(e); }
              }}
            />
          ))}
        </>
      )}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

type PlayTab = 'history' | 'partner' | 'courts';

export default function PlayHomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<PlayTab>('history');

  const TABS: { id: PlayTab; label: string }[] = [
    { id: 'history', label: '🤝 Court History' },
    { id: 'partner', label: '🎾 Find a Partner' },
    { id: 'courts', label: '🏟 Open Courts' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

      {/* Compact header + tabs in one block — no stranded gap */}
      <View style={styles.headerBlock}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Play</Text>
          <Text style={styles.headerSub}>Your court world</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
        >
          {TABS.map(t => (
            <TouchableOpacity
              key={t.id}
              style={[styles.subTab, tab === t.id && styles.subTabActive]}
              onPress={() => setTab(t.id)}
              activeOpacity={0.75}
            >
              <Text style={[styles.subTabText, tab === t.id && styles.subTabTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {tab === 'history' && <CourtHistoryTab navigation={navigation} />}
      {tab === 'partner' && <FindPartnerTab navigation={navigation} />}
      {tab === 'courts' && (
        <View style={styles.comingSoonBox}>
          <Text style={styles.comingSoonEmoji}>🏟</Text>
          <Text style={styles.comingSoonTitle}>Open Courts</Text>
          <Text style={styles.comingSoonText}>Live games near you needing players. Coming in v2.</Text>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const AVATAR_SIZE = 110;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },

  // Header + tabs unified — no gap between them
  headerBlock: {
    borderBottomWidth: 1, borderBottomColor: theme.bgCard,
  },
  headerRow: {
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10,
    flexDirection: 'row', alignItems: 'baseline', gap: 10,
  },
  headerTitle: { fontSize: 26, fontFamily: fonts.headlineBold, color: theme.textPrimary },
  headerSub: { fontSize: 12, color: theme.textMuted, fontFamily: fonts.bodyLight },
  tabRow: { paddingHorizontal: 16, paddingBottom: 12, paddingTop: 2, gap: 8 },
  subTab: {
    paddingVertical: 9, paddingHorizontal: 14, borderRadius: 12,
    backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.border,
  },
  subTabActive: { backgroundColor: theme.primaryDim, borderColor: theme.primaryBorder },
  subTabText: { fontSize: 13, fontFamily: fonts.bodyBold, color: theme.textMuted },
  subTabTextActive: { color: theme.primary },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { fontSize: 14, color: theme.textMuted, fontFamily: fonts.bodyLight },
  errorText: { fontSize: 14, color: '#EF4444', textAlign: 'center', fontFamily: fonts.bodyLight },
  retryBtn: { backgroundColor: theme.primaryDim, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: theme.primaryBorder },
  retryText: { color: theme.primary, fontFamily: fonts.bodyBold },

  scroll: { paddingHorizontal: 16, paddingTop: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontFamily: fonts.bodyBold, color: theme.textPrimary, flex: 1 },
  countBadge: { backgroundColor: theme.primaryDim, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: theme.primaryBorder },
  countText: { fontSize: 12, fontFamily: fonts.bodyBold, color: theme.primary },
  sectionSub: { fontSize: 12, color: theme.textMuted, marginBottom: 14, lineHeight: 18, fontFamily: fonts.bodyLight },
  emptyBox: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 14, color: theme.textMuted, textAlign: 'center', lineHeight: 22, paddingHorizontal: 32, fontFamily: fonts.bodyLight },

  // ── Shared card ──
  card: {
    backgroundColor: theme.bgCard, borderRadius: 18, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: theme.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  cardBody: { flexDirection: 'row', gap: 14, marginBottom: 12 },
  cardAvatar: {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: 14,
    backgroundColor: theme.primaryDim, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(0,212,200,0.3)', overflow: 'hidden', flexShrink: 0,
  },
  cardAvatarImg: { width: AVATAR_SIZE, height: AVATAR_SIZE },
  cardAvatarInitials: { fontSize: 34, fontFamily: fonts.headlineBold, color: theme.primary },
  cardInfo: { flex: 1, gap: 4 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  cardName: { fontSize: 17, fontFamily: fonts.headlineBold, color: theme.textPrimary },
  intentBadge: { backgroundColor: theme.secondaryDim, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: theme.secondaryBorder },
  intentText: { fontSize: 11, color: '#A78BFA', fontFamily: fonts.bodyBold },
  cardMeta: { fontSize: 12, color: theme.textSecondary, lineHeight: 18, fontFamily: fonts.bodyLight },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  levelBadge: { backgroundColor: theme.primaryDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: theme.primaryBorder },
  levelValue: { fontSize: 13, fontFamily: fonts.headlineLightIt, color: theme.primary },
  levelLabel: { fontSize: 12, color: theme.textMuted, fontFamily: fonts.bodyLight },
  scoreBadge: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  scoreValue: { fontSize: 16, fontFamily: fonts.headlineLightIt, lineHeight: 18 },
  scoreLabel: { fontSize: 9, fontFamily: fonts.bodyBold, lineHeight: 11 },
  actionRow: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 12, backgroundColor: theme.bgDeep, borderWidth: 1, borderColor: theme.border },
  volleyBtn: { backgroundColor: theme.secondaryDim, borderColor: theme.secondaryBorder },
  actionEmoji: { fontSize: 14 },
  actionText: { fontSize: 12, fontFamily: fonts.bodyBold, color: theme.textSecondary },
  volleyText: { color: '#A78BFA' },
  actionedRow: { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12, alignItems: 'center' },
  actionedText: { fontSize: 13, color: theme.primary, fontFamily: fonts.bodyBold },
  inviteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border },
  inviteText: { fontSize: 12, color: theme.textMuted, fontFamily: fonts.bodyLight },
  inviteBtn: { backgroundColor: theme.primaryDim, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: theme.primaryBorder },
  inviteBtnText: { color: theme.primary, fontSize: 13, fontFamily: fonts.bodyBold },
  invitedText: { fontSize: 13, color: theme.primary, fontFamily: fonts.bodyBold },

  // ── Partner card ──
  partnerCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  partnerAvatar: { width: 52, height: 52, borderRadius: 26 },
  partnerAvatarFallback: { backgroundColor: theme.primaryDim, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: theme.primaryBorder },
  partnerAvatarInitials: { fontSize: 18, fontFamily: fonts.headlineBold, color: theme.primary },
  partnerInfo: { flex: 1 },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  statIcon: { fontSize: 13 },
  statText: { fontSize: 12, color: theme.textSecondary, flex: 1, fontFamily: fonts.bodyLight },
  serveBtn: { backgroundColor: theme.primaryDim, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.primaryBorder },
  serveBtnText: { color: theme.primary, fontSize: 14, fontFamily: fonts.bodyBold },

  comingSoonBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  comingSoonEmoji: { fontSize: 56, marginBottom: 16 },
  comingSoonTitle: { fontSize: 22, fontFamily: fonts.headlineBold, color: theme.textPrimary, marginBottom: 8 },
  comingSoonText: { fontSize: 14, color: theme.textMuted, textAlign: 'center', lineHeight: 22, fontFamily: fonts.bodyLight },
});
