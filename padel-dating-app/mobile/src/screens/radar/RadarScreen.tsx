import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  Animated, Easing, PanResponder, Dimensions,
  ActivityIndicator, StatusBar, Platform, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { theme, fonts } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RADAR_DIAMETER = Math.min(SCREEN_WIDTH - 64, 300);
const RADAR_RADIUS = RADAR_DIAMETER / 2;
const AVATAR_SIZE = 44;
const PAD = AVATAR_SIZE;
const TOTAL = RADAR_DIAMETER + PAD * 2;

// ─── Types ────────────────────────────────────────────────────────────────────
interface RadarPlayer {
  id: string;
  full_name: string;
  city: string | null;
  last_active_at: string;
  last_lat: number;
  last_lon: number;
  level_value: number | null;
  total_matches: number | null;
  win_rate: number | null;
  play_style: string | null;
  distance_miles: number;
  volpair_score: number | null;
  photo_url: string | null;
  _mockBearing?: number;
  _mockFraction?: number;
}

// ─── Mock players ─────────────────────────────────────────────────────────────
const MOCK_PLAYERS: RadarPlayer[] = [
  { id: 'mock-1', full_name: 'Carlos R.', city: 'London', last_active_at: new Date().toISOString(), last_lat: 0, last_lon: 0, level_value: 4.2, total_matches: 87, win_rate: 0.61, play_style: 'aggressive', distance_miles: 2.1, volpair_score: 78, photo_url: null, _mockBearing: 45, _mockFraction: 0.30 },
  { id: 'mock-2', full_name: 'Sofia M.', city: 'London', last_active_at: new Date().toISOString(), last_lat: 0, last_lon: 0, level_value: 3.8, total_matches: 52, win_rate: 0.54, play_style: 'balanced', distance_miles: 4.8, volpair_score: 91, photo_url: null, _mockBearing: 155, _mockFraction: 0.62 },
  { id: 'mock-3', full_name: 'James T.', city: 'London', last_active_at: new Date().toISOString(), last_lat: 0, last_lon: 0, level_value: 4.7, total_matches: 143, win_rate: 0.72, play_style: 'defensive', distance_miles: 7.2, volpair_score: 65, photo_url: null, _mockBearing: 250, _mockFraction: 0.75 },
];

// ─── Bearing ──────────────────────────────────────────────────────────────────
function getBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1r = lat1 * Math.PI / 180;
  const lat2r = lat2 * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2r);
  const x = Math.cos(lat1r) * Math.sin(lat2r) - Math.sin(lat1r) * Math.cos(lat2r) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

// ─── Player popup ─────────────────────────────────────────────────────────────
function PlayerPopup({ player, onClose, onViewProfile }: {
  player: RadarPlayer; onClose: () => void; onViewProfile: () => void;
}) {
  const initials = player.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const winPct = player.win_rate ? Math.round(player.win_rate * 100) : null;
  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <TouchableOpacity style={popup.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={popup.card}>
          <View style={popup.handle} />
          <View style={popup.avatarRow}>
            <View style={popup.avatarWrap}>
              {player.photo_url
                ? <Image source={{ uri: player.photo_url }} style={popup.avatar} />
                : <View style={popup.avatarFallback}><Text style={popup.avatarInitials}>{initials}</Text></View>}
            </View>
            {player.volpair_score !== null && (
              <View style={popup.scorePill}>
                <Text style={popup.scoreLabel}>VOLPAIR</Text>
                <Text style={popup.scoreValue}>{player.volpair_score}</Text>
              </View>
            )}
          </View>
          <Text style={popup.name}>{player.full_name}</Text>
          {player.city && <Text style={popup.city}>📍 {player.city}</Text>}
          <View style={popup.statsRow}>
            {player.level_value !== null && <View style={popup.stat}><Text style={popup.statValue}>{player.level_value.toFixed(1)}</Text><Text style={popup.statLabel}>Level</Text></View>}
            {player.total_matches !== null && <View style={popup.stat}><Text style={popup.statValue}>{player.total_matches}</Text><Text style={popup.statLabel}>Matches</Text></View>}
            {winPct !== null && <View style={popup.stat}><Text style={popup.statValue}>{winPct}%</Text><Text style={popup.statLabel}>Win rate</Text></View>}
            <View style={popup.stat}><Text style={popup.statValue}>{player.distance_miles.toFixed(1)}</Text><Text style={popup.statLabel}>Miles</Text></View>
          </View>
          {player.play_style && <View style={popup.stylePill}><Text style={popup.styleText}>{player.play_style}</Text></View>}
          <TouchableOpacity style={popup.viewBtn} onPress={onViewProfile}>
            <Text style={popup.viewBtnText}>View full profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={popup.closeBtn} onPress={onClose}>
            <Text style={popup.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Player dot ───────────────────────────────────────────────────────────────
function PlayerDot({ player, myLat, myLon, radiusMiles, onPress }: {
  player: RadarPlayer; myLat: number; myLon: number; radiusMiles: number; onPress: () => void;
}) {
  let bearing: number;
  let fraction: number;
  if (player._mockBearing !== undefined && player._mockFraction !== undefined) {
    bearing = player._mockBearing;
    fraction = player._mockFraction;
  } else {
    bearing = getBearing(myLat, myLon, player.last_lat, player.last_lon);
    fraction = Math.min(player.distance_miles / radiusMiles, 0.92);
  }
  const angle = (bearing - 90) * Math.PI / 180;
  const ox = PAD + RADAR_RADIUS;
  const oy = PAD + RADAR_RADIUS;
  const cx = ox + RADAR_RADIUS * fraction * Math.cos(angle);
  const cy = oy + RADAR_RADIUS * fraction * Math.sin(angle);
  const initials = player.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      style={[styles.playerDot, { left: cx - AVATAR_SIZE / 2, top: cy - AVATAR_SIZE / 2 }]}>
      {player.photo_url
        ? <Image source={{ uri: player.photo_url }} style={styles.playerAvatar} />
        : <View style={styles.playerInitials}><Text style={styles.playerInitialsText}>{initials}</Text></View>}
      {player.volpair_score !== null && (
        <View style={styles.scoreBadge}><Text style={styles.scoreBadgeText}>{player.volpair_score}</Text></View>
      )}
    </TouchableOpacity>
  );
}

// ─── Slider ───────────────────────────────────────────────────────────────────
const SLIDER_MIN = 5, SLIDER_MAX = 50, SLIDER_STEP = 5;
const SLIDER_W = SCREEN_WIDTH - 80;

function RadiusSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [display, setDisplay] = useState(value);
  const startPos = useRef(((value - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * SLIDER_W);
  const startDragPos = useRef(startPos.current);
  const snap = (rawPos: number) => {
    const clamped = Math.max(0, Math.min(rawPos, SLIDER_W));
    const raw = SLIDER_MIN + (clamped / SLIDER_W) * (SLIDER_MAX - SLIDER_MIN);
    const stepped = Math.round(raw / SLIDER_STEP) * SLIDER_STEP;
    const val = Math.max(SLIDER_MIN, Math.min(SLIDER_MAX, stepped));
    return { val, pos: ((val - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * SLIDER_W };
  };
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { startDragPos.current = startPos.current; },
    onPanResponderMove: (_, g) => { const { val, pos } = snap(startDragPos.current + g.dx); startPos.current = pos; setDisplay(val); },
    onPanResponderRelease: (_, g) => { const { val, pos } = snap(startDragPos.current + g.dx); startPos.current = pos; setDisplay(val); onChange(val); },
  })).current;
  const thumbLeft = ((display - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * SLIDER_W;
  return (
    <View style={styles.sliderContainer}>
      <Text style={styles.sliderLabel}>{display} miles</Text>
      <View style={styles.sliderTrackWrapper}>
        <View style={styles.sliderTrack}><View style={[styles.sliderFill, { width: thumbLeft + 11 }]} /></View>
        <View {...pan.panHandlers} style={[styles.sliderThumb, { left: thumbLeft }]} />
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function RadarScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { session, user } = useAuth();
  const [players, setPlayers] = useState<RadarPlayer[]>(MOCK_PLAYERS);
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [myLat, setMyLat] = useState<number | null>(51.5074);
  const [myLon, setMyLon] = useState<number | null>(-0.1278);
  const [radiusMiles, setRadiusMiles] = useState(15);
  const [activeHours, setActiveHours] = useState<24 | 168>(24);
  const [isMock, setIsMock] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<RadarPlayer | null>(null);

  const scanAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(scanAnim, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, []);
  const scanRotation = scanAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const fetchRadar = useCallback(async (lat: number, lon: number, radius: number, hours: number) => {
    if (!session) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('radar-search', { body: { lat, lon, radius_miles: radius, active_within_hours: hours } });
      if (error) throw error;
      const real = data?.players ?? [];
      if (real.length > 0) { setPlayers(real); setIsMock(false); }
      else { setPlayers(MOCK_PLAYERS); setIsMock(true); }
    } catch { setPlayers(MOCK_PLAYERS); setIsMock(true); }
    finally { setLoading(false); }
  }, [session]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocationError('Location permission denied. Enable it in Settings.'); return; }
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude: lat, longitude: lon } = loc.coords;
        setMyLat(lat); setMyLon(lon);
        if (user?.id) await supabase.from('users').update({ last_lat: lat, last_lon: lon, last_location_at: new Date().toISOString() }).eq('id', user.id);
        await fetchRadar(lat, lon, radiusMiles, activeHours);
      } catch { /* keep mock */ }
    })();
  }, []);

  useEffect(() => {
    if (myLat !== null && myLon !== null && !isMock) fetchRadar(myLat, myLon, radiusMiles, activeHours);
  }, [radiusMiles, activeHours]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Radar</Text>
        <Text style={styles.headerSub}>
          {loading ? 'Scanning…' : isMock ? 'Preview mode — no players nearby yet' : `${players.length} player${players.length !== 1 ? 's' : ''} nearby`}
        </Text>
      </View>

      {locationError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>📍</Text>
          <Text style={styles.errorText}>{locationError}</Text>
        </View>
      ) : (
        <>
          <View style={styles.radarWrapper}>
            <View style={{ width: TOTAL, height: TOTAL }}>
              <View style={styles.radarCircle}>
                {[1, 0.667, 0.333].map((scale, i) => (
                  <View key={i} style={[styles.ring, {
                    width: RADAR_DIAMETER * scale, height: RADAR_DIAMETER * scale,
                    borderRadius: (RADAR_DIAMETER * scale) / 2,
                    backgroundColor: `rgba(0,212,200,${[0.07, 0.05, 0.03][i]})`,
                    borderColor: 'rgba(0,212,200,0.18)',
                    left: RADAR_RADIUS - (RADAR_DIAMETER * scale) / 2,
                    top: RADAR_RADIUS - (RADAR_DIAMETER * scale) / 2,
                  }]} />
                ))}
                <View style={[styles.crossHair, { width: RADAR_DIAMETER, height: 1, top: RADAR_RADIUS, left: 0 }]} />
                <View style={[styles.crossHair, { width: 1, height: RADAR_DIAMETER, top: 0, left: RADAR_RADIUS }]} />
                <Animated.View style={[styles.scanLineWrap, { transform: [{ rotate: scanRotation }] }]}>
                  <View style={styles.scanLineRight} />
                </Animated.View>
                <View style={styles.myAvatarCentrer} pointerEvents="none">
                  <View style={styles.myAvatarWrap}>
                    {(user as any)?.photo_url
                      ? <Image source={{ uri: (user as any).photo_url }} style={styles.myAvatar} />
                      : <View style={styles.myAvatarDefault}><Text style={{ fontSize: 22, marginLeft: -3 }}>🎾</Text></View>}
                  </View>
                </View>
              </View>

              {players.map(p => (
                <PlayerDot key={p.id} player={p}
                  myLat={myLat ?? 51.5074} myLon={myLon ?? -0.1278}
                  radiusMiles={radiusMiles} onPress={() => setSelectedPlayer(p)} />
              ))}

              {loading && (
                <View style={[StyleSheet.absoluteFillObject, styles.loadingOverlay]}>
                  <ActivityIndicator color={theme.primary} size="large" />
                </View>
              )}
            </View>
          </View>

          {isMock && (
            <View style={styles.mockBadge}>
              <Text style={styles.mockBadgeText}>👻 Preview — real players will appear here</Text>
            </View>
          )}

          <View style={styles.controls}>
            <View style={styles.filterRow}>
              {([24, 168] as const).map(h => (
                <TouchableOpacity key={h} style={[styles.pill, activeHours === h && styles.pillActive]}
                  onPress={() => setActiveHours(h)} activeOpacity={0.8}>
                  <Text style={[styles.pillText, activeHours === h && styles.pillTextActive]}>
                    {h === 24 ? 'Last 24h' : 'Last 7 days'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <RadiusSlider value={radiusMiles} onChange={setRadiusMiles} />
          </View>
        </>
      )}

      {selectedPlayer && (
        <PlayerPopup
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          onViewProfile={() => {
            setSelectedPlayer(null);
            if (!selectedPlayer.id.startsWith('mock-')) {
              navigation.navigate('Connect', { screen: 'PlayerProfile', params: { userId: selectedPlayer.id } });
            }
          }}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontFamily: fonts.headlineBold, color: theme.textPrimary, letterSpacing: 0.5 },
  headerSub: { fontSize: 12, fontFamily: fonts.bodyLight, color: theme.textSecondary, marginTop: 2 },
  radarWrapper: { alignItems: 'center', marginTop: 8 },
  radarCircle: {
    position: 'absolute', left: PAD, top: PAD,
    width: RADAR_DIAMETER, height: RADAR_DIAMETER,
    borderRadius: RADAR_RADIUS, overflow: 'hidden',
    backgroundColor: 'rgba(0,212,200,0.03)',
    borderWidth: 1, borderColor: 'rgba(0,212,200,0.25)',
  },
  ring: { position: 'absolute', borderWidth: 1 },
  crossHair: { position: 'absolute', backgroundColor: 'rgba(0,212,200,0.1)' },
  scanLineWrap: {
    position: 'absolute', width: RADAR_DIAMETER, height: 2,
    top: RADAR_RADIUS - 1, left: 0,
  },
  scanLineRight: {
    position: 'absolute', left: RADAR_RADIUS,
    width: RADAR_RADIUS, height: 2,
    backgroundColor: theme.primary, opacity: 0.8, borderRadius: 1,
  },
  myAvatarCentrer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center', zIndex: 20,
  },
  myAvatarWrap: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2.5, borderColor: theme.primary, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: theme.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },
  myAvatar: { width: 48, height: 48, borderRadius: 24 },
  myAvatarDefault: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(0,212,200,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  playerDot: {
    position: 'absolute', width: AVATAR_SIZE, height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2, borderWidth: 2, borderColor: theme.primary, zIndex: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  playerAvatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 },
  playerInitials: {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
    backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center',
  },
  playerInitialsText: { fontFamily: fonts.bodyBold, color: '#0D1B2A', fontSize: 14 },
  scoreBadge: {
    position: 'absolute', bottom: -7, right: -7,
    backgroundColor: theme.primary, borderRadius: 8,
    paddingHorizontal: 4, paddingVertical: 1,
    borderWidth: 1.5, borderColor: theme.bg,
    minWidth: 22, alignItems: 'center',
  },
  scoreBadgeText: { fontFamily: fonts.headlineLightIt, color: '#0D1B2A', fontSize: 9 },
  loadingOverlay: { backgroundColor: 'rgba(13,27,42,0.6)', alignItems: 'center', justifyContent: 'center', zIndex: 30 },
  mockBadge: {
    alignSelf: 'center', marginTop: 8,
    backgroundColor: 'rgba(0,212,200,0.07)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(0,212,200,0.18)',
  },
  mockBadgeText: { fontFamily: fonts.bodyLight, color: theme.textSecondary, fontSize: 11 },
  controls: { paddingHorizontal: 20, paddingTop: 18, gap: 16 },
  filterRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  pill: { paddingHorizontal: 22, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bgCard },
  pillActive: { borderColor: theme.primary, backgroundColor: 'rgba(0,212,200,0.1)' },
  pillText: { fontSize: 14, fontFamily: fonts.bodyLight, color: theme.textSecondary },
  pillTextActive: { fontFamily: fonts.bodyBold, color: theme.primary },
  sliderContainer: { alignItems: 'center', gap: 10 },
  sliderLabel: { fontSize: 14, fontFamily: fonts.bodyBold, color: theme.textSecondary },
  sliderTrackWrapper: { width: SLIDER_W, height: 40, justifyContent: 'center' },
  sliderTrack: { height: 4, backgroundColor: theme.border, borderRadius: 2, overflow: 'hidden' },
  sliderFill: { height: 4, backgroundColor: theme.primary, borderRadius: 2 },
  sliderThumb: {
    position: 'absolute', width: 22, height: 22, borderRadius: 11,
    backgroundColor: theme.primary, top: 9, marginLeft: -11,
    ...Platform.select({
      ios: { shadowColor: theme.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  errorEmoji: { fontSize: 48 },
  errorText: { fontSize: 15, fontFamily: fonts.bodyLight, color: theme.textSecondary, textAlign: 'center', lineHeight: 22 },
});

// ─── Popup styles ─────────────────────────────────────────────────────────────
const popup = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'flex-end' },
  card: {
    width: '100%', backgroundColor: '#0E1F35',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 36,
    borderTopWidth: 1, borderTopColor: 'rgba(0,212,200,0.2)',
    alignItems: 'center', gap: 10,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 8 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 4 },
  avatarWrap: { width: 72, height: 72, borderRadius: 36, borderWidth: 2.5, borderColor: theme.primary, overflow: 'hidden' },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  avatarFallback: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontFamily: fonts.headlineBold, color: '#0D1B2A', fontSize: 22 },
  scorePill: { alignItems: 'center', backgroundColor: 'rgba(0,212,200,0.12)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(0,212,200,0.3)' },
  scoreLabel: { fontSize: 9, fontFamily: fonts.bodyBold, color: theme.primary, letterSpacing: 1 },
  scoreValue: { fontSize: 28, fontFamily: fonts.headlineLightIt, color: theme.primary },
  name: { fontSize: 22, fontFamily: fonts.headlineBold, color: theme.textPrimary, textAlign: 'center' },
  city: { fontSize: 13, fontFamily: fonts.bodyLight, color: theme.textSecondary },
  statsRow: { flexDirection: 'row', gap: 20, marginVertical: 6 },
  stat: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 18, fontFamily: fonts.headlineLightIt, color: theme.textPrimary },
  statLabel: { fontSize: 11, fontFamily: fonts.bodyLight, color: theme.textSecondary },
  stylePill: { backgroundColor: 'rgba(0,212,200,0.08)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(0,212,200,0.2)' },
  styleText: { fontFamily: fonts.bodyBold, color: theme.primary, fontSize: 12, textTransform: 'capitalize' },
  viewBtn: { width: '100%', backgroundColor: theme.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  viewBtnText: { fontFamily: fonts.bodyBold, color: '#0D1B2A', fontSize: 16 },
  closeBtn: { paddingVertical: 10 },
  closeBtnText: { fontFamily: fonts.bodyLight, color: theme.textSecondary, fontSize: 14 },
});
