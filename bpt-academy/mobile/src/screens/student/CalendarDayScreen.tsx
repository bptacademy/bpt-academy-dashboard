import React from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ListRenderItemInfo, Image, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import BackHeader from '../../components/common/BackHeader';

export interface CalendarEvent {
  id: string;
  title: string;
  type: 'session' | 'tournament' | 'announcement' | 'pending_session';
  _startDate?: string;
  _programTitle?: string;
  time?: string;
  description?: string;
  location?: string;
  duration_minutes?: number;
}

interface RouteParams {
  date: string;
  events: CalendarEvent[];
}

const EVENT_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: string }
> = {
  session:         { label: 'Session',      color: '#22C55E', bg: 'rgba(34,197,94,0.15)',   icon: '🎾' },
  tournament:      { label: 'Tournament',   color: '#F59E0B', bg: 'rgba(245,158,11,0.15)',  icon: '🏆' },
  announcement:    { label: 'Announcement', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)',  icon: '📢' },
  pending_session: { label: 'Coming Soon',  color: '#EF4444', bg: 'rgba(239,68,68,0.15)',   icon: '📅' },
};

function formatDate(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

// Extract program name from description field ("Program: Semi-Pro - 2" → "Semi-Pro - 2")
function extractProgram(description?: string): string | null {
  if (!description) return null;
  if (description.startsWith('Program: ')) return description.replace('Program: ', '');
  return null;
}

function EventCard({ item }: { item: CalendarEvent }) {
  const cfg = EVENT_TYPE_CONFIG[item.type] ?? EVENT_TYPE_CONFIG.session;

  if (item.type === 'pending_session') {
    const startDate = item._startDate
      ? new Date(item._startDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : null;
    return (
      <View style={[styles.card, styles.cardPending]}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardIcon}>📅</Text>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, { color: '#EF4444' }]} numberOfLines={2}>{item._programTitle ?? item.title}</Text>
            <View style={[styles.typeBadge, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
              <Text style={[styles.typeBadgeText, { color: '#EF4444' }]}>Coming Soon</Text>
            </View>
          </View>
          <Text style={styles.cardDesc}>
            {startDate
              ? `Your program starts on ${startDate}. Sessions will become available from that date.`
              : "Your program hasn't started yet. Sessions will be available once your cycle begins."}
          </Text>
        </View>
      </View>
    );
  }

  const programName = extractProgram(item.description);

  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <Text style={styles.cardIcon}>{cfg.icon}</Text>
        {item.time ? <Text style={styles.cardTime}>{item.time}</Text> : null}
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          <View style={[styles.typeBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.typeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
        {/* Program name — prominent so multiple sessions from different programs are clearly distinct */}
        {programName && (
          <View style={styles.programTag}>
            <Text style={styles.programTagText}>📚 {programName}</Text>
          </View>
        )}
        {item.location ? <Text style={styles.cardMeta}>📍 {item.location}</Text> : null}
        {item.duration_minutes ? (
          <Text style={styles.cardMeta}>⏱ {item.duration_minutes} min</Text>
        ) : null}
      </View>
    </View>
  );
}

export default function CalendarDayScreen({ route }: any) {
  const insets = useSafeAreaInsets();
  const tabBarPadding = useTabBarPadding();
  const { date, events } = route.params as RouteParams;

  const sortedEvents = [...(events ?? [])].sort((a, b) => {
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });

  return (
    <View style={styles.container}>
      <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />
      <BackHeader title="Day Schedule" />

      <View style={styles.dateHeader}>
        <Text style={styles.dateText}>{formatDate(date)}</Text>
        <Text style={styles.eventCount}>
          {sortedEvents.length} event{sortedEvents.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {sortedEvents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyTitle}>Nothing scheduled</Text>
          <Text style={styles.emptyBody}>No events on this day.</Text>
        </View>
      ) : (
        <FlatList
          data={sortedEvents}
          keyExtractor={item => item.id}
          renderItem={({ item }: ListRenderItemInfo<CalendarEvent>) => <EventCard item={item} />}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarPadding }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  bgImage: { position: 'absolute', top: 0, left: 0, width, height },
  container: { flex: 1, backgroundColor: '#0B1628' },

  dateHeader: {
    backgroundColor: 'rgba(17,30,51,0.90)',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  dateText: { fontSize: 18, fontWeight: '700', color: '#F0F6FC' },
  eventCount: { fontSize: 13, color: '#7A8FA6', marginTop: 4 },

  list: { padding: 16 },

  card: {
    backgroundColor: 'rgba(17,30,51,0.85)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  cardLeft: { alignItems: 'center', width: 52, marginRight: 12 },
  cardIcon: { fontSize: 24, marginBottom: 4 },
  cardTime: { fontSize: 11, fontWeight: '600', color: '#7A8FA6', textAlign: 'center' },
  cardBody: { flex: 1 },
  cardTitleRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 6, gap: 8,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#F0F6FC', flex: 1 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  programTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  programTagText: { fontSize: 12, fontWeight: '600', color: '#60A5FA' },
  cardMeta: { fontSize: 12, color: '#7A8FA6', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#7A8FA6', lineHeight: 18 },

  cardPending: { borderColor: 'rgba(239,68,68,0.30)', borderWidth: 1 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#F0F6FC', marginBottom: 8 },
  emptyBody: { fontSize: 14, color: '#7A8FA6', textAlign: 'center' },
});
