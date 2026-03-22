import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Division, DIVISION_LABELS, DIVISION_COLORS } from '../../types';
import ScreenHeader from '../../components/common/ScreenHeader';

const DIVISIONS: Division[] = ['amateur', 'semi_pro', 'pro', 'junior_9_11', 'junior_12_15', 'junior_15_18'];

interface RankedStudent {
  student_id: string;
  full_name: string;
  avatar_url: string | null;
  total_points: number;
  division: Division;
  rank: number;
}

export default function LeaderboardScreen() {
  const { profile } = useAuth();
  const [activeDivision, setActiveDivision] = useState<Division>('amateur');
  const [students, setStudents] = useState<RankedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    const { data } = await supabase
      .from('ranking_events')
      .select('student_id, division, points, profiles:student_id(full_name, avatar_url)')
      .eq('division', activeDivision);

    if (!data) return;

    // Aggregate points per student
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

  const load = async () => {
    setLoading(true);
    await fetchLeaderboard();
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLeaderboard();
    setRefreshing(false);
  };

  useEffect(() => { load(); }, [activeDivision]);

  const rankMedal = (rank: number): string => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const divColor = DIVISION_COLORS[activeDivision];

  return (
    <View style={styles.container}>
      <ScreenHeader title="🏆 Leaderboard" />

      {/* Division tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
        style={styles.tabsContainer}
      >
        {DIVISIONS.map(div => (
          <TouchableOpacity
            key={div}
            style={[
              styles.tab,
              activeDivision === div && { backgroundColor: DIVISION_COLORS[div] },
            ]}
            onPress={() => setActiveDivision(div)}
          >
            <Text style={[styles.tabText, activeDivision === div && styles.tabTextActive]}>
              {DIVISION_LABELS[div]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#16A34A" style={styles.loader} />
        ) : students.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🏆</Text>
            <Text style={styles.emptyText}>No rankings yet for {DIVISION_LABELS[activeDivision]}</Text>
          </View>
        ) : (
          <>
            {/* Top 3 podium */}
            {students.length >= 3 && (
              <View style={styles.podium}>
                {[students[1], students[0], students[2]].map((s, idx) => {
                  const heights = [80, 110, 60];
                  return (
                    <View key={s.student_id} style={styles.podiumItem}>
                      <Text style={styles.podiumMedal}>{rankMedal(s.rank)}</Text>
                      <Text style={styles.podiumName} numberOfLines={1}>{s.full_name.split(' ')[0]}</Text>
                      <Text style={styles.podiumPoints}>{s.total_points}pts</Text>
                      <View style={[styles.podiumBlock, { height: heights[idx], backgroundColor: divColor + (idx === 1 ? 'FF' : '88') }]}>
                        <Text style={styles.podiumRank}>{s.rank}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Full list */}
            <View style={styles.listCard}>
              {students.map(s => {
                const isMe = s.student_id === profile?.id;
                return (
                  <View
                    key={s.student_id}
                    style={[styles.row, isMe && styles.rowMe]}
                  >
                    <Text style={[styles.rowRank, s.rank <= 3 && { fontSize: 18 }]}>
                      {rankMedal(s.rank)}
                    </Text>
                    <View style={[styles.avatar, { backgroundColor: divColor + '33' }]}>
                      <Text style={{ fontSize: 16 }}>{s.full_name.charAt(0)}</Text>
                    </View>
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowName}>{s.full_name}{isMe ? ' (You)' : ''}</Text>
                    </View>
                    <Text style={[styles.rowPoints, { color: divColor }]}>{s.total_points}</Text>
                    <Text style={styles.rowPtsLabel}>pts</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  tabsContainer: { flexGrow: 0, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tabs: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tab: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#F3F4F6', marginRight: 8,
  },
  tabText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  tabTextActive: { color: '#FFFFFF' },
  content: { padding: 16, paddingBottom: 40 },
  loader: { marginTop: 60 },
  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 40,
    alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', marginTop: 20,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#6B7280', fontSize: 14 },
  podium: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
    marginBottom: 20, paddingVertical: 10, gap: 8,
  },
  podiumItem: { alignItems: 'center', flex: 1 },
  podiumMedal: { fontSize: 24, marginBottom: 4 },
  podiumName: { fontSize: 12, fontWeight: '700', color: '#111827', marginBottom: 2, maxWidth: 80 },
  podiumPoints: { fontSize: 11, color: '#6B7280', marginBottom: 4 },
  podiumBlock: {
    width: '80%', borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  podiumRank: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  listCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12,
  },
  rowMe: { backgroundColor: '#F0FDF4' },
  rowRank: { fontSize: 14, fontWeight: '700', color: '#374151', minWidth: 28, textAlign: 'center' },
  avatar: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
  },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  rowPoints: { fontSize: 18, fontWeight: '800' },
  rowPtsLabel: { fontSize: 11, color: '#9CA3AF' },
});
