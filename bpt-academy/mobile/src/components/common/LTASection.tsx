import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Linking,
} from 'react-native';

const LTA_CALENDAR_URL =
  'https://competitions.lta.org.uk/find?DateFilterType=0&StartDate=2026-01-01&EndDate=2026-12-31&LocationFilterType=0&page=1' +
  '&TournamentCategoryIDList%5B0%5D=false&TournamentCategoryIDList%5B1%5D=false' +
  '&TournamentCategoryIDList%5B2%5D=false&TournamentCategoryIDList%5B3%5D=false' +
  '&TournamentCategoryIDList%5B4%5D=false&TournamentCategoryIDList%5B5%5D=false' +
  '&TournamentCategoryIDList%5B6%5D=false&TournamentCategoryIDList%5B7%5D=false' +
  '&TournamentCategoryIDList%5B8%5D=22&TournamentCategoryIDList%5B9%5D=false' +
  '&TournamentCategoryIDList%5B10%5D=false&TournamentCategoryIDList%5B11%5D=false' +
  '&GradingIDList%5B0%5D=1&GradingIDList%5B1%5D=2&GradingIDList%5B2%5D=false' +
  '&GradingIDList%5B3%5D=false&GradingIDList%5B4%5D=false&GradingIDList%5B5%5D=false' +
  '&GradingIDList%5B6%5D=false&GradingIDList%5B7%5D=false';

export interface LTAEvent {
  grade: 'G1' | 'G2';
  name: string;
  venue: string;
  location: string;
  dates: string;
  startDate: Date;
  categories: string[];
}

export const LTA_EVENTS_2026: LTAEvent[] = ([
  // ── May ──────────────────────────────────────────────────────────────
  { grade: 'G2' as const, name: 'West of Scotland Padel',              venue: 'West of Scotland Padel',          location: 'Scotland West',       dates: '8–10 May 2026',    startDate: new Date('2026-05-08'), categories: ['40+','50+','60+'] },
  { grade: 'G1' as const, name: 'Island Padel Jersey – Rathbones',     venue: 'Island Padel Limited',            location: 'Channel Islands',     dates: '15–17 May 2026',   startDate: new Date('2026-05-15'), categories: ['40+','50+','60+'] },
  { grade: 'G2' as const, name: 'PADELHUB, Crawley',                   venue: 'The Padel Hub RH17',              location: 'Sussex',              dates: '23–24 May 2026',   startDate: new Date('2026-05-23'), categories: ['Open'] },
  { grade: 'G2' as const, name: 'The Welsh Padel Open 2026',           venue: 'The Welsh Padel Centre',          location: 'Wales',               dates: '30–31 May 2026',   startDate: new Date('2026-05-30'), categories: ['Open'] },
  // ── June ─────────────────────────────────────────────────────────────
  { grade: 'G2' as const, name: 'West Worthing Club',                  venue: 'West Worthing Tennis & Squash',   location: 'Sussex',              dates: '6–7 Jun 2026',     startDate: new Date('2026-06-06'), categories: ['50+'] },
  { grade: 'G1' as const, name: 'NSM & SPF Cup, Guernsey',             venue: 'Guernsey Padel Club',             location: 'Channel Islands',     dates: '12–14 Jun 2026',   startDate: new Date('2026-06-12'), categories: ['Open','18U','9-14','40+','50+'] },
  { grade: 'G2' as const, name: 'Middlesborough Padel Club',           venue: 'Tennis World',                    location: 'Durham & Cleveland',  dates: '13–14 Jun 2026',   startDate: new Date('2026-06-13'), categories: ['Open'] },
  { grade: 'G2' as const, name: 'Slazenger Padel Leeds – ElevateSportPadel', venue: 'Slazenger Padel Clubs Leeds', location: 'Yorkshire',       dates: '19–21 Jun 2026',   startDate: new Date('2026-06-19'), categories: ['Open','16U','9-12','40+','50+','60+'] },
  { grade: 'G2' as const, name: 'SMASH PADEL CARDIFF',                 venue: 'Smash Padel Cardiff',             location: 'Wales South',         dates: '27–28 Jun 2026',   startDate: new Date('2026-06-27'), categories: ['Open'] },
  // ── July ─────────────────────────────────────────────────────────────
  { grade: 'G2' as const, name: 'East Glos',                           venue: 'East Gloucestershire Club',       location: 'Gloucestershire',     dates: '2–5 Jul 2026',     startDate: new Date('2026-07-02'), categories: ['Open','16U','60+'] },
  { grade: 'G2' as const, name: 'Surge Padel – Harrogate',             venue: 'Surge Padel - Harrogate',         location: 'Yorkshire',           dates: '10–12 Jul 2026',   startDate: new Date('2026-07-10'), categories: ['Open'] },
  // ── August ───────────────────────────────────────────────────────────
  { grade: 'G2' as const, name: 'Padel United The Wirral',             venue: 'Port Sunlight LTC',               location: 'Cheshire',            dates: '6–9 Aug 2026',     startDate: new Date('2026-08-06'), categories: ['Open','40+'] },
  { grade: 'G1' as const, name: 'Junior G1 – Wrexham Tennis & Padel',  venue: 'Wrexham Tennis & Padel Centre',   location: 'Wales North',         dates: '15–16 Aug 2026',   startDate: new Date('2026-08-15'), categories: ['18U'] },
  // ── September ────────────────────────────────────────────────────────
  { grade: 'G2' as const, name: 'West of Scotland Padel',              venue: 'West of Scotland Padel',          location: 'Scotland West',       dates: '25–27 Sep 2026',   startDate: new Date('2026-09-25'), categories: ['40+','50+','60+'] },
  // ── October ──────────────────────────────────────────────────────────
  { grade: 'G2' as const, name: 'UK PADEL Masters (South-West)',       venue: 'Rocket Padel Bristol',            location: 'Avon',                dates: '10 Oct 2026',      startDate: new Date('2026-10-10'), categories: ['40+','50+','60+'] },
  { grade: 'G2' as const, name: 'PADELHUB, Crawley',                   venue: 'The Padel Hub RH17',              location: 'Sussex',              dates: '10–11 Oct 2026',   startDate: new Date('2026-10-10'), categories: ['Open'] },
  { grade: 'G2' as const, name: 'Slazenger Padel Leeds – ElevateSportPadel', venue: 'Slazenger Padel Clubs Leeds', location: 'Yorkshire',       dates: '24–25 Oct 2026',   startDate: new Date('2026-10-24'), categories: ['Open','16U','9-12','40+','50+','60+'] },
  { grade: 'G2' as const, name: 'Stratford Padel Club',                venue: 'Stratford Padel Club',            location: 'Essex',               dates: '30 Oct–1 Nov 2026',startDate: new Date('2026-10-30'), categories: ['Open'] },
  // ── November ─────────────────────────────────────────────────────────
  { grade: 'G2' as const, name: 'West of Scotland Padel',              venue: 'West of Scotland Padel',          location: 'Scotland West',       dates: '6–8 Nov 2026',     startDate: new Date('2026-11-06'), categories: ['Open'] },
  { grade: 'G1' as const, name: 'HOP Pro Finals 2026',                 venue: 'Padium',                          location: 'Middlesex',           dates: '19–22 Nov 2026',   startDate: new Date('2026-11-19'), categories: ['Open','18U','9-14'] },
  { grade: 'G2' as const, name: 'UK PADEL Masters (South-East)',       venue: 'The Padel Hub GU52',              location: 'Hampshire & IoW',     dates: '21 Nov 2026',      startDate: new Date('2026-11-21'), categories: ['40+','50+','60+'] },
  // ── December ─────────────────────────────────────────────────────────
  { grade: 'G1' as const, name: 'Rocket Padel Ilford',                 venue: 'Rocket Padel Ilford',             location: 'Essex',               dates: '11–13 Dec 2026',   startDate: new Date('2026-12-11'), categories: ['Open','18U'] },
] as LTAEvent[]).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

const today = new Date();

function LTACard({ event }: { event: LTAEvent }) {
  const isPast = event.startDate < today;
  const isG1 = event.grade === 'G1';
  return (
    <View style={[styles.card, isPast && styles.cardPast]}>
      <View style={[styles.gradeBadge, isG1 ? styles.g1Badge : styles.g2Badge]}>
        <Text style={[styles.gradeText, isG1 ? styles.g1Text : styles.g2Text]}>{event.grade}</Text>
      </View>
      <Text style={[styles.name, isPast && styles.namePast]} numberOfLines={2}>{event.name}</Text>
      <Text style={styles.venue} numberOfLines={1}>🏟 {event.venue}</Text>
      <Text style={styles.location}>📍 {event.location}</Text>
      <Text style={styles.dates}>📅 {event.dates}</Text>
      {event.categories.length > 0 && (
        <View style={styles.cats}>
          {event.categories.map(c => (
            <View key={c} style={styles.catChip}>
              <Text style={styles.catText}>{c}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function LTASection() {
  const nextLTA = LTA_EVENTS_2026.find(e => e.startDate >= today);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>🏆 LTA Padel British Tour 2026</Text>
          <Text style={styles.subtitle}>G1 & G2 official fixtures · {LTA_EVENTS_2026.length} events</Text>
        </View>
      </View>

      {nextLTA && (
        <View style={styles.nextBanner}>
          <Text style={styles.nextLabel}>NEXT EVENT</Text>
          <Text style={styles.nextName}>{nextLTA.grade} · {nextLTA.name}</Text>
          <Text style={styles.nextMeta}>{nextLTA.dates} · {nextLTA.venue}, {nextLTA.location}</Text>
        </View>
      )}

      <FlatList
        horizontal
        data={LTA_EVENTS_2026}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => <LTACard event={item} />}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      />

      <TouchableOpacity style={styles.link} onPress={() => Linking.openURL(LTA_CALENDAR_URL)}>
        <Text style={styles.linkText}>View Full LTA Calendar →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { backgroundColor: '#111827', paddingBottom: 16 },
  header: { padding: 16, paddingBottom: 10 },
  title: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 2 },
  subtitle: { fontSize: 12, color: '#9CA3AF' },
  nextBanner: { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#16A34A', borderRadius: 10, padding: 12 },
  nextLabel: { fontSize: 10, fontWeight: '700', color: '#A7F3D0', letterSpacing: 1 },
  nextName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginTop: 2 },
  nextMeta: { fontSize: 12, color: '#D1FAE5', marginTop: 2 },
  list: { paddingHorizontal: 16, paddingBottom: 4 },
  link: { marginHorizontal: 16, marginTop: 12, alignSelf: 'flex-start' },
  linkText: { fontSize: 13, color: '#34D399', fontWeight: '600' },

  card: {
    width: 200, backgroundColor: '#1F2937', borderRadius: 14, padding: 14,
    marginRight: 12, borderWidth: 1, borderColor: '#374151',
  },
  cardPast: { opacity: 0.4 },
  gradeBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginBottom: 8 },
  g1Badge: { backgroundColor: '#FEF3C7' },
  g2Badge: { backgroundColor: '#374151' },
  gradeText: { fontSize: 12, fontWeight: '800' },
  g1Text: { color: '#92400E' },
  g2Text: { color: '#D1D5DB' },
  name: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', marginBottom: 6, lineHeight: 18 },
  namePast: { color: '#6B7280' },
  venue: { fontSize: 11, color: '#9CA3AF', marginBottom: 2 },
  location: { fontSize: 11, color: '#9CA3AF', marginBottom: 2 },
  dates: { fontSize: 11, color: '#60A5FA', marginBottom: 6 },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  catChip: { backgroundColor: '#374151', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  catText: { fontSize: 10, color: '#D1D5DB', fontWeight: '600' },
});
