/**
 * ConnectHomeScreen — pure discovery
 *
 * Shows compatible strangers you've NEVER played with,
 * sorted by Volpair compatibility score.
 * People you've already played with live in the Play tab → Court History.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  StatusBar, ActivityIndicator, RefreshControl, Image, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { theme, fonts } from '../../lib/theme';
import { useCourtPicks, CourtPick } from '../../hooks/useCourtPicks';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { DiscoveryLoaderC } from '../../components/DiscoveryLoader';
import { ScreenBackground } from '../../components/ScreenBackground';

// ─── Full discovery card ──────────────────────────────────────────────────────

function DiscoveryCard({ pick, navigation, onAction }: {
  pick: CourtPick;
  navigation: any;
  onAction: (type: 'connect' | 'volley') => void;
}) {
  const [myAction, setMyAction] = useState<string | null>(null);
  const firstName = pick.full_name.split(' ')[0];
  const initials = pick.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const scoreColor = pick.volpair_score && pick.volpair_score >= 85 ? theme.scoreHigh
    : pick.volpair_score && pick.volpair_score >= 70 ? theme.scoreMid
    : theme.scoreLow;

  const handleAction = (type: 'connect' | 'volley') => {
    setMyAction(type);
    onAction(type);
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('PlayerProfile', { userId: pick.id })}
      activeOpacity={0.92}
    >
      <View style={styles.cardBody}>
        <View style={styles.cardAvatar}>
          {pick.photo_url
            ? <Image source={{ uri: pick.photo_url }} style={styles.cardAvatarImg} resizeMode="cover" />
            : <Text style={styles.cardAvatarInitials}>{initials}</Text>}
        </View>

        <View style={styles.cardInfo}>
          <View style={styles.cardNameRow}>
            <Text style={styles.cardName}>{firstName}</Text>
            {(pick.looking_for === 'date' || pick.looking_for === 'both') && (
              <View style={styles.intentBadge}>
                <Text style={styles.intentText}>
                  {pick.looking_for === 'both' ? '💘 Open' : '💘 Dating'}
                </Text>
              </View>
            )}
          </View>

          {pick.city && <Text style={styles.cardMeta}>📍 {pick.city}</Text>}

          {pick.level_value !== null && (
            <View style={styles.levelRow}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelValue}>{pick.level_value.toFixed(1)}</Text>
              </View>
              <Text style={styles.levelLabel}>
                {pick.level_value >= 5.5 ? 'Elite'
                  : pick.level_value >= 4.5 ? 'Advanced'
                  : pick.level_value >= 3.5 ? 'Competitive'
                  : pick.level_value >= 2.5 ? 'Intermediate'
                  : 'Beginner'}
              </Text>
            </View>
          )}

          <Text style={styles.cardMeta}>
            📍 {pick.distance_miles.toFixed(1)} mi away
            {pick.total_matches ? ` · ${pick.total_matches} matches played` : ''}
          </Text>

          <View style={[styles.scoreBadge, { borderColor: scoreColor, marginTop: 6 }]}>
            <Text style={[styles.scoreValue, { color: scoreColor }]}>{pick.volpair_score ?? '—'}</Text>
            <Text style={[styles.scoreLabel, { color: scoreColor }]}>match</Text>
          </View>
        </View>
      </View>

      {myAction ? (
        <View style={styles.actionedRow}>
          <Text style={styles.actionedText}>
            {myAction === 'volley' ? '💘 Volley sent — fingers crossed!' : '👋 Connection sent!'}
          </Text>
        </View>
      ) : (
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction('connect')} activeOpacity={0.75}>
            <Text style={styles.actionEmoji}>👋</Text>
            <Text style={styles.actionText}>Connect</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.volleyBtn]} onPress={() => handleAction('volley')} activeOpacity={0.75}>
            <Text style={styles.actionEmoji}>💘</Text>
            <Text style={[styles.actionText, styles.volleyText]}>Volley</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Teaser / locked state ────────────────────────────────────────────────────

function DiscoveryLocked({ onEnable, locationDenied }: { onEnable: () => void; locationDenied: boolean }) {
  const ghosts = [0, 1, 2];
  return (
    <View style={styles.lockedWrapper}>
      {ghosts.map(i => (
        <View key={i} style={[styles.card, styles.ghostCard]}>
          <View style={styles.cardBody}>
            <View style={styles.ghostAvatar} />
            <View style={styles.ghostInfo}>
              <View style={styles.ghostLine} />
              <View style={[styles.ghostLine, { width: '60%' }]} />
              <View style={[styles.ghostLine, { width: '40%' }]} />
              <View style={styles.ghostScore} />
            </View>
          </View>
          <View style={styles.ghostActions} />
        </View>
      ))}

      <View style={styles.lockedOverlay}>
        <View style={styles.lockedCta}>
          <Text style={styles.lockedIcon}>🎯</Text>
          <Text style={styles.lockedTitle}>
            {locationDenied ? 'Location needed' : 'Discover your matches'}
          </Text>
          <Text style={styles.lockedSub}>
            {locationDenied
              ? 'Allow location access to see compatible players near you'
              : 'Find compatible padel players near you, sorted by your Volpair score'}
          </Text>
          <TouchableOpacity style={styles.lockedBtn} onPress={onEnable} activeOpacity={0.85}>
            <Text style={styles.lockedBtnText}>
              {locationDenied ? 'Allow location' : '🎯 Start discovering'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ConnectHomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const tabBarPadding = useTabBarPadding();
  const { user } = useAuth();
  const [myStats, setMyStats] = useState<{ level_value: number | null } | null>(null);

  useEffect(() => {
    if (user?.id) {
      supabase.from('player_stats').select('level_value').eq('user_id', user.id).maybeSingle()
        .then(({ data }) => setMyStats(data));
    }
  }, [user?.id]);

  const { picks, loading, locationDenied, enabled, setEnabled } = useCourtPicks({
    excludeIds: [],
    myLevel: myStats?.level_value ?? null,
    myLookingFor: (user as any)?.looking_for ?? null,
  });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

  const handleAction = async (pick: CourtPick, type: 'connect' | 'volley') => {
    if (!user?.id) return;
    try {
      await supabase.from('connections').insert({
        sender_id: user.id,
        receiver_id: pick.id,
        action_type: type === 'volley' ? 'volley' : 'connect',
      });
    } catch (e) { console.error('connect action error:', e); }
  };

  return (
    <ScreenBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
      

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Connect</Text>
          <Text style={styles.headerSub}>Discover compatible players near you</Text>
        </View>
        <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Notifications')}>
          <Image source={require('../../../assets/icons/Notifications.png')} style={styles.notifIconImg} />
        </TouchableOpacity>
      </View>

      {/* ── Not yet enabled — locked teaser ── */}
      {!enabled ? (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPadding }]}>
          <DiscoveryLocked onEnable={() => setEnabled(true)} locationDenied={locationDenied} />
        </ScrollView>

      /* ── First load — Variant C score reveal (~3s) ── */
      ) : loading && !refreshing ? (
        <DiscoveryLoaderC />

      /* ── Results ── */
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPadding }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🎯 Your top picks</Text>
            {picks.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{picks.length}</Text>
              </View>
            )}
          </View>
          <Text style={styles.sectionSub}>
            Players you've never met — sorted by compatibility, not just distance
          </Text>

          {picks.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🎾</Text>
              <Text style={styles.emptyText}>
                No picks yet in your area.{'\n'}Check back after more players join Volpair nearby.
              </Text>
              <TouchableOpacity
                style={styles.demoBtn}
                onPress={() => navigation.navigate('PlayerProfile', { userId: 'demo' })}
                activeOpacity={0.85}
              >
                <Text style={styles.demoBtnText}>✨ Preview a sample profile</Text>
              </TouchableOpacity>
            </View>
          ) : (
            picks.map(pick => (
              <DiscoveryCard
                key={pick.id}
                pick={pick}
                navigation={navigation}
                onAction={type => handleAction(pick, type)}
              />
            ))
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
    </ScreenBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const AVATAR_SIZE = 110;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: theme.bgCard,
  },
  headerTitle: { fontSize: 26, fontFamily: fonts.headlineBold, color: theme.textPrimary },
  headerSub: { fontSize: 12, color: theme.textMuted, marginTop: 2, fontFamily: fonts.bodyLight },
  notifBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.bgCard, alignItems: 'center', justifyContent: 'center' },
  notifIcon: { fontSize: 18 },
  notifIconImg: { width: 33, height: 33, tintColor: '#7A9CC0' },
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontFamily: fonts.bodyBold, color: theme.textPrimary, flex: 1 },
  countBadge: { backgroundColor: theme.primaryDim, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: theme.primaryBorder },
  countText: { fontSize: 12, fontFamily: fonts.bodyBold, color: theme.primary },
  sectionSub: { fontSize: 12, color: theme.textMuted, marginBottom: 16, lineHeight: 18, fontFamily: fonts.bodyLight },
  emptyBox: { alignItems: 'center', paddingVertical: 48, gap: 16 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 14, color: theme.textMuted, textAlign: 'center', lineHeight: 22, paddingHorizontal: 32, fontFamily: fonts.bodyLight },
  demoBtn: {
    backgroundColor: theme.primaryDim,
    borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12,
    borderWidth: 1, borderColor: theme.primaryBorder,
    marginTop: 4,
  },
  demoBtnText: { fontSize: 14, fontFamily: fonts.bodyBold, color: theme.primary },

  card: {
    backgroundColor: theme.bgCard, borderRadius: 18, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: 'rgba(0,212,200,0.15)',
    ...Platform.select({
      ios: { shadowColor: theme.primary, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 6 },
      android: { elevation: 3 },
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
  cardInfo: { flex: 1, justifyContent: 'flex-start', gap: 4 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  cardName: { fontSize: 18, fontFamily: fonts.headlineBold, color: theme.textPrimary },
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
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 12, backgroundColor: theme.bgDeep, borderWidth: 1, borderColor: theme.border },
  volleyBtn: { backgroundColor: theme.secondaryDim, borderColor: theme.secondaryBorder },
  actionEmoji: { fontSize: 15 },
  actionText: { fontSize: 13, fontFamily: fonts.bodyBold, color: theme.textSecondary },
  volleyText: { color: '#A78BFA' },
  actionedRow: { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12, alignItems: 'center' },
  actionedText: { fontSize: 13, color: theme.primary, fontFamily: fonts.bodyBold },

  lockedWrapper: { position: 'relative', minHeight: 520 },
  ghostCard: { opacity: 0.35, marginBottom: 12 },
  ghostAvatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: 14, backgroundColor: theme.bgDeep, flexShrink: 0 },
  ghostInfo: { flex: 1, gap: 10, paddingTop: 4 },
  ghostLine: { height: 12, borderRadius: 6, backgroundColor: theme.bgDeep, width: '80%' },
  ghostScore: { width: 50, height: 50, borderRadius: 25, backgroundColor: theme.bgDeep, marginTop: 4 },
  ghostActions: { height: 44, borderRadius: 12, backgroundColor: theme.bgDeep, marginTop: 12 },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13,27,42,0.88)',
    borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24,
  },
  lockedCta: { alignItems: 'center', gap: 10 },
  lockedIcon: { fontSize: 48, marginBottom: 4 },
  lockedTitle: { fontSize: 22, fontFamily: fonts.headlineBold, color: theme.textPrimary, textAlign: 'center' },
  lockedSub: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', lineHeight: 22, fontFamily: fonts.bodyLight },
  lockedBtn: {
    marginTop: 8, backgroundColor: theme.primary,
    borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14,
  },
  lockedBtnText: { color: theme.bg, fontSize: 16, fontFamily: fonts.headlineBold },
});
