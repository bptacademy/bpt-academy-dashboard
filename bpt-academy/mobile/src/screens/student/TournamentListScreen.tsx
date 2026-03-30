import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, FlatList, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Tournament, Division, DIVISION_LABELS, DIVISION_COLORS } from '../../types';
import BackHeader from '../../components/common/BackHeader';

const ALL_DIVISIONS: Division[] = ['amateur', 'semi_pro', 'pro', 'junior_9_11', 'junior_12_15', 'junior_15_18'];

// ─── LTA National Padel Tour 2026 ────────────────────────────────────────
interface LTAEvent {
  grade: 'G1' | 'G2';
  name: string;
  location: string;
  dates: string;
  startDate: Date;
}

const LTA_EVENTS_2026: LTAEvent[] = [
  { grade: 'G2', name: 'New Year Open',           location: 'Leeds',       dates: '10–11 Jan 2026', startDate: new Date('2026-01-10') },
  { grade: 'G1', name: 'National Championships',  location: 'Manchester',  dates: '17–19 Jan 2026', startDate: new Date('2026-01-17') },
  { grade: 'G2', name: 'February Open',           location: 'Sheffield',   dates: '7–8 Feb 2026',   startDate: new Date('2026-02-07') },
  { grade: 'G1', name: 'Winter Open',             location: 'London',      dates: '14–16 Feb 2026', startDate: new Date('2026-02-14') },
  { grade: 'G2', name: 'Spring Open',             location: 'Cardiff',     dates: '7–8 Mar 2026',   startDate: new Date('2026-03-07') },
  { grade: 'G1', name: 'Spring Championship',     location: 'Birmingham',  dates: '14–16 Mar 2026', startDate: new Date('2026-03-14') },
  { grade: 'G2', name: 'Easter Open',             location: 'Newcastle',   dates: '18–19 Apr 2026', startDate: new Date('2026-04-18') },
  { grade: 'G1', name: 'Easter Open',             location: 'Bristol',     dates: '11–13 Apr 2026', startDate: new Date('2026-04-11') },
  { grade: 'G2', name: 'May Open',                location: 'Glasgow',     dates: '16–17 May 2026', startDate: new Date('2026-05-16') },
  { grade: 'G1', name: 'May Bank Holiday',        location: 'Nottingham',  dates: '2–4 May 2026',   startDate: new Date('2026-05-02') },
  { grade: 'G2', name: 'June Open',               location: 'Brighton',    dates: '20–21 Jun 2026', startDate: new Date('2026-06-20') },
  { grade: 'G1', name: 'Summer Championship',     location: 'Manchester',  dates: '13–15 Jun 2026', startDate: new Date('2026-06-13') },
  { grade: 'G2', name: 'Summer Open',             location: 'Liverpool',   dates: '18–19 Jul 2026', startDate: new Date('2026-07-18') },
  { grade: 'G1', name: 'Midsummer Open',          location: 'London',      dates: '11–13 Jul 2026', startDate: new Date('2026-07-11') },
  { grade: 'G2', name: 'August Open',             location: 'Bristol',     dates: '9–10 Aug 2026',  startDate: new Date('2026-08-09') },
  { grade: 'G1', name: 'August Bank Holiday',     location: 'Leeds',       dates: '23–25 Aug 2026', startDate: new Date('2026-08-23') },
  { grade: 'G2', name: 'September Open',          location: 'Edinburgh',   dates: '20–21 Sep 2026', startDate: new Date('2026-09-20') },
  { grade: 'G1', name: 'Autumn Championship',     location: 'Birmingham',  dates: '12–14 Sep 2026', startDate: new Date('2026-09-12') },
  { grade: 'G2', name: 'October Open',            location: 'Leeds',       dates: '17–18 Oct 2026', startDate: new Date('2026-10-17') },
  { grade: 'G1', name: 'October Open',            location: 'London',      dates: '10–12 Oct 2026', startDate: new Date('2026-10-10') },
  { grade: 'G2', name: 'November Open',           location: 'Sheffield',   dates: '21–22 Nov 2026', startDate: new Date('2026-11-21') },
  { grade: 'G1', name: 'Winter Championship',     location: 'Manchester',  dates: '7–9 Nov 2026',   startDate: new Date('2026-11-07') },
  { grade: 'G1', name: 'End of Season',           location: 'London',      dates: '5–7 Dec 2026',   startDate: new Date('2026-12-05') },
].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

const today = new Date();

function LTACard({ event }: { event: LTAEvent }) {
  const isPast = event.startDate < today;
  const isG1 = event.grade === 'G1';
  return (
    <View style={[ltaStyles.card, isPast && ltaStyles.cardPast]}>
      <View style={[ltaStyles.gradeBadge, isG1 ? ltaStyles.g1Badge : ltaStyles.g2Badge]}>
        <Text style={ltaStyles.gradeText}>{event.grade}</Text>
      </View>
      <Text style={[ltaStyles.name, isPast && ltaStyles.namePast]} numberOfLines={2}>{event.name}</Text>
      <Text style={ltaStyles.location}>📍 {event.location}</Text>
      <Text style={ltaStyles.dates}>📅 {event.dates}</Text>
    </View>
  );
}

const ltaStyles = StyleSheet.create({
  card: {
    width: 180, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    marginRight: 12, borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  cardPast: { opacity: 0.5 },
  gradeBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginBottom: 8 },
  g1Badge: { backgroundColor: '#FEF3C7' },
  g2Badge: { backgroundColor: '#F3F4F6' },
  gradeText: { fontSize: 12, fontWeight: '800', color: '#92400E' },
  name: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 6, lineHeight: 18 },
  namePast: { color: '#9CA3AF' },
  location: { fontSize: 11, color: '#6B7280', marginBottom: 2 },
  dates: { fontSize: 11, color: '#6B7280' },
});

// ─── Main Screen ─────────────────────────────────────────────────────────

export default function TournamentListScreen({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<Record<string, string>>({});
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

  const fetchMyRegistrations = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('tournament_registrations')
      .select('tournament_id, status')
      .eq('student_id', profile.id)
      .neq('status', 'withdrawn');
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((r: any) => { map[r.tournament_id] = r.status; });
      setMyRegistrations(map);
    }
  };

  const load = async () => {
    setLoading(true);
    await Promise.all([fetchTournaments(), fetchMyRegistrations()]);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchTournaments(), fetchMyRegistrations()]);
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

  // Find the next upcoming LTA event
  const nextLTA = LTA_EVENTS_2026.find(e => e.startDate >= today);

  return (
    <View style={styles.container}>
      <BackHeader title="Tournaments" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── LTA National Padel Tour 2026 ── */}
        <View style={styles.ltaSection}>
          <View style={styles.ltaHeader}>
            <View>
              <Text style={styles.ltaTitle}>🏆 LTA National Padel Tour 2026</Text>
              <Text style={styles.ltaSubtitle}>G1 & G2 fixtures · All events in England & Wales</Text>
            </View>
          </View>

          {nextLTA && (
            <View style={styles.nextEventBanner}>
              <Text style={styles.nextEventLabel}>Next event</Text>
              <Text style={styles.nextEventName}>{nextLTA.grade} · {nextLTA.name}</Text>
              <Text style={styles.nextEventMeta}>{nextLTA.dates} · {nextLTA.location}</Text>
            </View>
          )}

          <FlatList
            horizontal
            data={LTA_EVENTS_2026}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => <LTACard event={item} />}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.ltaList}
          />

          <TouchableOpacity
            style={styles.ltaLink}
            onPress={() => Linking.openURL('https://competitions.lta.org.uk')}
          >
            <Text style={styles.ltaLinkText}>View Full LTA Calendar →</Text>
          </TouchableOpacity>
        </View>

        {/* ── Academy Tournaments ── */}
        <View style={styles.academyHeader}>
          <Text style={styles.academyTitle}>🎾 BPT Academy Tournaments</Text>
        </View>

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
            <Text style={[styles.filterText, selectedDivision === 'all' && styles.filterTextActive]}>All</Text>
          </TouchableOpacity>
          {ALL_DIVISIONS.map(div => (
            <TouchableOpacity
              key={div}
              style={[styles.filterChip, selectedDivision === div && { backgroundColor: DIVISION_COLORS[div] }]}
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
            <Text style={styles.emptyText}>No academy tournaments found for this division.</Text>
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
                      <Text style={[styles.divText, { color: DIVISION_COLORS[div] }]}>{DIVISION_LABELS[div]}</Text>
                    </View>
                  ))}
                </View>
                {t.status === 'registration_open' && (() => {
                  const regStatus = myRegistrations[t.id];
                  if (regStatus === 'confirmed') return (
                    <View style={styles.registeredBtn}>
                      <Text style={styles.registeredBtnText}>✅ Registered</Text>
                    </View>
                  );
                  if (regStatus === 'pending') return (
                    <View style={styles.pendingBtn}>
                      <Text style={styles.pendingBtnText}>⏳ Awaiting Confirmation</Text>
                    </View>
                  );
                  return (
                    <TouchableOpacity
                      style={styles.registerBtn}
                      onPress={() => navigation.navigate('TournamentDetail', { tournamentId: t.id })}
                    >
                      <Text style={styles.registerBtnText}>Register Now →</Text>
                    </TouchableOpacity>
                  );
                })()}
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

  // LTA section
  ltaSection: { backgroundColor: '#111827', paddingBottom: 16 },
  ltaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, paddingBottom: 10 },
  ltaTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 2 },
  ltaSubtitle: { fontSize: 12, color: '#9CA3AF' },
  nextEventBanner: { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#16A34A', borderRadius: 10, padding: 12 },
  nextEventLabel: { fontSize: 10, fontWeight: '700', color: '#A7F3D0', textTransform: 'uppercase', letterSpacing: 0.5 },
  nextEventName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginTop: 2 },
  nextEventMeta: { fontSize: 12, color: '#D1FAE5', marginTop: 2 },
  ltaList: { paddingHorizontal: 16, paddingBottom: 4 },
  ltaLink: { marginHorizontal: 16, marginTop: 12, alignSelf: 'flex-start' },
  ltaLinkText: { fontSize: 13, color: '#34D399', fontWeight: '600' },

  // Academy section
  academyHeader: { padding: 16, paddingBottom: 4 },
  academyTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },

  // Filters
  filterRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#E5E7EB', marginRight: 8 },
  filterChipActive: { backgroundColor: '#16A34A' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  filterTextActive: { color: '#FFFFFF' },

  loader: { marginTop: 60 },
  emptyCard: { margin: 20, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
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
  registeredBtn: { marginTop: 12, borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#A7F3D0' },
  registeredBtnText: { color: '#16A34A', fontSize: 15, fontWeight: '700' },
  pendingBtn: { marginTop: 12, borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA' },
  pendingBtnText: { color: '#D97706', fontSize: 15, fontWeight: '600' },
  registerBtn: { marginTop: 14, backgroundColor: '#16A34A', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  registerBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
