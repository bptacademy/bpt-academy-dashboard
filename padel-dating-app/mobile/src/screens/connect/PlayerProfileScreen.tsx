import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  StatusBar, Alert, Modal, ActivityIndicator, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../lib/theme';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { notifyVolley } from '../../lib/notifications';

function levelLabel(v: number) {
  if (v >= 5.5) return 'Elite';
  if (v >= 5.0) return 'Advanced+';
  if (v >= 4.5) return 'Advanced';
  if (v >= 4.0) return 'Competitive';
  if (v >= 3.5) return 'Intermediate+';
  if (v >= 3.0) return 'Intermediate';
  return 'Beginner';
}

// ─── Score Breakdown Modal ────────────────────────────────────────────────────
function ScoreBreakdownModal({ visible, onClose, score }: any) {
  if (!score) return null;
  const dims = [
    { label: 'Skill match', value: score.skill_score, max: 25, color: theme.primary },
    { label: 'Play style', value: score.style_score, max: 20, color: theme.primary },
    { label: 'Availability', value: score.availability_score, max: 20, color: '#F59E0B' },
    { label: 'Location', value: score.location_score, max: 15, color: theme.primary },
    { label: 'Chemistry', value: score.chemistry_score, max: 10, color: '#A78BFA' },
    { label: 'Circle', value: score.proximity_score, max: 10, color: '#A78BFA' },
  ];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.handle} />
          <Text style={modal.title}>Volpair Score</Text>
          <View style={modal.scoreBig}>
            <Text style={modal.scoreBigValue}>{score.total_score}</Text>
            <Text style={modal.scoreBigLabel}>/ 100</Text>
          </View>
          <Text style={modal.scoreDesc}>
            Based on your real court history together and compatible play patterns.
          </Text>
          {dims.map((d, i) => (
            <View key={i} style={modal.dimRow}>
              <Text style={modal.dimLabel}>{d.label}</Text>
              <View style={modal.barBg}>
                <View style={[modal.barFill, { width: `${(d.value / d.max) * 100}%` as any, backgroundColor: d.color }]} />
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

// ─── Level Explainer Modal ────────────────────────────────────────────────────
function LevelExplainerModal({ visible, onClose, level }: any) {
  const lvl = level ?? 0;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.handle} />
          <Text style={modal.title}>What does {lvl?.toFixed(2)} mean?</Text>
          <Text style={modal.explainerText}>
            Playtomic calculates your level from your actual match results — wins, losses, opponent levels, and set scores. It updates after every match.
          </Text>
          <View style={modal.levelScale}>
            {[
              { range: '1.0–2.5', label: 'Beginner', min: 0, max: 2.5 },
              { range: '2.5–3.5', label: 'Intermediate', min: 2.5, max: 3.5 },
              { range: '3.5–4.5', label: 'Competitive', min: 3.5, max: 4.5 },
              { range: '4.5–5.5', label: 'Advanced', min: 4.5, max: 5.5 },
              { range: '5.5–7.0', label: 'Elite', min: 5.5, max: 7.0 },
            ].map((l, i) => {
              const highlight = lvl >= l.min && lvl < l.max;
              return (
                <View key={i} style={[modal.levelRow, highlight && modal.levelRowHighlight]}>
                  <Text style={[modal.levelRange, highlight && { color: theme.primary }]}>{l.range}</Text>
                  <Text style={[modal.levelLbl, highlight && { color: theme.primary }]}>{l.label}</Text>
                  {highlight && <Text style={modal.levelYou}>← you</Text>}
                </View>
              );
            })}
          </View>
          <TouchableOpacity style={modal.closeBtn} onPress={onClose}>
            <Text style={modal.closeBtnText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Report Modal ─────────────────────────────────────────────────────────────
function ReportModal({ visible, onClose, name }: any) {
  const REASONS = ['Inappropriate photos', 'Harassment or abuse', 'Fake profile', 'Spam', 'Other'];
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
          <TouchableOpacity style={[modal.submitBtn, !selected && { opacity: 0.4 }]} onPress={handleSubmit} disabled={!selected}>
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
  const { user } = useAuth();
  const { userId } = route.params ?? {};

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [volpairScore, setVolpairScore] = useState<any>(null);
  const [matchesTogether, setMatchesTogether] = useState(0);
  const [lastClub, setLastClub] = useState<string | null>(null);
  const [myAction, setMyAction] = useState<string | null>(null);

  const [showScore, setShowScore] = useState(false);
  const [showLevel, setShowLevel] = useState(false);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    if (userId) load();
  }, [userId]);

  const load = async () => {
    setLoading(true);
    try {
      // User profile — now includes home_club_name
      const { data: p } = await supabase
        .from('users')
        .select('id, full_name, city, bio, looking_for, photos, gender, home_club_name')
        .eq('id', userId)
        .maybeSingle();
      setProfile(p);

      // Their player stats
      const { data: s } = await supabase
        .from('player_stats')
        .select('*')
        .eq('user_id', userId)
        .eq('platform', 'playtomic')
        .maybeSingle();
      setStats(s);

      // Volpair score between me and them
      if (user?.id) {
        const [a, b] = [user.id, userId].sort();
        const { data: vs } = await supabase
          .from('volpair_scores')
          .select('*')
          .eq('user_a_id', a)
          .eq('user_b_id', b)
          .maybeSingle();
        setVolpairScore(vs);

        // Matches together — find common match IDs
        const { data: myMatches } = await supabase
          .from('match_players')
          .select('match_id')
          .eq('user_id', user.id);

        const { data: theirMatches } = await supabase
          .from('match_players')
          .select('match_id, matches(tenant_name, played_at)')
          .eq('user_id', userId);

        const myMatchIds = new Set((myMatches ?? []).map((r: any) => r.match_id));
        const shared = (theirMatches ?? []).filter((r: any) => myMatchIds.has(r.match_id));
        setMatchesTogether(shared.length);

        if (shared.length > 0) {
          const sorted = shared.sort((a: any, b: any) =>
            new Date(b.matches?.played_at ?? 0).getTime() - new Date(a.matches?.played_at ?? 0).getTime()
          );
          setLastClub(sorted[0]?.matches?.tenant_name ?? null);
        }

        // My existing action toward them
        const { data: existingConn } = await supabase
          .from('connections')
          .select('action_type')
          .eq('sender_id', user.id)
          .eq('receiver_id', userId)
          .in('status', ['pending', 'accepted'])
          .maybeSingle();
        if (existingConn) setMyAction(existingConn.action_type);
      }
    } catch (e) {
      console.error('PlayerProfileScreen load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (type: 'play_again' | 'connect' | 'volley') => {
    if (!user?.id || !userId) return;
    try {
      await supabase.from('connections').insert({
        sender_id: user.id,
        receiver_id: userId,
        action_type: type,
      });
      setMyAction(type);

      if (type === 'volley') {
        await notifyVolley(userId, user.full_name ?? 'Someone');
      }
    } catch (e) {
      console.error('action error:', e);
    }
  };

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Player';
  const mainPhoto = profile?.photos?.[0] ?? null;
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.textMuted }}>Profile not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

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
            {mainPhoto ? (
              <Image source={{ uri: mainPhoto }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <Text style={styles.avatarInitials}>{initials}</Text>
            )}
          </View>
          <Text style={styles.playerName}>{firstName}</Text>
          {profile.city && <Text style={styles.playerCity}>📍 {profile.city}</Text>}

          {/* Home club badge */}
          {profile.home_club_name && (
            <View style={styles.homeClubBadge}>
              <Text style={styles.homeClubIcon}>🏟️</Text>
              <Text style={styles.homeClubName}>{profile.home_club_name}</Text>
            </View>
          )}

          {profile.bio && <Text style={styles.playerBio}>"{profile.bio}"</Text>}
          <View style={styles.badgeRow}>
            {(profile.looking_for === 'date' || profile.looking_for === 'both') && (
              <View style={styles.intentBadge}>
                <Text style={styles.intentText}>
                  {profile.looking_for === 'both' ? '💘 Open to dating' : '💘 Looking to date'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Level + Volpair score */}
        <View style={styles.scoreRow}>
          <TouchableOpacity style={styles.levelCard} onPress={() => setShowLevel(true)} activeOpacity={0.8}>
            <Text style={styles.levelValue}>{stats?.level_value?.toFixed(2) ?? '—'}</Text>
            <Text style={styles.levelLabel}>{stats?.level_value ? levelLabel(stats.level_value) : 'No stats yet'}</Text>
            {stats?.level_value && <Text style={styles.levelTap}>What does this mean? →</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.volpairScoreCard}
            onPress={() => volpairScore && setShowScore(true)}
            activeOpacity={volpairScore ? 0.8 : 1}
          >
            <Text style={styles.volpairScoreValue}>
              {volpairScore?.total_score ?? '—'}
            </Text>
            <Text style={styles.volpairScoreLabel}>Volpair Score</Text>
            {volpairScore && <Text style={styles.volpairScoreTap}>See breakdown →</Text>}
          </TouchableOpacity>
        </View>

        {/* Shared court history */}
        {matchesTogether > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🤝 Your court history</Text>
            <View style={styles.historyRow}>
              <View style={styles.historyItem}>
                <Text style={styles.historyValue}>{matchesTogether}</Text>
                <Text style={styles.historyLabel}>matches together</Text>
              </View>
              {volpairScore?.matches_together != null && (
                <>
                  <View style={styles.historyDivider} />
                  <View style={styles.historyItem}>
                    <Text style={styles.historyValue}>{volpairScore.chemistry_score * 10}%</Text>
                    <Text style={styles.historyLabel}>chemistry</Text>
                  </View>
                </>
              )}
            </View>
            {lastClub && (
              <View style={styles.lastPlayedRow}>
                <Text style={styles.lastPlayedIcon}>🏟</Text>
                <Text style={styles.lastPlayedText}>Last played at {lastClub}</Text>
              </View>
            )}
          </View>
        )}

        {/* Their stats */}
        {stats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Their stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{stats.total_matches ?? '—'}</Text>
                <Text style={styles.statLabel}>Matches</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {stats.win_rate != null ? `${Math.round(stats.win_rate * 100)}%` : '—'}
                </Text>
                <Text style={styles.statLabel}>Win rate</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {stats.play_style
                    ? stats.play_style.charAt(0).toUpperCase() + stats.play_style.slice(1).replace('_', ' ')
                    : '—'}
                </Text>
                <Text style={styles.statLabel}>Play style</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {stats.preferred_time_of_day
                    ? stats.preferred_time_of_day.charAt(0).toUpperCase() + stats.preferred_time_of_day.slice(1)
                    : '—'}
                </Text>
                <Text style={styles.statLabel}>Plays</Text>
              </View>
            </View>
          </View>
        )}

        {/* Top clubs from match history */}
        {stats?.top_clubs?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 Regular clubs</Text>
            {stats.top_clubs.slice(0, 3).map((club: any, i: number) => (
              <View key={i} style={styles.clubRow}>
                <View style={styles.clubDot} />
                <Text style={styles.clubName}>{club.club_name}</Text>
                <Text style={styles.clubCount}>{club.play_count} matches</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action bar */}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom + 8 }]}>
        {myAction ? (
          <View style={styles.actionedRow}>
            <Text style={styles.actionedText}>
              {myAction === 'play_again' ? '🎾 Play request sent!' :
               myAction === 'connect' ? '👋 Connection sent!' :
               '💘 Volley sent — fingers crossed!'}
            </Text>
          </View>
        ) : (
          <View style={styles.actionBtns}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction('play_again')} activeOpacity={0.8}>
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

      <ScoreBreakdownModal visible={showScore} onClose={() => setShowScore(false)} score={volpairScore} />
      <LevelExplainerModal visible={showLevel} onClose={() => setShowLevel(false)} level={stats?.level_value} />
      <ReportModal visible={showReport} onClose={() => setShowReport(false)} name={firstName} />
    </View>
  );
}

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
    borderWidth: 3, borderColor: theme.primaryBorder, marginBottom: 14, overflow: 'hidden',
  },
  avatarImage: { width: 100, height: 100 },
  avatarInitials: { fontSize: 36, fontWeight: '800', color: theme.primary },
  playerName: { fontSize: 26, fontWeight: '800', color: theme.textPrimary, marginBottom: 4 },
  playerCity: { fontSize: 14, color: theme.textMuted, marginBottom: 8 },
  homeClubBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.bgDeep, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: theme.primaryBorder,
    marginBottom: 10,
  },
  homeClubIcon: { fontSize: 14 },
  homeClubName: { fontSize: 13, fontWeight: '700', color: theme.primary },
  playerBio: { fontSize: 15, color: theme.textSecondary, fontStyle: 'italic', textAlign: 'center', lineHeight: 22, marginBottom: 12 },
  badgeRow: { flexDirection: 'row', gap: 8 },
  intentBadge: {
    backgroundColor: theme.secondaryDim, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: theme.secondaryBorder,
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
  clubName: { flex: 1, fontSize: 14, color: theme.textPrimary },
  clubCount: { fontSize: 12, color: theme.textMuted },
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: theme.border,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: theme.border,
    alignSelf: 'center', marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '800', color: theme.textPrimary, marginBottom: 16, textAlign: 'center' },
  scoreBig: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginBottom: 8 },
  scoreBigValue: { fontSize: 52, fontWeight: '800', color: theme.primary },
  scoreBigLabel: { fontSize: 18, color: theme.textMuted },
  scoreDesc: { fontSize: 13, color: theme.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  dimRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  dimLabel: { fontSize: 13, color: theme.textSecondary, width: 90 },
  barBg: { flex: 1, height: 6, backgroundColor: theme.bgDeep, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  dimValue: { fontSize: 12, fontWeight: '700', width: 36, textAlign: 'right' },
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
    alignItems: 'center', marginTop: 16, borderWidth: 1, borderColor: theme.border,
  },
  closeBtnText: { color: theme.textSecondary, fontSize: 15, fontWeight: '600' },
  cancelText: { textAlign: 'center', color: theme.textMuted, fontSize: 14, paddingVertical: 8 },
});
