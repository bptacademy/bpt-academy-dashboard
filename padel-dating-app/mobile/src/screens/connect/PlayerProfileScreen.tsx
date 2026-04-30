import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  StatusBar, Alert, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../lib/theme';

// Mock data — replaced with real data once Playtomic sync is wired up
const MOCK_PROFILE = {
  id: '1', name: 'Sofia', age: 29, city: 'London',
  level: 4.7, levelLabel: 'Advanced Competitive',
  levelConfidence: 0.92,
  lookingFor: 'both',
  bio: 'Post-match coffee is non-negotiable.',
  volpairScore: 91,
  skillScore: 23, styleScore: 18, availabilityScore: 17,
  locationScore: 14, chemistryScore: 9, proximityScore: 10,
  totalMatches: 124, wins: 84, losses: 40, winRate: 68,
  avgSetFor: 5.8, avgSetAgainst: 4.2,
  playStyle: 'Aggressive',
  preferredTime: 'Evening',
  preferredDays: ['Tuesday', 'Thursday', 'Saturday'],
  topClubs: ['Carbon Padel', 'Padel Social Club', 'Destination Padel'],
  matchesTogether: 4,
  lastPlayedTogether: 'Carbon Padel · 3 days ago',
  mutualConnections: 3,
  emoji: '🎾',
};

// ─── Volpair Score Breakdown Modal (screen 34) ────────────────────────────────
function ScoreBreakdownModal({ visible, onClose, player }: any) {
  const dimensions = [
    { label: 'Skill match', value: player.skillScore, max: 25, color: theme.primary },
    { label: 'Play style', value: player.styleScore, max: 20, color: theme.primary },
    { label: 'Availability', value: player.availabilityScore, max: 20, color: '#F59E0B' },
    { label: 'Location', value: player.locationScore, max: 15, color: theme.primary },
    { label: 'Chemistry', value: player.chemistryScore, max: 10, color: '#A78BFA' },
    { label: 'Circle', value: player.proximityScore, max: 10, color: '#A78BFA' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.handle} />
          <Text style={modal.title}>Volpair Score</Text>
          <View style={modal.scoreBig}>
            <Text style={modal.scoreBigValue}>{player.volpairScore}</Text>
            <Text style={modal.scoreBigLabel}>/ 100</Text>
          </View>
          <Text style={modal.scoreDesc}>
            Based on your real court history together and compatible play patterns.
          </Text>
          {dimensions.map((d, i) => (
            <View key={i} style={modal.dimRow}>
              <Text style={modal.dimLabel}>{d.label}</Text>
              <View style={modal.barBg}>
                <View style={[modal.barFill, {
                  width: `${(d.value / d.max) * 100}%`,
                  backgroundColor: d.color,
                }]} />
              </View>
              <Text style={[modal.dimValue, { color: d.color }]}>{d.value}/{d.max}</Text>
            </View>
          ))}
          <TouchableOpacity style={modal.closeBtn} onPress={onClose}>
            <Text style={modal.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Level Explainer Modal (screen 35) ───────────────────────────────────────
function LevelExplainerModal({ visible, onClose, level }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.handle} />
          <Text style={modal.title}>What does {level} mean?</Text>
          <Text style={modal.explainerText}>
            Playtomic calculates your level from your actual match results — wins, losses, opponent levels, and set scores. It updates after every match.
          </Text>
          <View style={modal.levelScale}>
            {[
              { range: '1.0–2.5', label: 'Beginner' },
              { range: '2.5–3.5', label: 'Intermediate' },
              { range: '3.5–4.5', label: 'Competitive' },
              { range: '4.5–5.5', label: 'Advanced', highlight: true },
              { range: '5.5–7.0', label: 'Elite' },
            ].map((l, i) => (
              <View key={i} style={[modal.levelRow, l.highlight && modal.levelRowHighlight]}>
                <Text style={[modal.levelRange, l.highlight && { color: theme.primary }]}>{l.range}</Text>
                <Text style={[modal.levelLbl, l.highlight && { color: theme.primary }]}>{l.label}</Text>
                {l.highlight && <Text style={modal.levelYou}>← you</Text>}
              </View>
            ))}
          </View>
          <TouchableOpacity style={modal.closeBtn} onPress={onClose}>
            <Text style={modal.closeBtnText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Report Modal (screen 33) ─────────────────────────────────────────────────
function ReportModal({ visible, onClose, name }: any) {
  const REASONS = [
    'Inappropriate photos',
    'Harassment or abuse',
    'Fake profile',
    'Spam',
    'Other',
  ];
  const [selected, setSelected] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!selected) return;
    onClose();
    Alert.alert('Report submitted', 'Thank you. We will review this profile within 24 hours.');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.handle} />
          <Text style={modal.title}>Report {name}</Text>
          <Text style={modal.reportSub}>Why are you reporting this profile?</Text>
          {REASONS.map(r => (
            <TouchableOpacity
              key={r}
              style={[modal.reportRow, selected === r && modal.reportRowSelected]}
              onPress={() => setSelected(r)}
            >
              <Text style={[modal.reportReason, selected === r && { color: theme.textPrimary }]}>{r}</Text>
              {selected === r && <Text style={modal.reportCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[modal.submitBtn, !selected && { opacity: 0.4 }]}
            onPress={handleSubmit}
            disabled={!selected}
          >
            <Text style={modal.submitBtnText}>Submit report</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose}>
            <Text style={modal.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PlayerProfileScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const player = MOCK_PROFILE; // will use route.params.userId to fetch real data
  const [actioned, setActioned] = useState<string | null>(null);
  const [showScore, setShowScore] = useState(false);
  const [showLevel, setShowLevel] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const handleAction = (type: string) => {
    if (type === 'volley') {
      setActioned('volley');
      // In production: insert into connections table, check for mutual
      // If mutual → navigate to MutualVolleyMatch
    } else {
      setActioned(type);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowReport(true)}>
          <Text style={styles.reportBtn}>Report</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Avatar + name */}
        <View style={styles.heroSection}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarEmoji}>{player.emoji}</Text>
          </View>
          <Text style={styles.playerName}>{player.name}, {player.age}</Text>
          <Text style={styles.playerCity}>📍 {player.city}</Text>
          {player.bio && <Text style={styles.playerBio}>"{player.bio}"</Text>}

          <View style={styles.badgeRow}>
            {(player.lookingFor === 'date' || player.lookingFor === 'both') && (
              <View style={styles.intentBadge}>
                <Text style={styles.intentText}>
                  {player.lookingFor === 'both' ? '💘 Open to dating' : '💘 Looking to date'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Level + Volpair score */}
        <View style={styles.scoreRow}>
          <TouchableOpacity style={styles.levelCard} onPress={() => setShowLevel(true)} activeOpacity={0.8}>
            <Text style={styles.levelValue}>{player.level}</Text>
            <Text style={styles.levelLabel}>{player.levelLabel}</Text>
            <Text style={styles.levelTap}>What does this mean? →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.volpairScoreCard} onPress={() => setShowScore(true)} activeOpacity={0.8}>
            <Text style={styles.volpairScoreValue}>{player.volpairScore}</Text>
            <Text style={styles.volpairScoreLabel}>Volpair Score</Text>
            <Text style={styles.volpairScoreTap}>See breakdown →</Text>
          </TouchableOpacity>
        </View>

        {/* Shared history */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤝 Your court history</Text>
          <View style={styles.historyRow}>
            <View style={styles.historyItem}>
              <Text style={styles.historyValue}>{player.matchesTogether}</Text>
              <Text style={styles.historyLabel}>matches together</Text>
            </View>
            <View style={styles.historyDivider} />
            <View style={styles.historyItem}>
              <Text style={styles.historyValue}>{player.mutualConnections}</Text>
              <Text style={styles.historyLabel}>mutual connections</Text>
            </View>
          </View>
          <View style={styles.lastPlayedRow}>
            <Text style={styles.lastPlayedIcon}>🏟</Text>
            <Text style={styles.lastPlayedText}>Last played at {player.lastPlayedTogether}</Text>
          </View>
        </View>

        {/* Their stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Their stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{player.totalMatches}</Text>
              <Text style={styles.statLabel}>Matches</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{player.winRate}%</Text>
              <Text style={styles.statLabel}>Win rate</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{player.playStyle}</Text>
              <Text style={styles.statLabel}>Play style</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{player.preferredTime}</Text>
              <Text style={styles.statLabel}>Plays</Text>
            </View>
          </View>
        </View>

        {/* Top clubs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Regular clubs</Text>
          {player.topClubs.map((club, i) => (
            <View key={i} style={styles.clubRow}>
              <View style={styles.clubDot} />
              <Text style={styles.clubName}>{club}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action bar — fixed at bottom */}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom + 8 }]}>
        {actioned ? (
          <View style={styles.actionedRow}>
            <Text style={styles.actionedText}>
              {actioned === 'play' ? '🎾 Play request sent!' :
               actioned === 'connect' ? '👋 Connection sent!' :
               '💘 Volley sent — fingers crossed!'}
            </Text>
          </View>
        ) : (
          <View style={styles.actionBtns}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction('play')} activeOpacity={0.8}>
              <Text style={styles.actionBtnEmoji}>🎾</Text>
              <Text style={styles.actionBtnText}>Play again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction('connect')} activeOpacity={0.8}>
              <Text style={styles.actionBtnEmoji}>👋</Text>
              <Text style={styles.actionBtnText}>Connect</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.volleyBtn]} onPress={() => handleAction('volley')} activeOpacity={0.8}>
              <Text style={styles.actionBtnEmoji}>💘</Text>
              <Text style={[styles.actionBtnText, styles.volleyBtnText]}>Volley</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Modals */}
      <ScoreBreakdownModal visible={showScore} onClose={() => setShowScore(false)} player={player} />
      <LevelExplainerModal visible={showLevel} onClose={() => setShowLevel(false)} level={player.level} />
      <ReportModal visible={showReport} onClose={() => setShowReport(false)} name={player.name} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  backBtn: { paddingVertical: 4 },
  backText: { fontSize: 16, color: theme.textSecondary },
  reportBtn: { fontSize: 14, color: theme.textMuted },

  scroll: { paddingHorizontal: 20 },

  heroSection: { alignItems: 'center', paddingVertical: 20 },
  avatarLarge: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: theme.primaryDim, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: theme.primaryBorder, marginBottom: 14,
  },
  avatarEmoji: { fontSize: 46 },
  playerName: { fontSize: 26, fontWeight: '800', color: theme.textPrimary, marginBottom: 4 },
  playerCity: { fontSize: 14, color: theme.textMuted, marginBottom: 10 },
  playerBio: { fontSize: 15, color: theme.textSecondary, fontStyle: 'italic', textAlign: 'center', lineHeight: 22, marginBottom: 12 },
  badgeRow: { flexDirection: 'row', gap: 8 },
  intentBadge: {
    backgroundColor: theme.secondaryDim, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: theme.secondaryBorder,
  },
  intentText: { fontSize: 13, color: '#A78BFA', fontWeight: '600' },

  scoreRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  levelCard: {
    flex: 1, backgroundColor: theme.bgCard, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: theme.border, alignItems: 'center',
  },
  levelValue: { fontSize: 28, fontWeight: '800', color: theme.primary, marginBottom: 4 },
  levelLabel: { fontSize: 12, color: theme.textMuted, marginBottom: 6, textAlign: 'center' },
  levelTap: { fontSize: 11, color: theme.primary, opacity: 0.7 },
  volpairScoreCard: {
    flex: 1, backgroundColor: theme.primaryDim, borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: theme.primaryBorder, alignItems: 'center',
  },
  volpairScoreValue: { fontSize: 36, fontWeight: '800', color: theme.primary, marginBottom: 4 },
  volpairScoreLabel: { fontSize: 12, color: theme.primary, marginBottom: 6, opacity: 0.8 },
  volpairScoreTap: { fontSize: 11, color: theme.primary, opacity: 0.7 },

  section: {
    backgroundColor: theme.bgCard, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: theme.border,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: theme.textSecondary, marginBottom: 14 },

  historyRow: { flexDirection: 'row', marginBottom: 12 },
  historyItem: { flex: 1, alignItems: 'center' },
  historyValue: { fontSize: 24, fontWeight: '800', color: theme.textPrimary, marginBottom: 4 },
  historyLabel: { fontSize: 12, color: theme.textMuted },
  historyDivider: { width: 1, backgroundColor: theme.border },
  lastPlayedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lastPlayedIcon: { fontSize: 14 },
  lastPlayedText: { fontSize: 13, color: theme.textSecondary },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBox: {
    width: '47%', backgroundColor: theme.bgDeep, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: theme.border,
  },
  statValue: { fontSize: 18, fontWeight: '800', color: theme.textPrimary, marginBottom: 3 },
  statLabel: { fontSize: 11, color: theme.textMuted },

  clubRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  clubDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.primary },
  clubName: { fontSize: 14, color: theme.textPrimary },

  actionBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: theme.bgCard, borderTopWidth: 1, borderTopColor: theme.border,
    paddingHorizontal: 16, paddingTop: 12,
  },
  actionBtns: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, borderRadius: 14,
    backgroundColor: theme.bgDeep, borderWidth: 1, borderColor: theme.border,
  },
  volleyBtn: { backgroundColor: theme.secondaryDim, borderColor: theme.secondaryBorder },
  actionBtnEmoji: { fontSize: 16 },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: theme.textSecondary },
  volleyBtnText: { color: '#A78BFA' },
  actionedRow: { alignItems: 'center', paddingVertical: 14 },
  actionedText: { fontSize: 15, color: theme.primary, fontWeight: '700' },
});

const modal = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: theme.border,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: theme.border,
    alignSelf: 'center', marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '800', color: theme.textPrimary, marginBottom: 16, textAlign: 'center' },

  // Score breakdown
  scoreBig: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginBottom: 8 },
  scoreBigValue: { fontSize: 52, fontWeight: '800', color: theme.primary },
  scoreBigLabel: { fontSize: 18, color: theme.textMuted },
  scoreDesc: { fontSize: 13, color: theme.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  dimRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  dimLabel: { fontSize: 13, color: theme.textSecondary, width: 90 },
  barBg: { flex: 1, height: 6, backgroundColor: theme.bgDeep, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  dimValue: { fontSize: 12, fontWeight: '700', width: 36, textAlign: 'right' },

  // Level explainer
  explainerText: { fontSize: 14, color: theme.textSecondary, lineHeight: 22, marginBottom: 20 },
  levelScale: { gap: 8, marginBottom: 20 },
  levelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.bgDeep, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: theme.border,
  },
  levelRowHighlight: { backgroundColor: theme.primaryDim, borderColor: theme.primaryBorder },
  levelRange: { fontSize: 13, fontWeight: '700', color: theme.textMuted, width: 70 },
  levelLbl: { flex: 1, fontSize: 13, color: theme.textMuted },
  levelYou: { fontSize: 12, color: theme.primary, fontWeight: '700' },

  // Report
  reportSub: { fontSize: 14, color: theme.textMuted, marginBottom: 16 },
  reportRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: 12, marginBottom: 8,
    backgroundColor: theme.bgDeep, borderWidth: 1, borderColor: theme.border,
  },
  reportRowSelected: { borderColor: '#F87171', backgroundColor: 'rgba(248,113,113,0.08)' },
  reportReason: { fontSize: 14, color: theme.textMuted },
  reportCheck: { fontSize: 16, color: '#F87171' },
  submitBtn: {
    backgroundColor: '#F87171', borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 8, marginBottom: 12,
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  closeBtn: {
    backgroundColor: theme.bgDeep, borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 16,
    borderWidth: 1, borderColor: theme.border,
  },
  closeBtnText: { color: theme.textSecondary, fontSize: 15, fontWeight: '600' },
  cancelText: { textAlign: 'center', color: theme.textMuted, fontSize: 14, paddingVertical: 8 },
});
