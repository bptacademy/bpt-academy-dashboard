import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Tournament, TournamentRegistration, TournamentMatch, Division, DIVISION_LABELS, DIVISION_COLORS } from '../../types';
import BackHeader from '../../components/common/BackHeader';

interface Props {
  navigation: any;
  route: { params: { tournamentId: string } };
}

export default function TournamentDetailScreen({ navigation, route }: any) {
  const { tournamentId } = route.params;
  const { profile } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [myRegistration, setMyRegistration] = useState<TournamentRegistration | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  const load = async () => {
    setLoading(true);
    const [tRes, mRes, regRes, countRes] = await Promise.all([
      supabase.from('tournaments').select('*').eq('id', tournamentId).single(),
      supabase.from('tournament_matches').select('*').eq('tournament_id', tournamentId).order('round'),
      profile
        ? supabase.from('tournament_registrations').select('*').eq('tournament_id', tournamentId).eq('student_id', profile.id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('tournament_registrations').select('id', { count: 'exact' }).eq('tournament_id', tournamentId),
    ]);
    if (tRes.data) setTournament(tRes.data as Tournament);
    if (mRes.data) setMatches(mRes.data as TournamentMatch[]);
    if (regRes.data) setMyRegistration(regRes.data as TournamentRegistration);
    if (countRes.count !== null) setParticipantCount(countRes.count);
    setLoading(false);
  };

  useEffect(() => { load(); }, [tournamentId]);

  const handleRegister = async () => {
    if (!profile || !tournament) return;
    setRegistering(true);
    const { data, error } = await supabase.from('tournament_registrations').insert({
      tournament_id: tournament.id,
      student_id: profile.id,
      status: 'pending',
    }).select().single();
    setRegistering(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setMyRegistration(data as TournamentRegistration);
      navigation.navigate('Payment', {
        tournamentId: tournament.id,
        amount: tournament.entry_fee_gbp,
        registrationId: data.id,
      });
    }
  };

  const handleWithdraw = () => {
    Alert.alert('Withdraw', 'Are you sure you want to withdraw from this tournament?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: async () => {
          if (!myRegistration) return;
          await supabase.from('tournament_registrations').update({ status: 'withdrawn' }).eq('id', myRegistration.id);
          setMyRegistration({ ...myRegistration, status: 'withdrawn' });
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <BackHeader title="Tournament" />
        <ActivityIndicator size="large" color="#16A34A" style={styles.loader} />
      </View>
    );
  }

  if (!tournament) {
    return (
      <View style={styles.container}>
        <BackHeader title="Tournament" />
        <Text style={styles.errorText}>Tournament not found.</Text>
      </View>
    );
  }

  const canRegister = tournament.status === 'registration_open' && !myRegistration;
  const registered = !!myRegistration && myRegistration.status !== 'withdrawn';
  const rounds = [...new Set(matches.map(m => m.round))].sort();

  return (
    <View style={styles.container}>
      <BackHeader title={tournament.title} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>{tournament.title}</Text>
          {tournament.description && (
            <Text style={styles.heroDesc}>{tournament.description}</Text>
          )}
          <View style={styles.heroMeta}>
            {tournament.location && <Text style={styles.heroMetaText}>📍 {tournament.location}</Text>}
            <Text style={styles.heroMetaText}>
              📅 {new Date(tournament.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              {tournament.end_date && ` – ${new Date(tournament.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
            </Text>
            <Text style={styles.heroMetaText}>💷 Entry fee: £{tournament.entry_fee_gbp.toFixed(2)}</Text>
            <Text style={styles.heroMetaText}>👥 Participants: {participantCount}{tournament.max_participants ? ` / ${tournament.max_participants}` : ''}</Text>
            {tournament.registration_deadline && (
              <Text style={styles.heroMetaText}>
                ⏰ Deadline: {new Date(tournament.registration_deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            )}
          </View>
        </View>

        {/* Eligible divisions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Eligible Divisions</Text>
          <View style={styles.divRow}>
            {(tournament.eligible_divisions as Division[]).map(div => (
              <View key={div} style={[styles.divChip, { backgroundColor: DIVISION_COLORS[div] + '22' }]}>
                <Text style={[styles.divText, { color: DIVISION_COLORS[div] }]}>{DIVISION_LABELS[div]}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Registration status */}
        {registered && (
          <View style={styles.regStatusCard}>
            <Text style={styles.regStatusTitle}>✅ You are registered</Text>
            <Text style={styles.regStatusSub}>
              Status: <Text style={styles.regStatusBold}>{myRegistration?.status}</Text>
            </Text>
            {myRegistration?.status === 'pending' && (
              <TouchableOpacity
                style={styles.payBtn}
                onPress={() => navigation.navigate('Payment', {
                  tournamentId: tournament.id,
                  amount: tournament.entry_fee_gbp,
                  registrationId: myRegistration?.id,
                })}
              >
                <Text style={styles.payBtnText}>💳 Complete Payment</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.withdrawBtn} onPress={handleWithdraw}>
              <Text style={styles.withdrawBtnText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        )}

        {canRegister && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.registerBtn}
              onPress={handleRegister}
              disabled={registering}
            >
              {registering
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.registerBtnText}>Register & Pay</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Bracket */}
        {matches.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏆 Bracket</Text>
            {rounds.map(round => (
              <View key={round} style={styles.roundBlock}>
                <Text style={styles.roundLabel}>{round}</Text>
                {matches.filter(m => m.round === round).map(match => (
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loader: { marginTop: 60 },
  errorText: { textAlign: 'center', marginTop: 40, color: '#6B7280' },
  hero: { backgroundColor: '#111827', padding: 24 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  heroDesc: { fontSize: 14, color: '#D1FAE5', marginBottom: 16 },
  heroMeta: { gap: 6 },
  heroMetaText: { fontSize: 13, color: '#9CA3AF' },
  section: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  divRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  divChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  divText: { fontSize: 12, fontWeight: '600' },
  regStatusCard: {
    margin: 20, backgroundColor: '#ECFDF5', borderRadius: 14,
    padding: 18, borderWidth: 1, borderColor: '#A7F3D0',
  },
  regStatusTitle: { fontSize: 16, fontWeight: '700', color: '#065F46', marginBottom: 6 },
  regStatusSub: { fontSize: 13, color: '#374151', marginBottom: 12 },
  regStatusBold: { fontWeight: '700', textTransform: 'capitalize' },
  payBtn: {
    backgroundColor: '#16A34A', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 8,
  },
  payBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  withdrawBtn: { borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#EF4444' },
  withdrawBtnText: { color: '#EF4444', fontSize: 14, fontWeight: '600' },
  registerBtn: { backgroundColor: '#16A34A', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  registerBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  roundBlock: { marginBottom: 16 },
  roundLabel: { fontSize: 13, fontWeight: '700', color: '#16A34A', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  matchCard: {
    backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB',
  },
  matchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  matchPlayer: { fontSize: 14, color: '#374151', flex: 1 },
  winner: { fontWeight: '700', color: '#16A34A' },
  vsText: { fontSize: 12, color: '#9CA3AF', marginHorizontal: 8 },
  matchScore: { fontSize: 13, fontWeight: '600', color: '#111827', textAlign: 'center', marginTop: 6 },
  matchMeta: { fontSize: 12, color: '#6B7280', marginTop: 4 },
});
