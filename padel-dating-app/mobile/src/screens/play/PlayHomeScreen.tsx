import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../lib/theme';
import { usePartners, Partner } from '../../hooks/usePartners';

// ─── Partner card ─────────────────────────────────────────────────────────────

function PartnerCard({ partner, onServe }: { partner: Partner; onServe: () => void }) {
  const firstName = partner.fullName.split(' ')[0];
  const scoreColor =
    partner.volpairScore >= 85 ? theme.primary :
    partner.volpairScore >= 70 ? '#F59E0B' :
    theme.textMuted;

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

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitials}>
            {partner.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.playerName}>{firstName}</Text>
          <Text style={styles.playerCity}>
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
                {partner.levelLabel && (
                  <Text style={styles.levelLabel}>{partner.levelLabel}</Text>
                )}
              </>
            )}
            {partner.playStyle && (
              <>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.playStyle}>{partner.playStyle}</Text>
              </>
            )}
          </View>
        </View>

        {/* Score badge */}
        <View style={[styles.scoreBadge, { borderColor: scoreColor }]}>
          <Text style={[styles.scoreVal, { color: scoreColor }]}>{partner.volpairScore}</Text>
          <Text style={[styles.scoreLbl, { color: scoreColor }]}>match</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>📅</Text>
          <Text style={styles.statText}>{availabilityText}</Text>
        </View>
        {partner.winRate !== null && (
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>🏆</Text>
            <Text style={styles.statText}>{partner.winRate}% win rate</Text>
          </View>
        )}
      </View>

      {partner.myAction ? (
        <View style={styles.sentRow}>
          <Text style={styles.sentText}>🎾 Play request sent!</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.playBtn} onPress={onServe} activeOpacity={0.8}>
          <Text style={styles.playBtnText}>🎾 Send a Serve</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PlayHomeScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'partner' | 'courts'>('partner');
  const { partners, loading, error, reload, sendServe } = usePartners();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const handleServe = async (partner: Partner) => {
    try {
      await sendServe(partner.userId);
    } catch (e) {
      console.error('sendServe error:', e);
    }
  };

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
        loading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.loadingText}>Finding compatible players…</Text>
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
            {partners.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>🎾</Text>
                <Text style={styles.emptyText}>
                  No compatible players found yet.{'\n'}
                  Sync your Playtomic account to get matched.
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.sectionSub}>
                  Compatible players sorted by your Volpair score
                </Text>
                {partners.map(p => (
                  <PartnerCard
                    key={p.userId}
                    partner={p}
                    onServe={() => handleServe(p)}
                  />
                ))}
              </>
            )}
            <View style={{ height: 24 }} />
          </ScrollView>
        )
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

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  subTabActive: { backgroundColor: theme.primaryDim, borderColor: theme.primaryBorder },
  subTabText: { fontSize: 13, fontWeight: '600', color: theme.textMuted },
  subTabTextActive: { color: theme.primary },

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

  scroll: { paddingHorizontal: 16, paddingTop: 4 },
  sectionSub: { fontSize: 12, color: theme.textMuted, marginBottom: 14, lineHeight: 18 },

  emptyBox: {
    alignItems: 'center', paddingVertical: 48, gap: 12,
  },
  emptyEmoji: { fontSize: 48 },
  emptyText: {
    fontSize: 14, color: theme.textMuted, textAlign: 'center',
    lineHeight: 22, paddingHorizontal: 32,
  },

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
  avatarInitials: { fontSize: 18, fontWeight: '800', color: theme.primary },
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
