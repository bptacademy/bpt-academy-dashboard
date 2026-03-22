import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Tournament, Division, DIVISION_LABELS, DIVISION_COLORS } from '../../types';
import BackHeader from '../../components/common/BackHeader';

const ALL_DIVISIONS: Division[] = ['amateur', 'semi_pro', 'pro', 'junior_9_11', 'junior_12_15', 'junior_15_18'];

export default function TournamentListScreen({ navigation }: { navigation: any }) {
  const { profile } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState<Division | 'all'>('all');

  const fetchTournaments = async () => {
    const { data } = await supabase
      .from('tournaments')
      .select('*')
      .order('start_date', { ascending: true });
    if (data) setTournaments(data as Tournament[]);
  };

  const load = async () => {
    setLoading(true);
    await fetchTournaments();
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTournaments();
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = selectedDivision === 'all'
    ? tournaments
    : tournaments.filter(t => t.eligible_divisions.includes(selectedDivision));

  const statusColor: Record<string, string> = {
    upcoming: '#F59E0B',
    registration_open: '#16A34A',
    ongoing: '#3B82F6',
    completed: '#9CA3AF',
  };

  return (
    <View style={styles.container}>
      <BackHeader title="Tournaments" />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Division filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <TouchableOpacity
            style={[styles.filterChip, selectedDivision === 'all' && styles.filterChipActive]}
            onPress={() => setSelectedDivision('all')}
          >
            <Text style={[styles.filterText, selectedDivision === 'all' && styles.filterTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          {ALL_DIVISIONS.map(div => (
            <TouchableOpacity
              key={div}
              style={[
                styles.filterChip,
                selectedDivision === div && { backgroundColor: DIVISION_COLORS[div] },
              ]}
              onPress={() => setSelectedDivision(div)}
            >
              <Text style={[styles.filterText, selectedDivision === div && styles.filterTextActive]}>
                {DIVISION_LABELS[div]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator size="large" color="#16A34A" style={styles.loader} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No tournaments found for this division.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map(t => (
              <TouchableOpacity
                key={t.id}
                style={styles.card}
                onPress={() => navigation.navigate('TournamentDetail', { tournamentId: t.id })}
                activeOpacity={0.85}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>{t.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor[t.status] ?? '#9CA3AF' }]}>
                    <Text style={styles.statusText}>{t.status.replace('_', ' ')}</Text>
                  </View>
                </View>
                {t.location && <Text style={styles.meta}>📍 {t.location}</Text>}
                <Text style={styles.meta}>
                  📅 {new Date(t.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {t.end_date && ` – ${new Date(t.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                </Text>
                <Text style={styles.meta}>💷 Entry fee: £{t.entry_fee_gbp.toFixed(2)}</Text>
                {t.registration_deadline && (
                  <Text style={styles.meta}>
                    ⏰ Register by {new Date(t.registration_deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                )}
                <View style={styles.divisionRow}>
                  {(t.eligible_divisions as Division[]).map(div => (
                    <View key={div} style={[styles.divChip, { backgroundColor: DIVISION_COLORS[div] + '22' }]}>
                      <Text style={[styles.divText, { color: DIVISION_COLORS[div] }]}>
                        {DIVISION_LABELS[div]}
                      </Text>
                    </View>
                  ))}
                </View>
                {t.status === 'registration_open' && (
                  <TouchableOpacity
                    style={styles.registerBtn}
                    onPress={() => navigation.navigate('TournamentDetail', { tournamentId: t.id })}
                  >
                    <Text style={styles.registerBtnText}>Register Now</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  filterRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#E5E7EB', marginRight: 8,
  },
  filterChipActive: { backgroundColor: '#16A34A' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  filterTextActive: { color: '#FFFFFF' },
  loader: { marginTop: 60 },
  emptyCard: {
    margin: 20, backgroundColor: '#FFFFFF', borderRadius: 14,
    padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB',
  },
  emptyText: { color: '#6B7280', fontSize: 14 },
  list: { padding: 16, gap: 14 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1, marginRight: 10 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF', textTransform: 'capitalize' },
  meta: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  divisionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  divChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  divText: { fontSize: 11, fontWeight: '600' },
  registerBtn: {
    marginTop: 14, backgroundColor: '#16A34A', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  registerBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
