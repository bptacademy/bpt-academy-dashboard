import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Tournament, TournamentRegistration, TournamentMatch, Division, DIVISION_LABELS, DIVISION_COLORS } from '../../types';
import BackHeader from '../../components/common/BackHeader';

export default function TournamentDetailScreen({ navigation, route }: any) {
  const { tournamentId } = route.params;
  const { profile } = useAuth();

  const [tournament, setTournament]         = useState<Tournament | null>(null);
  const [matches, setMatches]               = useState<TournamentMatch[]>([]);
  const [myRegistration, setMyRegistration] = useState<TournamentRegistration | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);

  const load = useCallback(async () => {
    const [tRes, mRes, regRes, countRes] = await Promise.all([
      supabase.from('tournaments').select('*').eq('id', tournamentId).single(),
      supabase.from('tournament_matches').select('*').eq('tournament_id', tournamentId).order('round'),
      profile
        ? supabase.from('tournament_registrations').select('*')
            .eq('tournament_id', tournamentId)
            .eq('student_id', profile.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('tournament_registrations')
        .select('id', { count: 'exact' })
        .eq('tournament_id', tournamentId)
        .neq('status', 'withdrawn'),
    ]);
    if (tRes.data)   setTournament(tRes.data as Tournament);
    if (mRes.data)   setMatches(mRes.data as TournamentMatch[]);
    if (regRes.data) setMyRegistration(regRes.data as TournamentRegistration);
    if (countRes.count !== null) setParticipantCount(countRes.count);
    setLoading(false);
  }, [tournamentId, profile]);

  useEffect(() => { load(); }, [load]);

  // Re-fetch when returning from PaymentScreen
  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  const handleRegisterPress = () => {
    if (!profile || !tournament) return;

    const isFree = !tournament.entry_fee_gbp || tournament.entry_fee_gbp === 0;

    if (isFree) {
      // Free tournament — register instantly
      Alert.alert(
        'Confirm Registration',
        `Register for ${tournament.title}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Register',
            onPress: async () => {
              const { data, error } = await supabase
                .from('tournament_registrations')
                .insert({ tournament_id: tournament.id, student_id: profile.id, status: 'confirmed' })
                .select().single();
              if (error) { Alert.alert('Error', error.message); return; }
              setMyRegistration(data as TournamentRegistration);
              Alert.alert('✅ Registered!', `You're registered for ${tournament.title}.`);
            },
          },
        ],
      );
      return;
    }

    // Paid tournament — go to payment first, registration created there
    navigation.navigate('Payment', {
      tournamentId: tournament.id,
      studentId: profile.id,
      amount: tournament.entry_fee_gbp,
      label: tournament.title,
    });
  };

  const handleWithdraw = () => {
    Alert.alert(
      'Withdraw',
      'Are you sure you want to withdraw from this tournament?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw', style: 'destructive',
          onPress: async () => {
            if (!myRegistration) return;
            await supabase
              .from('tournament_registrations')
              .update({ status: 'withdrawn' })
              .eq('id', myRegistration.id);
            setMyRegistration({ ...myRegistration, status: 'withdrawn' });
          },
        },
      ],
    );
  };

  if (loading) return (
    <View style={styles.container}>
      <BackHeader title="Tournament" />
      <ActivityIndicator size="large" color="#16A34A" style={styles.loader} />
    </View>
  );

  if (!tournament) return (
    <View style={styles.container}>
      <BackHeader title="Tournament" />
      <Text style={styles.errorText}>Tournament not found.</Text>
    </View>
  );

  const isFree      = !tournament.entry_fee_gbp || tournament.entry_fee_gbp === 0;
  const canRegister = tournament.status === 'registration_open' && !myRegistration;
  const isRegistered = !!myRegistration && myRegistration.status !== 'withdrawn';
  const isFull      = tournament.max_participants
    ? participantCount >= tournament.max_participants
    : false;
  const rounds = [...new Set(matches.map((m) => m.round))].sort();

  return (
    <View style={styles.container}>
      <BackHeader title={tournament.title} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <View style={[styles.statusChip, { backgroundColor: statusColor(tournament.status) + '30' }]}>
              <Text style={[styles.statusChipText, { color: statusColor(tournament.status) }]}>
                {statusLabel(tournament.status)}
              </Text>
            </View>
            {!isFree && (
              <View style={styles.feeChip}>
                <Text style={styles.feeChipText}>£{tournament.entry_fee_gbp.toFixed(2)}</Text>
              </View>
            )}
            {isFree && (
              <View style={[styles.feeChip, styles.feeChipFree]}>
                <Text style={[styles.feeChipText, { color: '#16A34A' }]}>Free</Text>
              </View>
            )}
          </View>

          <Text style={styles.heroTitle}>{tournament.title}</Text>
          {tournament.description && (
            <Text style={styles.heroDesc}>{tournament.description}</Text>
          )}

          <View style={styles.heroMeta}>
            {tournament.location && (
              <Text style={styles.heroMetaText}>📍 {tournament.location}</Text>
            )}
            <Text style={styles.heroMetaText}>
              📅 {new Date(tournament.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              {tournament.end_date && ` – ${new Date(tournament.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
            </Text>
            <Text style={styles.heroMetaText}>
              👥 {participantCount}{tournament.max_participants ? ` / ${tournament.max_participants}` : ''} registered
            </Text>
            {tournament.registration_deadline && (
              <Text style={styles.heroMetaText}>
                ⏰ Deadline: {new Date(tournament.registration_deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            )}
          </View>
        </View>

        {/* Eligible divisions */}
        {(tournament.eligible_divisions as Division[])?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Eligible Divisions</Text>
            <View style={styles.divRow}>
              {(tournament.eligible_divisions as Division[]).map((div) => (
                <View key={div} style={[styles.divChip, { backgroundColor: DIVISION_COLORS[div] + '22' }]}>
                  <Text style={[styles.divText, { color: DIVISION_COLORS[div] }]}>{DIVISION_LABELS[div]}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Registration status card */}
        {isRegistered && (
          <View style={[
            styles.regCard,
            myRegistration?.status === 'confirmed' ? styles.regCardConfirmed : styles.regCardPending,
          ]}>
            <Text style={styles.regCardIcon}>
              {myRegistration?.status === 'confirmed' ? '✅' : '⏳'}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.regCardTitle}>
                {myRegistration?.status === 'confirmed'
                  ? 'You\'re registered!'
                  : 'Registration pending payment'}
              </Text>
              <Text style={styles.regCardSub}>
                {myRegistration?.status === 'confirmed'
                  ? 'Your spot is confirmed. See you on the court!'
                  : 'Complete your payment to confirm your spot.'}
              </Text>
            </View>
            <TouchableOpacity style={styles.withdrawBtn} onPress={handleWithdraw}>
              <Text style={styles.withdrawBtnText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Register / Pay button */}
        {/* Not open yet */}
        {tournament.status === 'upcoming' && !isRegistered && (
          <View style={styles.upcomingCard}>
            <Text style={styles.upcomingIcon}>🗓</Text>
            <Text style={styles.upcomingTitle}>Registration Not Open Yet</Text>
            <Text style={styles.upcomingText}>Check back soon — registration will open shortly.</Text>
          </View>
        )}

        {canRegister && !isFull && (
          <View style={styles.section}>
            <View style={styles.registerCard}>
              {!isFree && (
                <View style={styles.registerPriceRow}>
                  <Text style={styles.registerPriceLabel}>Entry Fee</Text>
                  <Text style={styles.registerPrice}>£{tournament.entry_fee_gbp.toFixed(2)}</Text>
                </View>
              )}
              <Text style={styles.registerHint}>
                {isFree
                  ? 'This tournament is free to enter.'
                  : 'Payment is required to confirm your registration. You\'ll choose card or bank transfer on the next screen.'}
              </Text>
              <TouchableOpacity style={styles.registerBtn} onPress={handleRegisterPress}>
                <Text style={styles.registerBtnText}>
                  {isFree ? '🎾 Register Now' : `🎾 Register & Pay — £${tournament.entry_fee_gbp.toFixed(2)}`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {canRegister && isFull && (
          <View style={styles.fullCard}>
            <Text style={styles.fullIcon}>🔒</Text>
            <Text style={styles.fullTitle}>Tournament Full</Text>
            <Text style={styles.fullText}>All spots have been taken. Check back if someone withdraws.</Text>
          </View>
        )}

        {/* Bracket */}
        {matches.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏆 Bracket</Text>
            {rounds.map((round) => (
              <View key={round} style={styles.roundBlock}>
                <Text style={styles.roundLabel}>{round}</Text>
                {matches.filter((m) => m.round === round).map((match) => (
                  <View key={match.id} style={styles.matchCard}>
                    <View style={styles.matchRow}>
                      <Text style={[styles.matchPlayer, match.winner_id === match.player1_id && styles.winner]}>
                        Player 1
                      </Text>
                      <Text style={styles.vsText}>vs</Text>
                      <Text style={[styles.matchPlayer, match.winner_id === match.player2_id && styles.winner]}>
                        Player 2
                      </Text>
                    </View>
                    {match.score && <Text style={styles.matchScore}>{match.score}</Text>}
                    {match.court && <Text style={styles.matchMeta}>🎾 {match.court}</Text>}
                    {match.scheduled_at && (
                      <Text style={styles.matchMeta}>
                        🕐 {new Date(match.scheduled_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusLabel(status: string) {
  const map: Record<string, string> = {
    draft: 'Draft',
    registration_open: 'Registration Open',
    registration_closed: 'Registration Closed',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return map[status] ?? status;
}

function statusColor(status: string) {
  const map: Record<string, string> = {
    draft: '#6B7280',
    registration_open: '#16A34A',
    registration_closed: '#D97706',
    in_progress: '#2563EB',
    completed: '#7C3AED',
    cancelled: '#DC2626',
  };
  return map[status] ?? '#6B7280';
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loader: { marginTop: 60 },
  errorText: { textAlign: 'center', marginTop: 40, color: '#6B7280' },

  hero: { backgroundColor: '#111827', padding: 24, paddingTop: 20 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusChipText: { fontSize: 12, fontWeight: '700' },
  feeChip: { backgroundColor: '#FFFFFF20', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  feeChipFree: { backgroundColor: '#ECFDF580' },
  feeChipText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  heroDesc: { fontSize: 14, color: '#D1FAE5', marginBottom: 14, lineHeight: 20 },
  heroMeta: { gap: 6 },
  heroMetaText: { fontSize: 13, color: '#9CA3AF' },

  section: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },

  divRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  divChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  divText: { fontSize: 12, fontWeight: '600' },

  // Registration status card
  regCard: { flexDirection: 'row', alignItems: 'center', gap: 12, margin: 20, borderRadius: 14, padding: 16, borderWidth: 1 },
  regCardConfirmed: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  regCardPending: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  regCardIcon: { fontSize: 28 },
  regCardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 3 },
  regCardSub: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  withdrawBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#FCA5A5' },
  withdrawBtnText: { color: '#DC2626', fontSize: 12, fontWeight: '600' },

  // Register card
  registerCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  registerPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  registerPriceLabel: { fontSize: 14, color: '#374151', fontWeight: '600' },
  registerPrice: { fontSize: 26, fontWeight: '800', color: '#111827' },
  registerHint: { fontSize: 13, color: '#6B7280', lineHeight: 19, marginBottom: 16 },
  registerBtn: { backgroundColor: '#16A34A', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  registerBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  // Upcoming
  upcomingCard: { margin: 20, backgroundColor: '#EFF6FF', borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#BFDBFE' },
  upcomingIcon: { fontSize: 32, marginBottom: 8 },
  upcomingTitle: { fontSize: 16, fontWeight: '700', color: '#1E40AF', marginBottom: 6 },
  upcomingText: { fontSize: 13, color: '#1D4ED8', textAlign: 'center', lineHeight: 20 },

  // Full card
  fullCard: { margin: 20, backgroundColor: '#FFF7ED', borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#FED7AA' },
  fullIcon: { fontSize: 32, marginBottom: 8 },
  fullTitle: { fontSize: 16, fontWeight: '700', color: '#92400E', marginBottom: 6 },
  fullText: { fontSize: 13, color: '#78350F', textAlign: 'center', lineHeight: 20 },

  // Bracket
  roundBlock: { marginBottom: 16 },
  roundLabel: { fontSize: 13, fontWeight: '700', color: '#16A34A', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  matchCard: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  matchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  matchPlayer: { fontSize: 14, color: '#374151', flex: 1 },
  winner: { fontWeight: '700', color: '#16A34A' },
  vsText: { fontSize: 12, color: '#9CA3AF', marginHorizontal: 8 },
  matchScore: { fontSize: 13, fontWeight: '600', color: '#111827', textAlign: 'center', marginTop: 6 },
  matchMeta: { fontSize: 12, color: '#6B7280', marginTop: 4 },
});
