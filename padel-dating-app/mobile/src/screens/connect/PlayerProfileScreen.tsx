import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  StatusBar, Alert, Modal, ActivityIndicator, Image,
  Dimensions, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, fonts } from '../../lib/theme';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { notifyVolley } from '../../lib/notifications';
import { ScreenBackground } from '../../components/ScreenBackground';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_HEIGHT; // full screen hero

function levelLabel(v: number) {
  if (v >= 5.5) return 'Elite';
  if (v >= 5.0) return 'Advanced+';
  if (v >= 4.5) return 'Advanced';
  if (v >= 4.0) return 'Competitive';
  if (v >= 3.5) return 'Intermediate+';
  if (v >= 3.0) return 'Intermediate';
  return 'Beginner';
}

function platformLabel(platform: string): string {
  switch (platform) {
    case 'playtomic': return 'Playtomic';
    case 'on_the_court': return 'On The Court';
    case 'matchi': return 'Matchi';
    default: return platform;
  }
}

// ─── Demo data ────────────────────────────────────────────────────────────────
const DEMO_PROFILE = {
  id: 'demo',
  full_name: 'Carlos Ruiz',
  city: 'Manchester',
  bio: 'Ex-competitive squash player turned padel addict. Left wall is my weapon. Looking for doubles partners and good vibes on court.',
  looking_for: 'both',
  photos: [
    'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&q=80',
    'https://images.unsplash.com/photo-1599586120429-48281b6f0ece?w=800&q=80',
    'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=800&q=80',
  ] as string[],
  videos: [] as string[],
  gender: 'male',
  home_club_name: 'On The Court — Manchester',
};
const DEMO_STATS = {
  platform: 'playtomic',
  level_value: 4.35,
  total_matches: 87,
  win_rate: 0.61,
  play_style: 'aggressive',
  preferred_time_of_day: 'evening',
  top_clubs: [
    { club_name: 'On The Court Manchester', play_count: 34 },
    { club_name: 'Padel Haus Salford', play_count: 21 },
    { club_name: 'Better Padel Ancoats', play_count: 14 },
  ],
};
const DEMO_SCORE = {
  total_score: 91,
  skill_score: 23,
  style_score: 18,
  availability_score: 17,
  location_score: 14,
  chemistry_score: 10,
  proximity_score: 9,
  matches_together: 3,
};
const DEMO_MATCHES_TOGETHER = 3;
const DEMO_LAST_CLUB = 'On The Court Manchester';

// ─── Full-screen photo lightbox ───────────────────────────────────────────────
function PhotoLightbox({ visible, photos, startIndex, onClose }: {
  visible: boolean; photos: string[]; startIndex: number; onClose: () => void;
}) {
  const [current, setCurrent] = useState(startIndex);
  const flatRef = useRef<FlatList>(null);
  useEffect(() => {
    if (visible) {
      setCurrent(startIndex);
      setTimeout(() => flatRef.current?.scrollToIndex({ index: startIndex, animated: false }), 50);
    }
  }, [visible, startIndex]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={lightbox.overlay}>
        <TouchableOpacity style={lightbox.closeBtn} onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={lightbox.closeText}>✕</Text>
        </TouchableOpacity>
        <Text style={lightbox.counter}>{current + 1} / {photos.length}</Text>
        <FlatList
          ref={flatRef}
          data={photos}
          keyExtractor={(_, i) => String(i)}
          horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          initialScrollIndex={startIndex}
          getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
          onMomentumScrollEnd={e => setCurrent(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))}
          renderItem={({ item }) => (
            <View style={lightbox.slide}>
              <Image source={{ uri: item }} style={lightbox.image} resizeMode="contain" />
            </View>
          )}
        />
        <View style={lightbox.dots}>
          {photos.map((_, i) => <View key={i} style={[lightbox.dot, i === current && lightbox.dotActive]} />)}
        </View>
      </View>
    </Modal>
  );
}

// ─── Full Profile bottom sheet ────────────────────────────────────────────────
function FullProfileSheet({ visible, onClose, profile, stats, volpairScore, matchesTogether, lastClub, onShowScore, onShowLevel }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={sheet.overlay}>
        <TouchableOpacity style={sheet.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={sheet.container}>
          <View style={sheet.handle} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={sheet.scroll}>

            {/* Bio */}
            {profile?.bio && (
              <View style={sheet.section}>
                <Text style={sheet.sectionTitle}>About</Text>
                <Text style={sheet.bio}>"{profile.bio}"</Text>
              </View>
            )}

            {/* Court history */}
            {matchesTogether > 0 && (
              <View style={sheet.section}>
                <Text style={sheet.sectionTitle}>🤝 Court history together</Text>
                <View style={sheet.historyRow}>
                  <View style={sheet.historyItem}>
                    <Text style={sheet.historyValue}>{matchesTogether}</Text>
                    <Text style={sheet.historyLabel}>matches played</Text>
                  </View>
                  {volpairScore?.chemistry_score != null && (
                    <>
                      <View style={sheet.historyDivider} />
                      <View style={sheet.historyItem}>
                        <Text style={sheet.historyValue}>{volpairScore.chemistry_score * 10}%</Text>
                        <Text style={sheet.historyLabel}>chemistry score</Text>
                      </View>
                    </>
                  )}
                </View>
                {lastClub && (
                  <View style={sheet.lastPlayedRow}>
                    <Text style={sheet.lastPlayedIcon}>🏟</Text>
                    <Text style={sheet.lastPlayedText}>Last played at {lastClub}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Stats */}
            {stats && (
              <View style={sheet.section}>
                <Text style={sheet.sectionTitle}>📊 Stats</Text>
                <View style={sheet.statsGrid}>
                  <View style={sheet.statBox}>
                    <Text style={sheet.statValue}>{stats.total_matches ?? '—'}</Text>
                    <Text style={sheet.statLabel}>Matches</Text>
                  </View>
                  <View style={sheet.statBox}>
                    <Text style={sheet.statValue}>
                      {stats.win_rate != null ? `${Math.round(stats.win_rate * 100)}%` : '—'}
                    </Text>
                    <Text style={sheet.statLabel}>Win rate</Text>
                  </View>
                  <View style={sheet.statBox}>
                    <Text style={sheet.statValue}>
                      {stats.play_style
                        ? stats.play_style.charAt(0).toUpperCase() + stats.play_style.slice(1).replace('_', ' ')
                        : '—'}
                    </Text>
                    <Text style={sheet.statLabel}>Play style</Text>
                  </View>
                  <View style={sheet.statBox}>
                    <Text style={sheet.statValue}>
                      {stats.preferred_time_of_day
                        ? stats.preferred_time_of_day.charAt(0).toUpperCase() + stats.preferred_time_of_day.slice(1)
                        : '—'}
                    </Text>
                    <Text style={sheet.statLabel}>Plays</Text>
                  </View>
                </View>
                <TouchableOpacity style={sheet.explainerLink} onPress={onShowLevel}>
                  <Text style={sheet.explainerLinkText}>What does level {stats.level_value?.toFixed(2)} mean? →</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Regular clubs */}
            {stats?.top_clubs?.length > 0 && (
              <View style={sheet.section}>
                <Text style={sheet.sectionTitle}>📍 Regular clubs</Text>
                {stats.top_clubs.slice(0, 3).map((club: any, i: number) => (
                  <View key={i} style={sheet.clubRow}>
                    <View style={sheet.clubDot} />
                    <Text style={sheet.clubName}>{club.club_name}</Text>
                    <Text style={sheet.clubCount}>{club.play_count} matches</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Volpair score breakdown link */}
            {volpairScore && (
              <TouchableOpacity style={sheet.scoreBreakdownBtn} onPress={onShowScore}>
                <Text style={sheet.scoreBreakdownText}>🎯 See Volpair Score breakdown →</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Score breakdown modal ─────────────────────────────────────────────────────
function ScoreBreakdownModal({ visible, onClose, score }: any) {
  if (!score) return null;
  const dims = [
    { label: 'Skill match',  value: score.skill_score,         max: 25, color: theme.primary },
    { label: 'Play style',   value: score.style_score,         max: 20, color: theme.primary },
    { label: 'Availability', value: score.availability_score,  max: 20, color: '#F59E0B' },
    { label: 'Location',     value: score.location_score,      max: 15, color: theme.primary },
    { label: 'Chemistry',    value: score.chemistry_score,     max: 10, color: '#A78BFA' },
    { label: 'Circle',       value: score.proximity_score,     max: 10, color: '#A78BFA' },
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
          <Text style={modal.scoreDesc}>Based on your real court history and compatible play patterns.</Text>
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

function LevelExplainerModal({ visible, onClose, level }: any) {
  const lvl = level ?? 0;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.handle} />
          <Text style={modal.title}>What does {lvl?.toFixed(2)} mean?</Text>
          <Text style={modal.explainerText}>
            Your level is calculated from actual match results — wins, losses, opponent levels, and set scores. It updates after every match.
          </Text>
          <View style={modal.levelScale}>
            {[
              { range: '1.0–2.5', label: 'Beginner',      min: 0,   max: 2.5 },
              { range: '2.5–3.5', label: 'Intermediate',  min: 2.5, max: 3.5 },
              { range: '3.5–4.5', label: 'Competitive',   min: 3.5, max: 4.5 },
              { range: '4.5–5.5', label: 'Advanced',      min: 4.5, max: 5.5 },
              { range: '5.5–7.0', label: 'Elite',         min: 5.5, max: 7.0 },
            ].map((l, i) => {
              const highlight = lvl >= l.min && lvl < l.max;
              return (
                <View key={i} style={[modal.levelRow, highlight && modal.levelRowHighlight]}>
                  <Text style={[modal.levelRange, highlight && { color: theme.primary }]}>{l.range}</Text>
                  <Text style={[modal.levelLbl,   highlight && { color: theme.primary }]}>{l.label}</Text>
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

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function PlayerProfileScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { userId } = route.params ?? {};
  const isDemo = !userId || userId === 'demo';

  const [loading, setLoading]               = useState(!isDemo);
  const [profile, setProfile]               = useState<any>(isDemo ? DEMO_PROFILE : null);
  const [stats, setStats]                   = useState<any>(isDemo ? DEMO_STATS : null);
  const [volpairScore, setVolpairScore]     = useState<any>(isDemo ? DEMO_SCORE : null);
  const [matchesTogether, setMatchesTogether] = useState(isDemo ? DEMO_MATCHES_TOGETHER : 0);
  const [lastClub, setLastClub]             = useState<string | null>(isDemo ? DEMO_LAST_CLUB : null);
  const [myAction, setMyAction]             = useState<string | null>(null);

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex]   = useState<number | null>(null);
  const [showScore, setShowScore]           = useState(false);
  const [showLevel, setShowLevel]           = useState(false);
  const [showReport, setShowReport]         = useState(false);
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [isBlocked, setIsBlocked]             = useState(false);

  useEffect(() => {
    if (!isDemo && userId) {
      // Reset state before loading real profile
      setProfile(null);
      setStats(null);
      setVolpairScore(null);
      setMatchesTogether(0);
      setLastClub(null);
      load();
    }
  }, [userId]);

  const load = async () => {
    setLoading(true);
    try {
      const { data: p } = await supabase
        .from('users')
        .select('id, full_name, city, bio, looking_for, photos, videos, gender, home_club_name')
        .eq('id', userId).maybeSingle();

      if (!p) {
        // User not found — fall back to demo profile
        setProfile(DEMO_PROFILE); setStats(DEMO_STATS); setVolpairScore(DEMO_SCORE);
        setMatchesTogether(DEMO_MATCHES_TOGETHER); setLastClub(DEMO_LAST_CLUB);
        setLoading(false); return;
      }
      setProfile(p);

      const { data: s } = await supabase.from('player_stats').select('*')
        .eq('user_id', userId).eq('platform', 'playtomic').maybeSingle();
      setStats(s);

      if (user?.id) {
        const [a, b] = [user.id, userId].sort();
        const { data: vs } = await supabase.from('volpair_scores').select('*')
          .eq('user_a_id', a).eq('user_b_id', b).maybeSingle();
        setVolpairScore(vs);

        const { data: myMatches }    = await supabase.from('match_players').select('match_id').eq('user_id', user.id);
        const { data: theirMatches } = await supabase.from('match_players')
          .select('match_id, matches(tenant_name, played_at)').eq('user_id', userId);

        const myMatchIds = new Set((myMatches ?? []).map((r: any) => r.match_id));
        const shared = (theirMatches ?? []).filter((r: any) => myMatchIds.has(r.match_id));
        setMatchesTogether(shared.length);
        if (shared.length > 0) {
          const sorted = shared.sort((a: any, b: any) =>
            new Date(b.matches?.played_at ?? 0).getTime() - new Date(a.matches?.played_at ?? 0).getTime());
          setLastClub(sorted[0]?.matches?.tenant_name ?? null);
        }

        const { data: existingConn } = await supabase.from('connections').select('action_type')
          .eq('sender_id', user.id).eq('receiver_id', userId).in('status', ['pending', 'accepted']).maybeSingle();
        if (existingConn) setMyAction(existingConn.action_type);
      }
    } catch (e) { console.error('PlayerProfileScreen load error:', e); }
    finally { setLoading(false); }
  };

  const handleAction = async (type: 'play_again' | 'connect' | 'volley') => {
    if (isDemo) { setMyAction(type); return; }
    if (!user?.id || !userId) return;
    try {
      await supabase.from('connections').insert({ sender_id: user.id, receiver_id: userId, action_type: type });
      setMyAction(type);
      if (type === 'volley') await notifyVolley(userId, user.full_name ?? 'Someone');
    } catch (e) { console.error('action error:', e); }
  };

  const handleBlock = () => {
    if (isDemo || !user?.id || !userId) return;
    const name = profile?.full_name?.split(' ')[0] ?? 'this player';
    Alert.alert(
      'Block ' + name + '?',
      'They will no longer be able to see your profile or send you Serves. You can unblock them in Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block', style: 'destructive',
          onPress: async () => {
            try {
              await supabase.from('blocks').upsert(
                { blocker_id: user.id, blocked_id: userId },
                { onConflict: 'blocker_id,blocked_id' }
              );
              setIsBlocked(true);
              Alert.alert('Blocked', name + ' has been blocked.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (e) { Alert.alert('Error', 'Could not block. Please try again.'); }
          },
        },
      ]
    );
  };

  const handleMoreOptions = () => {
    Alert.alert(
      'Options',
      undefined,
      [
        { text: 'Report profile', onPress: () => setShowReport(true) },
        { text: 'Block user', style: 'destructive', onPress: handleBlock },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const firstName = profile?.full_name?.split(' ')[0] ?? (stats?.level_value ? `Level ${stats.level_value.toFixed(1)}` : 'Player');
  const displayName = profile?.full_name ?? (stats?.level_value ? `Level ${stats.level_value.toFixed(1)} Player` : 'Player');
  const photos: string[] = profile?.photos ?? [];

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={{flex:1, backgroundColor:'#000'}}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Hero photo — large, edge to edge ── */}
      <View style={styles.heroContainer}>
        {photos.length > 0 ? (
          <FlatList
            data={photos}
            keyExtractor={(_, i) => String(i)}
            horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={e => setActivePhotoIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))}
            renderItem={({ item, index }) => (
              <TouchableOpacity activeOpacity={0.95} onPress={() => setLightboxIndex(index)} style={styles.heroSlide}>
                <Image source={{ uri: item }} style={styles.heroImage} resizeMode="cover" />
              </TouchableOpacity>
            )}
          />
        ) : (
          <View style={[styles.heroSlide, { backgroundColor: theme.bgCard, alignItems: 'center', justifyContent: 'center' }]}>
            <View style={styles.initialsCircle}>
              <Text style={styles.initialsText}>
                {(profile?.full_name ?? 'P').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </Text>
            </View>
          </View>
        )}

        {/* deep gradient at bottom of photo for overlay readability */}
        <View style={styles.heroGradient} pointerEvents="none" />

        {/* photo progress dots — top center */}
        {photos.length > 1 && (
          <View style={styles.photoDots} pointerEvents="none">
            {photos.map((_, i) => (
              <View
                key={i}
                style={[styles.photoDot, i === activePhotoIndex && styles.photoDotActive]}
              />
            ))}
          </View>
        )}



        {/* ── Identity overlay — bottom of photo ── */}
        <View style={[styles.heroIdentity, { bottom: insets.bottom + 94 }]}>
          {/* Top row: left = name+level, right = score box */}
          <View style={styles.heroTopRow}>
            <View style={styles.heroLeft}>
              <View style={styles.heroNameRow}>
                <Text style={styles.heroName}>{firstName}</Text>
                {stats?.level_value && (
                  <View style={styles.heroLevelPill}>
                    <Text style={styles.heroLevelText}>{stats.level_value.toFixed(2)}</Text>
                  </View>
                )}
              </View>
              {stats?.level_value && (
                <Text style={styles.heroLevelDesc}>{levelLabel(stats.level_value)}{stats.platform && stats.platform !== 'self_reported' ? ` · ${platformLabel(stats.platform)}` : ''}</Text>
              )}
            </View>

            {/* Compact Volpair Score box — top right */}
            <TouchableOpacity
              style={styles.heroScoreBox}
              onPress={() => volpairScore && setShowScore(true)}
              activeOpacity={volpairScore ? 0.8 : 1}
              >
              <Text style={styles.heroScoreLabel}>Volpair</Text>
              <Text style={styles.heroScoreValue}>{volpairScore?.total_score ?? '—'}</Text>
            </TouchableOpacity>
          </View>

          {/* City */}
          {profile?.city && (
            <Text style={styles.heroCity}>📍 {profile.city}</Text>
          )}

          {/* Home club badge */}
          {profile?.home_club_name && (
            <View style={styles.heroClubBadge}>
              <Text style={styles.heroClubText}>🏟️ {profile.home_club_name}</Text>
            </View>
          )}

          {/* Intent badge */}
          {(profile?.looking_for === 'date' || profile?.looking_for === 'both') && (
            <View style={styles.heroIntentBadge}>
              <Text style={styles.heroIntentText}>
                {profile.looking_for === 'both' ? '💘 Open to dating' : '💘 Looking to date'}
              </Text>
            </View>
          )}

          {/* ── CTAs inside overlay ── */}
          <View style={styles.heroCtaSpacer} />
          {myAction ? (
            <View style={styles.actionedRow}>
              <Text style={styles.actionedText}>
                {myAction === 'play_again' ? '🎾 Play request sent!' :
                 myAction === 'connect'    ? '👋 Connection sent!'   :
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

          {/* View full profile */}
          <TouchableOpacity
            style={styles.viewProfileBtn}
            onPress={() => setShowFullProfile(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.viewProfileText}>View full profile ↓</Text>
          </TouchableOpacity>
        </View>

        {/* ── Back + Report floating top ── */}
        <View style={[styles.topBar, { top: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.floatBtn}>
            <Text style={styles.floatBtnText}>←</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {isDemo && (
              <View style={styles.demoPill}>
                <Text style={styles.demoPillText}>✨ Demo</Text>
              </View>
            )}
            <TouchableOpacity onPress={handleMoreOptions} style={styles.floatBtn}>
              <Text style={styles.floatBtnText}>⋯</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>




      {/* ── Modals ── */}
      <FullProfileSheet
        visible={showFullProfile}
        onClose={() => setShowFullProfile(false)}
        profile={profile}
        stats={stats}
        volpairScore={volpairScore}
        matchesTogether={matchesTogether}
        lastClub={lastClub}
        onShowScore={() => { setShowFullProfile(false); setTimeout(() => setShowScore(true), 300); }}
        onShowLevel={() => { setShowFullProfile(false); setTimeout(() => setShowLevel(true), 300); }}
      />
      <ScoreBreakdownModal visible={showScore} onClose={() => setShowScore(false)} score={volpairScore} />
      <LevelExplainerModal visible={showLevel} onClose={() => setShowLevel(false)} level={stats?.level_value} />
      <ReportModal visible={showReport} onClose={() => setShowReport(false)} name={firstName} />
      <PhotoLightbox
        visible={lightboxIndex !== null}
        photos={photos}
        startIndex={lightboxIndex ?? 0}
        onClose={() => setLightboxIndex(null)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', flexDirection: 'column', overflow: 'hidden' },

  // Hero
  heroContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  heroSlide: { width: SCREEN_WIDTH, height: HERO_HEIGHT },
  heroImage: { width: SCREEN_WIDTH, height: HERO_HEIGHT },

  // Deep gradient — taller and darker so overlay text is always readable
  heroGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: HERO_HEIGHT * 0.55,
    // Simulated gradient: transparent → very dark at bottom
    backgroundColor: 'transparent',
    // We layer two views to fake a gradient
  },

  photoDots: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    left: 0,
    right: 0,
    justifyContent: 'center',
  },
  photoDot: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  photoDotActive: {
    backgroundColor: '#00D4C8',
  },

  heroDots: {
    position: 'absolute', bottom: SCREEN_HEIGHT * 0.13, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 5,
  },
  heroDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  heroDotActive: { backgroundColor: '#fff', width: 18 },

  // Identity overlay — bottom-left on photo
  heroIdentity: {
    position: 'absolute', bottom: SCREEN_HEIGHT * 0.10, left: 0, right: 0,
    paddingHorizontal: 18, paddingTop: 48, paddingBottom: 24,
    backgroundColor: 'rgba(8,16,28,0.85)',
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  heroLeft: { flex: 1, marginRight: 10 },
  heroScoreBox: {
    backgroundColor: 'rgba(0,212,200,0.2)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,212,200,0.45)',
    paddingHorizontal: 10, paddingVertical: 8,
    alignItems: 'center', minWidth: 58,
  },
  heroScoreLabel: { fontSize: 10, fontFamily: fonts.bodyBold, color: 'rgba(0,212,200,0.9)', marginBottom: 2 },
  heroScoreValue: { fontSize: 26, fontFamily: fonts.headlineLightIt, color: '#FFFFFF', lineHeight: 28 },
  heroNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  heroName: { fontSize: 30, fontFamily: fonts.headlineBold, color: '#FFFFFF' },
  heroLevelPill: {
    backgroundColor: 'rgba(0,212,200,0.25)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(0,212,200,0.5)',
  },
  heroLevelText: { fontSize: 14, fontFamily: fonts.headlineLightIt, color: '#FFFFFF' },
  heroLevelDesc: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 4, fontFamily: fonts.bodyLight },
  heroCity: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 6, fontFamily: fonts.bodyLight },
  heroClubBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,212,200,0.15)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(0,212,200,0.3)',
    marginBottom: 6,
  },
  heroClubText: { fontSize: 12, fontFamily: fonts.bodyBold, color: theme.primary },
  heroIntentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(124,58,237,0.2)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.4)',
  },
  heroIntentText: { fontSize: 12, color: '#C4B5FD', fontFamily: fonts.bodyBold },
  heroCtaSpacer: { height: 12 },

  // Floating top bar
  topBar: {
    position: 'absolute', left: 16, right: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    zIndex: 10,
  },
  floatBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  floatBtnText: { color: '#fff', fontSize: 18, fontFamily: fonts.bodyBold },
  demoPill: {
    backgroundColor: 'rgba(0,212,200,0.2)', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(0,212,200,0.4)',
  },
  demoPillText: { fontSize: 11, color: theme.primary, fontFamily: fonts.bodyBold },

  // Below hero
  belowHero: {
    flex: 0,
    backgroundColor: theme.bg,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },

  initialsCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: theme.primaryDim,
    borderWidth: 3, borderColor: theme.primaryBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  initialsText: { fontSize: 38, fontFamily: fonts.headlineBold, color: theme.primary },

  // Volpair score card
  volpairCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.primaryDim, borderRadius: 18, padding: 16,
    borderWidth: 1.5, borderColor: theme.primaryBorder,
    marginBottom: 6,
  },
  volpairCardLeft: { flex: 1 },
  volpairLabel: { fontSize: 15, fontFamily: fonts.headlineBold, color: '#FFFFFF', marginBottom: 2 },
  volpairSub: { fontSize: 12, color: 'rgba(0,212,200,0.85)', fontFamily: fonts.bodyLight },
  volpairTap: { fontSize: 11, color: 'rgba(0,212,200,0.65)', marginTop: 3, fontFamily: fonts.bodyLight },
  volpairValue: { fontSize: 44, fontFamily: fonts.headlineLightIt, color: '#FFFFFF' },

  // View full profile button
  viewProfileBtn: {
    alignSelf: 'center', marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20, paddingHorizontal: 22, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  viewProfileText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: fonts.bodyBold },

  // CTA bar
  actionBar: {
    backgroundColor: theme.bgCard,
    borderTopWidth: 1, borderTopColor: theme.border,
    paddingTop: 8, paddingHorizontal: 16,
  },
  actionBtns: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 9, borderRadius: 12,
    backgroundColor: theme.bgDeep, borderWidth: 1, borderColor: theme.border,
  },
  volleyBtn: { backgroundColor: theme.secondaryDim, borderColor: theme.secondaryBorder },
  actionBtnEmoji: { fontSize: 16 },
  actionBtnText: { fontSize: 13, fontFamily: fonts.bodyBold, color: theme.textSecondary },
  volleyBtnText: { color: '#A78BFA' },
  actionedRow: { alignItems: 'center', paddingVertical: 12 },
  actionedText: { fontSize: 15, color: theme.primary, fontFamily: fonts.bodyBold },
});

// ─── Full profile sheet styles ─────────────────────────────────────────────────
const sheet = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  container: {
    backgroundColor: theme.bgCard,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.82,
    borderWidth: 1, borderColor: theme.border,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: theme.border,
    alignSelf: 'center', marginTop: 14, marginBottom: 6,
  },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },

  section: {
    backgroundColor: theme.bgDeep, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: theme.border,
  },
  sectionTitle: { fontSize: 14, fontFamily: fonts.bodyBold, color: theme.textSecondary, marginBottom: 12 },

  bio: { fontSize: 15, color: theme.textSecondary, fontStyle: 'italic', lineHeight: 22, fontFamily: fonts.bodyLight },

  historyRow: { flexDirection: 'row', marginBottom: 12 },
  historyItem: { flex: 1, alignItems: 'center' },
  historyValue: { fontSize: 24, fontFamily: fonts.headlineLightIt, color: theme.textPrimary, marginBottom: 4 },
  historyLabel: { fontSize: 12, color: theme.textMuted, fontFamily: fonts.bodyLight },
  historyDivider: { width: 1, backgroundColor: theme.border },
  lastPlayedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lastPlayedIcon: { fontSize: 14 },
  lastPlayedText: { fontSize: 13, color: theme.textSecondary, fontFamily: fonts.bodyLight },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  statBox: {
    width: '47%', backgroundColor: theme.bgCard, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: theme.border,
  },
  statValue: { fontSize: 18, fontFamily: fonts.headlineLightIt, color: theme.textPrimary, marginBottom: 3 },
  statLabel: { fontSize: 11, color: theme.textMuted, fontFamily: fonts.bodyLight },
  explainerLink: { marginTop: 4 },
  explainerLinkText: { fontSize: 12, color: theme.primary, fontFamily: fonts.bodyBold },

  clubRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  clubDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.primary },
  clubName: { flex: 1, fontSize: 14, color: theme.textPrimary, fontFamily: fonts.bodyLight },
  clubCount: { fontSize: 12, color: theme.textMuted, fontFamily: fonts.bodyLight },

  scoreBreakdownBtn: {
    backgroundColor: theme.primaryDim, borderRadius: 14, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: theme.primaryBorder, marginBottom: 8,
  },
  scoreBreakdownText: { fontSize: 14, color: theme.primary, fontFamily: fonts.bodyBold },
});

// ─── Lightbox styles ──────────────────────────────────────────────────────────
const lightbox = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  slide: { width: SCREEN_WIDTH, height: '100%' as any, justifyContent: 'center' },
  image: { width: SCREEN_WIDTH, height: '100%' as any },
  closeBtn: {
    position: 'absolute', top: 56, right: 20, zIndex: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeText: { color: '#fff', fontSize: 18, fontFamily: fonts.bodyBold },
  counter: {
    position: 'absolute', top: 60, left: 20, zIndex: 10,
    color: 'rgba(255,255,255,0.7)', fontSize: 14, fontFamily: fonts.bodyBold,
  },
  dots: {
    position: 'absolute', bottom: 48, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive: { backgroundColor: '#fff', width: 18 },
});

// ─── Score/Level/Report modal styles ─────────────────────────────────────────
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
  title: { fontSize: 20, fontFamily: fonts.headlineBold, color: theme.textPrimary, marginBottom: 16, textAlign: 'center' },
  scoreBig: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginBottom: 8 },
  scoreBigValue: { fontSize: 52, fontFamily: fonts.headlineLightIt, color: '#FFFFFF' },
  scoreBigLabel: { fontSize: 18, color: theme.textMuted, fontFamily: fonts.bodyLight },
  scoreDesc: { fontSize: 13, color: theme.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 20, fontFamily: fonts.bodyLight },
  dimRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  dimLabel: { fontSize: 13, color: theme.textSecondary, width: 90, fontFamily: fonts.bodyLight },
  barBg: { flex: 1, height: 6, backgroundColor: theme.bgDeep, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  dimValue: { fontSize: 12, fontFamily: fonts.bodyBold, width: 48, textAlign: 'right' },
  explainerText: { fontSize: 14, color: theme.textSecondary, lineHeight: 22, marginBottom: 20, fontFamily: fonts.bodyLight },
  levelScale: { gap: 8, marginBottom: 20 },
  levelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.bgDeep, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: theme.border,
  },
  levelRowHighlight: { backgroundColor: theme.primaryDim, borderColor: theme.primaryBorder },
  levelRange: { fontSize: 13, fontFamily: fonts.bodyBold, color: theme.textMuted, width: 70 },
  levelLbl: { flex: 1, fontSize: 13, color: theme.textMuted, fontFamily: fonts.bodyLight },
  levelYou: { fontSize: 12, color: theme.primary, fontFamily: fonts.bodyBold },
  reportSub: { fontSize: 14, color: theme.textMuted, marginBottom: 16, fontFamily: fonts.bodyLight },
  reportRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: 12, marginBottom: 8,
    backgroundColor: theme.bgDeep, borderWidth: 1, borderColor: theme.border,
  },
  reportRowSelected: { borderColor: '#F87171', backgroundColor: 'rgba(248,113,113,0.08)' },
  reportReason: { fontSize: 14, color: theme.textMuted, fontFamily: fonts.bodyLight },
  reportCheck: { fontSize: 16, color: '#F87171' },
  submitBtn: {
    backgroundColor: '#F87171', borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 8, marginBottom: 12,
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: fonts.bodyBold },
  closeBtn: {
    backgroundColor: theme.bgDeep, borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 16, borderWidth: 1, borderColor: theme.border,
  },
  closeBtnText: { color: theme.textSecondary, fontSize: 15, fontFamily: fonts.bodyBold },
  cancelText: { textAlign: 'center', color: theme.textMuted, fontSize: 14, paddingVertical: 8, fontFamily: fonts.bodyLight },
});
