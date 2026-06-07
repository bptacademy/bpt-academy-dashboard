import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar,
  ActivityIndicator, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, fonts } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { notifyVolley } from '../../lib/notifications';
import { ScreenBackground } from '../../components/ScreenBackground';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CoPlayer {
  userId: string | null;
  platformUserId: string;
  platformName: string | null;
  levelValue: number | null;
  isOnVolpair: boolean;
  alreadyActioned: boolean;
  photo_url: string | null;
}

interface MatchGroup {
  matchId: string;
  clubName: string | null;
  playedAt: string | null;
  players: CoPlayer[];
}

type ResponseType = 'yes' | 'maybe' | 'no';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(isoDate: string | null): string {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

// ─── Player card ─────────────────────────────────────────────────────────────

function PlayerCard({
  player,
  response,
  onResponse,
  onInvite,
}: {
  player: CoPlayer;
  response: ResponseType | undefined;
  onResponse: (r: ResponseType) => void;
  onInvite: () => void;
}) {
  const displayName = player.platformName ?? `Player ${player.platformUserId}`;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        {player.photo_url ? (
          <Image source={{ uri: player.photo_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitials}>{getInitials(displayName)}</Text>
          </View>
        )}

        <View style={styles.cardInfo}>
          <Text style={styles.playerName}>{displayName}</Text>
          <View style={styles.badgeRow}>
            {player.levelValue !== null && (
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>{player.levelValue.toFixed(1)}</Text>
              </View>
            )}
            {player.isOnVolpair ? (
              <View style={styles.volpairBadge}>
                <Text style={styles.volpairBadgeText}>On Volpair</Text>
              </View>
            ) : (
              <Text style={styles.notOnVolpairText}>Not on Volpair yet</Text>
            )}
          </View>
        </View>
      </View>

      {!player.isOnVolpair && (
        <TouchableOpacity style={styles.inviteBtn} onPress={onInvite} activeOpacity={0.8}>
          <Text style={styles.inviteBtnText}>📨 Invite to Volpair</Text>
        </TouchableOpacity>
      )}

      {player.alreadyActioned ? (
        <View style={styles.alreadyActionedRow}>
          <Text style={styles.alreadyActionedText}>✓ Already connected</Text>
        </View>
      ) : (
        <View style={styles.btnRow}>
          {(['yes', 'maybe', 'no'] as ResponseType[]).map(option => (
            <TouchableOpacity
              key={option}
              style={[
                styles.responseBtn,
                response === option && styles.responseBtnSelected,
                response === option && option === 'yes' && styles.responseBtnYes,
                response === option && option === 'maybe' && styles.responseBtnMaybe,
                response === option && option === 'no' && styles.responseBtnNo,
              ]}
              onPress={() => onResponse(option)}
              activeOpacity={0.75}
            >
              <Text style={[
                styles.responseBtnText,
                response === option && styles.responseBtnTextSelected,
              ]}>
                {option === 'yes' ? '✓ Yes' : option === 'maybe' ? '~ Maybe' : '✕ Not really'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PostMatchPromptScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [matchGroups, setMatchGroups] = useState<MatchGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<Record<string, ResponseType>>({});
  const [saving, setSaving] = useState<Set<string>>(new Set());

  // Fetch from edge function
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('post-match-prompt', { body: {} });
      if (error) throw error;
      setMatchGroups(data?.matches ?? []);
    } catch (e) {
      console.error('post-match-prompt fetch error:', e);
      setMatchGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPlayers = matchGroups.reduce((sum, g) => sum + g.players.length, 0);

  const handleResponse = async (playerId: string, player: CoPlayer, r: ResponseType) => {
    setResponses(prev => ({ ...prev, [playerId]: r }));

    // Only act if Yes/Maybe and player is on Volpair
    if ((r === 'yes' || r === 'maybe') && player.isOnVolpair && player.userId && user) {
      if (saving.has(playerId)) return;
      setSaving(prev => new Set(prev).add(playerId));

      try {
        // Insert connection
        await supabase.from('connections').insert({
          sender_id: user.id,
          receiver_id: player.userId,
          action_type: 'connect',
          status: 'pending',
        });

        // Send notification (best-effort)
        const { data: myProfile } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();

        await notifyVolley(player.userId, myProfile?.full_name ?? 'Someone');
      } catch (e) {
        console.error('connection insert error:', e);
      } finally {
        setSaving(prev => {
          const next = new Set(prev);
          next.delete(playerId);
          return next;
        });
      }
    }
  };

  const handleInvite = (player: CoPlayer) => {
    // Future: deep link / share invite
    console.log('Invite:', player.platformUserId);
  };

  const handleDone = () => navigation.goBack();

  if (loading) {
    return (
      <ScreenBackground>
        <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Checking recent matches…</Text>
      </View>
    );
  }

  if (matchGroups.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        
        <Text style={styles.emptyEmoji}>🎾</Text>
        <Text style={styles.emptyTitle}>No recent matches to review</Text>
        <Text style={styles.emptyBody}>
          Check back after your next match at the club.
        </Text>
        <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      

      <View style={styles.header}>
        <Text style={styles.title}>
          You played with {totalPlayers} {totalPlayers === 1 ? 'person' : 'people'} recently.
        </Text>
        <Text style={styles.subtitle}>Want to connect with any of them?</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {matchGroups.map(group => (
          <View key={group.matchId}>
            {/* Section header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {group.clubName ? `🏟 ${group.clubName}` : '🏟 Match'}
              </Text>
              {group.playedAt && (
                <Text style={styles.sectionDate}>{formatDate(group.playedAt)}</Text>
              )}
            </View>

            {group.players.map(player => {
              const playerId = player.userId ?? player.platformUserId;
              return (
                <PlayerCard
                  key={playerId}
                  player={player}
                  response={responses[playerId]}
                  onResponse={(r) => handleResponse(playerId, player, r)}
                  onInvite={() => handleInvite(player)}
                />
              );
            })}
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottom}>
        <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDone}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
    </ScreenBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', paddingHorizontal: 20 },
  centered: { alignItems: 'center', justifyContent: 'center' },

  loadingText: { marginTop: 14, fontSize: 14, color: theme.textMuted, fontFamily: fonts.bodyLight },

  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontFamily: fonts.headlineBold, color: theme.textPrimary, marginBottom: 8 },
  emptyBody: { fontSize: 14, color: theme.textMuted, textAlign: 'center', lineHeight: 22, paddingHorizontal: 24, marginBottom: 32, fontFamily: fonts.bodyLight },

  header: { paddingTop: 24, paddingBottom: 16 },
  title: { fontSize: 22, fontFamily: fonts.headlineBold, color: theme.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 15, color: theme.textMuted, fontFamily: fonts.bodyLight },

  scroll: { gap: 4, paddingBottom: 20 },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 2,
  },
  sectionTitle: { fontSize: 14, fontFamily: fonts.bodyBold, color: theme.textSecondary },
  sectionDate: { fontSize: 12, color: theme.textMuted, fontFamily: fonts.bodyLight },

  card: {
    backgroundColor: theme.bgCard, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: theme.border, marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: {
    backgroundColor: theme.primaryDim, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: theme.primaryBorder,
  },
  avatarInitials: { fontSize: 18, fontFamily: fonts.headlineBold, color: theme.primary },
  cardInfo: { flex: 1 },
  playerName: { fontSize: 17, fontFamily: fonts.bodyBold, color: theme.textPrimary, marginBottom: 6 },

  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  levelBadge: {
    backgroundColor: theme.primaryDim, borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1, borderColor: theme.primaryBorder,
  },
  levelBadgeText: { fontSize: 11, fontFamily: fonts.headlineLightIt, color: theme.primary },
  volpairBadge: {
    backgroundColor: theme.primaryDim, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: theme.primaryBorder,
  },
  volpairBadgeText: { fontSize: 11, fontFamily: fonts.bodyBold, color: theme.primary },
  notOnVolpairText: { fontSize: 11, color: theme.textMuted, fontFamily: fonts.bodyLight },

  inviteBtn: {
    backgroundColor: theme.bgDeep, borderRadius: 10, padding: 10,
    alignItems: 'center', borderWidth: 1, borderColor: theme.border, marginBottom: 10,
  },
  inviteBtnText: { fontSize: 13, fontFamily: fonts.bodyBold, color: theme.textSecondary },

  alreadyActionedRow: { alignItems: 'center', paddingVertical: 10 },
  alreadyActionedText: { fontSize: 13, color: theme.primary, fontFamily: fonts.bodyBold },

  btnRow: { flexDirection: 'row', gap: 8 },
  responseBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
    backgroundColor: theme.bgDeep, borderWidth: 1, borderColor: theme.border,
  },
  responseBtnSelected: { borderWidth: 1.5 },
  responseBtnYes: { backgroundColor: theme.primaryDim, borderColor: theme.primaryBorder },
  responseBtnMaybe: { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)' },
  responseBtnNo: { backgroundColor: 'rgba(107,114,128,0.1)', borderColor: 'rgba(107,114,128,0.3)' },
  responseBtnText: { fontSize: 12, fontFamily: fonts.bodyBold, color: theme.textMuted },
  responseBtnTextSelected: { color: theme.textPrimary },

  bottom: { paddingBottom: 12, gap: 10 },
  doneBtn: {
    backgroundColor: theme.primary, borderRadius: 16, padding: 18, alignItems: 'center',
    shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  doneBtnDisabled: { opacity: 0.4 },
  doneBtnText: { color: theme.bg, fontSize: 17, fontFamily: fonts.headlineBold },
  skipText: { color: theme.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 4, fontFamily: fonts.bodyLight },
});
