import { theme } from '../../lib/theme';
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Mock data — will be replaced with real Playtomic data from Edge Function
const MOCK_STATS = {
  full_name: 'Fabian David',
  level_value: 4.7,
  level_label: 'Advanced Competitive',
  total_matches: 84,
  win_rate: 0.61,
  top_clubs: ['Carbon Padel', 'Padel Social Club', 'Destination Padel'],
};

export default function ProfilePreviewScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const stats = MOCK_STATS;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1B2A" />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Here's what we found</Text>
          <Text style={styles.subtitle}>
            Built entirely from your Playtomic history. Does this look right?
          </Text>
        </View>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitials}>
              {stats.full_name.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
          <Text style={styles.name}>{stats.full_name}</Text>

          <View style={styles.levelBadge}>
            <Text style={styles.levelValue}>{stats.level_value}</Text>
            <Text style={styles.levelLabel}>{stats.level_label}</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.total_matches}</Text>
            <Text style={styles.statLabel}>Matches</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{Math.round(stats.win_rate * 100)}%</Text>
            <Text style={styles.statLabel}>Win rate</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.top_clubs.length}</Text>
            <Text style={styles.statLabel}>Clubs</Text>
          </View>
        </View>

        {/* Top clubs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Regular clubs</Text>
          {stats.top_clubs.map((club, i) => (
            <View key={i} style={styles.clubRow}>
              <View style={styles.clubDot} />
              <Text style={styles.clubName}>{club}</Text>
            </View>
          ))}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>✨</Text>
          <Text style={styles.infoText}>
            Your play style, availability, and compatibility score will be calculated automatically as you use the app.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={() => navigation.navigate('Question1Location')}
          activeOpacity={0.85}
        >
          <Text style={styles.confirmBtnText}>Looks good — let's continue</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.wrongLink}>Something's wrong</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: 24 },
  header: { paddingTop: 24, marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: theme.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 15, color: theme.textMuted, lineHeight: 22 },
  profileCard: {
    backgroundColor: theme.bgCard, borderRadius: 20, padding: 24,
    alignItems: 'center', borderWidth: 1.5, borderColor: theme.border, marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(230,63,107,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarInitials: { fontSize: 28, fontWeight: '800', color: theme.primary },
  name: { fontSize: 22, fontWeight: '800', color: theme.textPrimary, marginBottom: 10 },
  levelBadge: {
    backgroundColor: 'rgba(230,63,107,0.1)', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(230,63,107,0.2)',
  },
  levelValue: { fontSize: 24, fontWeight: '800', color: theme.primary },
  levelLabel: { fontSize: 12, color: theme.textSecondary, fontWeight: '600', marginTop: 2 },
  statsRow: {
    flexDirection: 'row', backgroundColor: theme.bgCard, borderRadius: 16,
    padding: 20, marginBottom: 12, borderWidth: 1.5, borderColor: theme.border,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: theme.textPrimary, marginBottom: 4 },
  statLabel: { fontSize: 12, color: theme.textMuted, fontWeight: '600' },
  statDivider: { width: 1, backgroundColor: theme.border },
  section: {
    backgroundColor: theme.bgCard, borderRadius: 16, padding: 18,
    marginBottom: 12, borderWidth: 1.5, borderColor: theme.border,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: theme.textSecondary, marginBottom: 12 },
  clubRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  clubDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.primary },
  clubName: { fontSize: 15, color: theme.textPrimary, fontWeight: '500' },
  infoBox: {
    flexDirection: 'row', gap: 10, backgroundColor: '#0A1520',
    borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 100,
  },
  infoIcon: { fontSize: 18 },
  infoText: { flex: 1, fontSize: 13, color: theme.textMuted, lineHeight: 20 },
  actions: { paddingBottom: 16, gap: 12 },
  confirmBtn: {
    backgroundColor: theme.primary, borderRadius: 16, padding: 18, alignItems: 'center',
    shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  confirmBtnText: { color: theme.textPrimary, fontSize: 17, fontWeight: '700' },
  wrongLink: { color: theme.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 8 },
});
