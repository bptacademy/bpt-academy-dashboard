import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image, Dimensions} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Division, DIVISION_LABELS, DIVISION_COLORS } from '../../types';
import ScreenHeader from '../../components/common/ScreenHeader';

// ─── Types ────────────────────────────────────────────────────

interface RankedStudent {
  student_id: string;
  full_name: string;
  avatar_url: string | null;
  total_points: number;
  division: Division;
  rank: number;
}

interface BPTQualifier {
  student_id: string;
  full_name: string;
  avatar_url: string | null;
  division: Division;
  tournament_points: number;
  top_result: string;
  qualified: boolean;
}

type MainTab = 'rankings' | 'bpt';
const DIVISIONS: Division[] = ['amateur', 'semi_pro', 'pro', 'junior_9_11', 'junior_12_15', 'junior_15_18'];

// ─── Helpers ──────────────────────────────────────────────────

function rankMedal(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

function resultLabel(reason: string): string {
  if (reason.includes('win') || reason.includes('first')) return '🥇 1st Place';
  if (reason.includes('runner') || reason.includes('second')) return '🥈 2nd Place';
  if (reason.includes('third') || reason.includes('podium')) return '🥉 3rd Place';
  if (reason.includes('tournament')) return '🏆 Tournament';
  return '📍 ' + reason;
}

// ─── Component ────────────────────────────────────────────────

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const tabBarPadding = useTabBarPadding();
  const { profile } = useAuth();
  const [mainTab, setMainTab] = useState<MainTab>('rankings');
  const [activeDivision, setActiveDivision] = useState<Division>('amateur');
  const [students, setStudents] = useState<RankedStudent[]>([]);
  const [bptQualifiers, setBptQualifiers] = useState<BPTQualifier[]>([]);
  const [loading, setLoading] = useState(true);
  const [bptLoading, setBptLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Rankings tab ─────────────────────────────────────────────
  const fetchLeaderboard = useCallback(async () => {
    const { data } = await supabase
      .from('ranking_events')
      .select('student_id, division, points, profiles:student_id(full_name, avatar_url)')
      .eq('division', activeDivision);

    if (!data) { setStudents([]); return; }

    const map: Record<string, { full_name: string; avatar_url: string | null; points: number }> = {};
    data.forEach((row: any) => {
      const prof = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      if (!map[row.student_id]) {
        map[row.student_id] = {
          full_name: prof?.full_name ?? 'Unknown',
          avatar_url: prof?.avatar_url ?? null,
          points: 0,
        };
      }
      map[row.student_id].points += row.points;
    });

    const ranked: RankedStudent[] = Object.entries(map)
      .map(([student_id, v]) => ({
        student_id,
        full_name: v.full_name,
        avatar_url: v.avatar_url,
        total_points: v.points,
        division: activeDivision,
        rank: 0,
      }))
      .sort((a, b) => b.total_points - a.total_points)
      .map((s, idx) => ({ ...s, rank: idx + 1 }));

    setStudents(ranked);
  }, [activeDivision]);

  // ── BPT Pathway tab ──────────────────────────────────────────
  const fetchBPT = useCallback(async () => {
    setBptLoading(true);

    const { data: tournamentEvents } = await supabase
      .from('ranking_events')
      .select('student_id, division, points, reason, profiles:student_id(full_name, avatar_url)')
      .ilike('reason', '%tournament%')
      .order('points', { ascending: false });

    if (!tournamentEvents || tournamentEvents.length === 0) {
      setBptQualifiers([]);
      setBptLoading(false);
      return;
    }

    const map: Record<string, {
      full_name: string;
      avatar_url: string | null;
      division: string;
      points: number;
      best_reason: string;
    }> = {};

    tournamentEvents.forEach((row: any) => {
      const prof = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      if (!map[row.student_id]) {
        map[row.student_id] = {
          full_name: prof?.full_name ?? 'Unknown',
          avatar_url: prof?.avatar_url ?? null,
          division: row.division ?? 'amateur',
          points: 0,
          best_reason: row.reason,
        };
      }
      map[row.student_id].points += row.points;
      const cur = map[row.student_id].best_reason;
      if (row.reason.includes('win') || row.reason.includes('first')) {
        map[row.student_id].best_reason = row.reason;
      } else if (!cur.includes('win') && !cur.includes('first') && (row.reason.includes('runner') || row.reason.includes('second'))) {
        map[row.student_id].best_reason = row.reason;
      }
    });

    const qualifiers: BPTQualifier[] = Object.entries(map)
      .map(([student_id, v]) => ({
        student_id,
        full_name: v.full_name,
        avatar_url: v.avatar_url,
        division: v.division as Division,
        tournament_points: v.points,
        top_result: v.best_reason,
        qualified: v.best_reason.includes('win') || v.best_reason.includes('first') ||
                   v.best_reason.includes('runner') || v.best_reason.includes('second') ||
                   v.best_reason.includes('third') || v.best_reason.includes('podium'),
      }))
      .sort((a, b) => b.tournament_points - a.tournament_points);

    setBptQualifiers(qualifiers);
    setBptLoading(false);
  }, []);

  const loadRankings = useCallback(async () => {
    setLoading(true);
    await fetchLeaderboard();
    setLoading(false);
  }, [fetchLeaderboard]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchLeaderboard(), fetchBPT()]);
    setRefreshing(false);
  }, [fetchLeaderboard, fetchBPT]);

  useEffect(() => { loadRankings(); }, [activeDivision]);
  useEffect(() => { fetchBPT(); }, []);

  const divColor = DIVISION_COLORS[activeDivision];
  const qualifiedList = bptQualifiers.filter(q => q.qualified);
  const participantList = bptQualifiers.filter(q => !q.qualified);

  // ─── Render ──────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />

      <ScreenHeader title="🏆 Leaderboard" />

      {/* Main tabs */}
      <View style={styles.mainTabs}>
        <TouchableOpacity
          style={[styles.mainTab, mainTab === 'rankings' && styles.mainTabActive]}
          onPress={() => setMainTab('rankings')}
        >
          <Text style={[styles.mainTabText, mainTab === 'rankings' && styles.mainTabTextActive]}>
            🏅 Rankings
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mainTab, mainTab === 'bpt' && styles.mainTabActiveBPT]}
          onPress={() => setMainTab('bpt')}
        >
          <Text style={[styles.mainTabText, mainTab === 'bpt' && styles.mainTabTextActive]}>
            🎾 BPT Pathway
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── RANKINGS TAB ─────────────────────────────────────── */}
      {mainTab === 'rankings' && (
        <>
          {/* Division filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.divTabs, { paddingBottom: insets.bottom > 0 ? 0 : undefined }]}
            style={styles.divTabsContainer}
          >
            {DIVISIONS.map(div => (
              <TouchableOpacity
                key={div}
                style={[styles.divTab, activeDivision === div && { backgroundColor: DIVISION_COLORS[div] }]}
                onPress={() => setActiveDivision(div)}
              >
                <Text style={[styles.divTabText, activeDivision === div && styles.divTabTextActive]}>
                  {DIVISION_LABELS[div]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.content, { paddingBottom: tabBarPadding }]}
          >
            {loading ? (
              <ActivityIndicator size="large" color={divColor} style={styles.loader} />
            ) : students.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>🏆</Text>
                <Text style={styles.emptyTitle}>No rankings yet</Text>
                <Text style={styles.emptyText}>
                  {DIVISION_LABELS[activeDivision]} rankings will appear after the first tournament.
                </Text>
              </View>
            ) : (
              <>
                {/* Podium — top 3 */}
                {students.length >= 3 && (
                  <View style={styles.podium}>
                    {[students[1], students[0], students[2]].map((s, idx) => {
                      const heights = [80, 110, 60];
                      return (
                        <View key={s.student_id} style={styles.podiumItem}>
                          <Text style={styles.podiumMedal}>{rankMedal(s.rank)}</Text>
                          <Text style={styles.podiumName} numberOfLines={1}>
                            {s.full_name.split(' ')[0]}
                          </Text>
                          <Text style={styles.podiumPoints}>{s.total_points}pts</Text>
                          <View style={[
                            styles.podiumBlock,
                            { height: heights[idx], backgroundColor: divColor + (idx === 1 ? 'FF' : '88') },
                          ]}>
                            <Text style={styles.podiumRank}>{s.rank}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Full rankings list */}
                <View style={styles.listCard}>
                  {students.map((s, idx) => {
                    const isMe = s.student_id === profile?.id;
                    return (
                      <View
                        key={s.student_id}
                        style={[
                          styles.row,
                          isMe && styles.rowMe,
                          idx === students.length - 1 && styles.rowLast,
                        ]}
                      >
                        <Text style={[styles.rowRank, s.rank <= 3 && { fontSize: 18 }]}>
                          {rankMedal(s.rank)}
                        </Text>
                        <View style={[styles.avatar, { backgroundColor: divColor + '33' }]}>
                          <Text style={styles.avatarText}>{s.full_name.charAt(0)}</Text>
                        </View>
                        <View style={styles.rowInfo}>
                          <Text style={styles.rowName}>
                            {s.full_name}{isMe ? ' (You)' : ''}
                          </Text>
                        </View>
                        <Text style={[styles.rowPoints, { color: divColor }]}>{s.total_points}</Text>
                        <Text style={styles.rowPtsLabel}>pts</Text>
                      </View>
                    );
                  })}
                </View>

                {/* Points explainer */}
                <View style={styles.pointsKey}>
                  <Text style={styles.pointsKeyTitle}>How points work</Text>
                  <View style={styles.pointsKeyRow}>
                    <Text style={styles.pointsKeyItem}>🥇 1st place — 100 pts</Text>
                    <Text style={styles.pointsKeyItem}>🥈 2nd place — 60 pts</Text>
                  </View>
                  <View style={styles.pointsKeyRow}>
                    <Text style={styles.pointsKeyItem}>🥉 3rd place — 30 pts</Text>
                    <Text style={styles.pointsKeyItem}>🚀 Promotion — 50 pts</Text>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        </>
      )}

      {/* ── BPT PATHWAY TAB ──────────────────────────────────── */}
      {mainTab === 'bpt' && (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: tabBarPadding }]}
        >
          <View style={styles.bptBanner}>
            <Text style={styles.bptBannerTitle}>🎾 Britain Padel Tour Pathway</Text>
            <Text style={styles.bptBannerText}>
              Finish in the top 3 at a BPT Academy tournament to qualify for a BPT tour event.
              Players below represent the academy's strongest competitors.
            </Text>
          </View>

          <View style={styles.qualifyCard}>
            <Text style={styles.qualifyTitle}>How to Qualify</Text>
            <View style={styles.qualifyStep}>
              <Text style={styles.qualifyStepNum}>1</Text>
              <Text style={styles.qualifyStepText}>Reach <Text style={styles.bold}>Semi-Pro or Pro</Text> division through the promotion system</Text>
            </View>
            <View style={styles.qualifyStep}>
              <Text style={styles.qualifyStepNum}>2</Text>
              <Text style={styles.qualifyStepText}>Register and compete in a <Text style={styles.bold}>BPT Academy Tournament</Text></Text>
            </View>
            <View style={styles.qualifyStep}>
              <Text style={styles.qualifyStepNum}>3</Text>
              <Text style={styles.qualifyStepText}>Finish in the <Text style={styles.bold}>top 3</Text> to earn a spot at a BPT tour event</Text>
            </View>
          </View>

          {bptLoading ? (
            <ActivityIndicator size="large" color="#16A34A" style={styles.loader} />
          ) : bptQualifiers.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🎾</Text>
              <Text style={styles.emptyTitle}>No tournament results yet</Text>
              <Text style={styles.emptyText}>
                BPT qualifiers will appear here after the first academy tournament is completed.
              </Text>
            </View>
          ) : (
            <>
              {qualifiedList.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionHeaderText}>✅ BPT Qualified</Text>
                    <View style={styles.sectionHeaderBadge}>
                      <Text style={styles.sectionHeaderBadgeText}>{qualifiedList.length}</Text>
                    </View>
                  </View>
                  <View style={styles.listCard}>
                    {qualifiedList.map((q, idx) => {
                      const isMe = q.student_id === profile?.id;
                      const dColor = DIVISION_COLORS[q.division] ?? '#16A34A';
                      return (
                        <View
                          key={q.student_id}
                          style={[
                            styles.bptRow,
                            isMe && styles.rowMe,
                            idx === qualifiedList.length - 1 && styles.rowLast,
                          ]}
                        >
                          <View style={[styles.avatar, { backgroundColor: dColor + '33' }]}>
                            <Text style={styles.avatarText}>{q.full_name.charAt(0)}</Text>
                          </View>
                          <View style={styles.rowInfo}>
                            <Text style={styles.rowName}>{q.full_name}{isMe ? ' (You)' : ''}</Text>
                            <Text style={[styles.rowSub, { color: dColor }]}>
                              {DIVISION_LABELS[q.division]}
                            </Text>
                          </View>
                          <View style={styles.bptResultBadge}>
                            <Text style={styles.bptResultText}>{resultLabel(q.top_result)}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}

              {participantList.length > 0 && (
                <>
                  <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                    <Text style={styles.sectionHeaderText}>🎯 Tournament Participants</Text>
                    <View style={[styles.sectionHeaderBadge, { backgroundColor: '#E5E7EB' }]}>
                      <Text style={[styles.sectionHeaderBadgeText, { color: '#374151' }]}>{participantList.length}</Text>
                    </View>
                  </View>
                  <View style={styles.listCard}>
                    {participantList.map((q, idx) => {
                      const isMe = q.student_id === profile?.id;
                      const dColor = DIVISION_COLORS[q.division] ?? '#6B7280';
                      return (
                        <View
                          key={q.student_id}
                          style={[
                            styles.bptRow,
                            isMe && styles.rowMe,
                            idx === participantList.length - 1 && styles.rowLast,
                          ]}
                        >
                          <View style={[styles.avatar, { backgroundColor: dColor + '22' }]}>
                            <Text style={styles.avatarText}>{q.full_name.charAt(0)}</Text>
                          </View>
                          <View style={styles.rowInfo}>
                            <Text style={styles.rowName}>{q.full_name}{isMe ? ' (You)' : ''}</Text>
                            <Text style={[styles.rowSub, { color: dColor }]}>
                              {DIVISION_LABELS[q.division]}
                            </Text>
                          </View>
                          <Text style={styles.rowPoints}>{q.tournament_points}</Text>
                          <Text style={styles.rowPtsLabel}>pts</Text>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  mainTabs: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  mainTab: {
    flex: 1, paddingVertical: 13, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  mainTabActive: { borderBottomColor: '#16A34A' },
  mainTabActiveBPT: { borderBottomColor: '#F59E0B' },
  mainTabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  mainTabTextActive: { color: '#111827' },

  divTabsContainer: { flexGrow: 0, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  divTabs: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  divTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  divTabText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  divTabTextActive: { color: '#FFFFFF' },

  content: { padding: 16, paddingBottom: 72 },
  loader: { marginTop: 60 },

  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 40,
    alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', marginTop: 8,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptyText: { color: '#6B7280', fontSize: 14, textAlign: 'center', lineHeight: 20 },

  podium: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
    marginBottom: 20, paddingVertical: 10, gap: 8,
  },
  podiumItem: { alignItems: 'center', flex: 1 },
  podiumMedal: { fontSize: 24, marginBottom: 4 },
  podiumName: { fontSize: 12, fontWeight: '700', color: '#111827', marginBottom: 2, maxWidth: 80 },
  podiumPoints: { fontSize: 11, color: '#6B7280', marginBottom: 4 },
  podiumBlock: { width: '80%', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  podiumRank: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },

  listCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', marginBottom: 14 },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12,
  },
  rowLast: { borderBottomWidth: 0 },
  rowMe: { backgroundColor: '#F0FDF4' },
  rowRank: { fontSize: 14, fontWeight: '700', color: '#374151', minWidth: 28, textAlign: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700', color: '#374151' },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  rowSub: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  rowPoints: { fontSize: 18, fontWeight: '800', color: '#16A34A' },
  rowPtsLabel: { fontSize: 11, color: '#9CA3AF' },

  bptRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12,
  },
  bptResultBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  bptResultText: { fontSize: 12, fontWeight: '700', color: '#15803D' },

  pointsKey: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 14,
  },
  pointsKeyTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  pointsKeyRow: { flexDirection: 'row', gap: 12, marginBottom: 6 },
  pointsKeyItem: { flex: 1, fontSize: 13, color: '#374151' },

  bptBanner: {
    backgroundColor: '#111827', borderRadius: 14, padding: 18, marginBottom: 14,
  },
  bptBannerTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  bptBannerText: { fontSize: 13, color: '#9CA3AF', lineHeight: 20 },

  qualifyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 14,
  },
  qualifyTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  qualifyStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  qualifyStepNum: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#16A34A',
    color: '#FFFFFF', fontSize: 13, fontWeight: '800', textAlign: 'center', lineHeight: 24,
  },
  qualifyStepText: { flex: 1, fontSize: 14, color: '#374151', lineHeight: 20 },
  bold: { fontWeight: '700', color: '#111827' },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8,
  },
  sectionHeaderText: { fontSize: 15, fontWeight: '700', color: '#111827' },
  sectionHeaderBadge: {
    backgroundColor: '#16A34A', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
  },
  sectionHeaderBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
});
