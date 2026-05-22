import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Image, Dimensions,
  Modal, TextInput, FlatList} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Tournament, TournamentRegistration, TournamentMatch, Division, DIVISION_LABELS, DIVISION_COLORS } from '../../types';
import BackHeader from '../../components/common/BackHeader';
import BackButton from '../../components/common/BackButton';

// ─── Team/Match types ─────────────────────────────────────────────────────────

interface TeamReg {
  id: string; student_id: string; partner_id: string | null;
  team_name: string | null; seed: number | null; division: string;
  player1: { full_name: string } | null;
  partner1: { full_name: string } | null;
}

function getTeamName(reg: TeamReg | undefined | null): string {
  if (!reg) return 'TBD';
  if (reg.team_name) return reg.team_name;
  const p1 = reg.player1?.full_name ?? '?';
  const p2 = reg.partner1?.full_name;
  return p2 ? `${p1} & ${p2}` : p1;
}

interface RichMatch {
  id: string; round: string; score: string | null; winner_id: string | null;
  court: string | null; scheduled_at: string | null; played_at: string | null;
  player1_id: string | null; player2_id: string | null;
  team1_registration_id: string | null; team2_registration_id: string | null;
  team1: TeamReg | null; team2: TeamReg | null;
}

interface ParticipantRow {
  id: string;
  status: string;
  registered_at: string;
  profile: { full_name: string; division: string | null };
  payment?: { status: string; method: string } | null;
}

export default function TournamentDetailScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const tabBarPadding = useTabBarPadding();
  const { tournamentId } = route.params;
  const { profile, effectiveRole } = useAuth();
  const isAdmin = effectiveRole === 'admin' || effectiveRole === 'coach';

  const [tournament, setTournament]             = useState<Tournament | null>(null);
  const [matches, setMatches]                   = useState<RichMatch[]>([]);
  const [myRegistration, setMyRegistration]     = useState<TournamentRegistration | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [loading, setLoading]                   = useState(true);
  const [refreshing, setRefreshing]             = useState(false);
  const [participants, setParticipants]         = useState<ParticipantRow[]>([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showTeams, setShowTeams]               = useState(false);
  const [teams, setTeams]                       = useState<any[]>([]);
  const [partnerModal, setPartnerModal]         = useState<{visible:boolean;search:string}>({visible:false,search:''});

  const load = useCallback(async () => {
    const [tRes, mRes, regRes, countRes, participantsRes, teamsRes] = await Promise.all([
      supabase.from('tournaments').select('*').eq('id', tournamentId).single(),
      supabase.from('tournament_matches')
        .select('*, team1:tournament_registrations!team1_registration_id(id, student_id, partner_id, team_name, seed, player1:profiles!student_id(full_name), partner1:profiles!partner_id(full_name)), team2:tournament_registrations!team2_registration_id(id, student_id, partner_id, team_name, seed, player2:profiles!student_id(full_name), partner2:profiles!partner_id(full_name))')
        .eq('tournament_id', tournamentId)
        .order('created_at'),
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
      supabase.from('tournament_registrations')
        .select('id, status, student_id, registered_at, profile:profiles!student_id(id, full_name, division), payment:payments(status, method)')
        .eq('tournament_id', tournamentId)
        .neq('status', 'withdrawn')
        .order('registered_at'),
      supabase.from('tournament_registrations')
        .select('id, student_id, partner_id, team_name, seed, division, status, player1:profiles!student_id(full_name), partner1:profiles!partner_id(full_name)')
        .eq('tournament_id', tournamentId)
        .eq('status', 'confirmed')
        .order('seed', { nullsFirst: false }),
    ]);
    if (tRes.data)   setTournament(tRes.data as Tournament);
    if (mRes.data) {
      const normalized = (mRes.data as any[]).map((m: any) => ({
        ...m,
        team1: m.team1 ?? null,
        team2: m.team2 ?? null,
      }));
      setMatches(normalized as RichMatch[]);
    }
    if (regRes.data) setMyRegistration(regRes.data as TournamentRegistration);
    if (countRes.count !== null) setParticipantCount(countRes.count);
    if (participantsRes.data) setParticipants(participantsRes.data as any);
    if (teamsRes.data) setTeams(teamsRes.data as any);
    setLoading(false);
  }, [tournamentId, profile]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  const handleRegisterPress = () => {
    if (!profile || !tournament) return;
    const isFree = !tournament.entry_fee_gbp || tournament.entry_fee_gbp === 0;
    if (isFree) {
      Alert.alert('Confirm Registration', `Register for ${tournament.title}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Register', onPress: async () => {
          const { data, error } = await supabase
            .from('tournament_registrations')
            .insert({ tournament_id: tournament.id, student_id: profile.id, status: 'confirmed' })
            .select().single();
          if (error) { Alert.alert('Error', error.message); return; }
          setMyRegistration(data as TournamentRegistration);
          const { data: admins } = await supabase.from('profiles').select('id').in('role', ['admin', 'coach']);
          if (admins && admins.length > 0) {
            await supabase.from('notifications').insert(
              admins.map((a: { id: string }) => ({
                recipient_id: a.id,
                title: '🎾 New Tournament Registration',
                body: `${profile.full_name} registered for ${tournament.title} (free entry). Spot confirmed.`,
                type: 'payment', read: false,
              }))
            );
          }
          Alert.alert('✅ Registered!', `You're registered for ${tournament.title}.`);
        }},
      ]);
      return;
    }
    navigation.navigate('Payment', {
      tournamentId: tournament.id, studentId: profile.id,
      amount: tournament.entry_fee_gbp, label: tournament.title,
    });
  };

  const handleConfirmRegistration = (participantId: string, studentName: string, registrationId: string) => {
    Alert.alert('Confirm Registration', `Confirm ${studentName}'s spot in ${tournament?.title}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm ✅', onPress: async () => {
        await supabase.from('tournament_registrations').update({ status: 'confirmed' }).eq('id', registrationId);
        await supabase.from('payments').update({ status: 'confirmed', confirmed_by: profile!.id, confirmed_at: new Date().toISOString() })
          .eq('tournament_id', tournament!.id).eq('student_id', participantId).eq('status', 'pending');
        await supabase.from('notifications').insert({
          recipient_id: participantId,
          title: '✅ Tournament Registration Confirmed',
          body: `Your registration for ${tournament?.title} has been confirmed by your coach.`,
          type: 'payment', read: false,
        });
        setMyRegistration(null);
        await load();
      }},
    ]);
  };

  const handleWithdraw = () => {
    Alert.alert('Withdraw', 'Are you sure you want to withdraw from this tournament?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Withdraw', style: 'destructive', onPress: async () => {
        if (!myRegistration) return;
        await supabase.from('tournament_registrations').update({ status: 'withdrawn' }).eq('id', myRegistration.id);
        setMyRegistration({ ...myRegistration, status: 'withdrawn' });
      }},
    ]);
  };

  if (loading) return (
    <View style={styles.container}>
      <BackButton />
      <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />
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

  const isFree        = !tournament.entry_fee_gbp || tournament.entry_fee_gbp === 0;
  const isRegistered  = !!myRegistration && myRegistration.status !== 'withdrawn';
  const isPending     = myRegistration?.status === 'pending';
  const isConfirmed   = myRegistration?.status === 'confirmed';
  const canRegister   = tournament.status === 'registration_open' && !myRegistration;
  const isFull        = tournament.max_participants ? participantCount >= tournament.max_participants : false;
  const rounds        = [...new Set(matches.map((m) => m.round))];

  // "Your Next Match"
  const now = new Date();
  const nextMatch = isConfirmed && profile ? matches.find(m =>
    !m.winner_id &&
    m.scheduled_at && new Date(m.scheduled_at) > now &&
    (m.team1?.student_id === profile.id || m.team1?.partner_id === profile.id ||
     m.team2?.student_id === profile.id || m.team2?.partner_id === profile.id)
  ) : null;

  // Partner nomination
  const myReg = myRegistration as any;
  const hasPartner = !!myReg?.partner_id;

  const nominatePartner = async (partnerId: string) => {
    if (!myRegistration) return;
    await supabase.from('tournament_registrations').update({ partner_id: partnerId }).eq('id', myRegistration.id);
    setPartnerModal({visible:false,search:''});
    load();
  };

  const pairedIds = teams.filter((r: any) => r.partner_id).map((r: any) => r.student_id);
  const availablePartners = teams.filter((r: any) => !pairedIds.includes(r.student_id) && r.student_id !== profile?.id);

  return (
    <View style={styles.container}>
      <BackHeader title={tournament.title} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: tabBarPadding }}
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
          {tournament.description && <Text style={styles.heroDesc}>{tournament.description}</Text>}
          <View style={styles.heroMeta}>
            {tournament.location && <Text style={styles.heroMetaText}>📍 {tournament.location}</Text>}
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
        {isConfirmed && (
          <View style={[styles.regCard, styles.regCardConfirmed]}>
            <Text style={styles.regCardIcon}>✅</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.regCardTitle}>You're registered!</Text>
              <Text style={styles.regCardSub}>Your spot is confirmed. See you on the court!</Text>
            </View>
            <TouchableOpacity style={styles.withdrawBtn} onPress={handleWithdraw}>
              <Text style={styles.withdrawBtnText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        )}

        {isPending && (
          <View style={[styles.regCard, styles.regCardPending]}>
            <Text style={styles.regCardIcon}>⏳</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.regCardTitle}>Awaiting payment confirmation</Text>
              <Text style={styles.regCardSub}>Your registration is reserved. The coach will confirm your spot once payment is verified.</Text>
            </View>
            <TouchableOpacity style={styles.withdrawBtn} onPress={handleWithdraw}>
              <Text style={styles.withdrawBtnText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Register / Pay button */}
        {tournament.status === 'upcoming' && !isRegistered && !isPending && (
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
                {isFree ? 'This tournament is free to enter.' : 'Payment is required to confirm your registration.'}
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

        {/* Partner nomination (student only, not yet partnered) */}
        {isConfirmed && !isAdmin && !hasPartner && (
          <View style={[styles.section, {paddingTop:0}]}>
            <TouchableOpacity style={styles.nominateBtn} onPress={() => setPartnerModal({visible:true,search:''})}>
              <Text style={styles.nominateBtnText}>🤝 Nominate Partner</Text>
            </TouchableOpacity>
          </View>
        )}
        {isConfirmed && !isAdmin && hasPartner && (
          <View style={[styles.section, {paddingTop:0}]}>
            <View style={styles.partnerConfirmedCard}>
              <Text style={styles.partnerConfirmedText}>
                🤝 Partner: {teams.find((r: any) => r.student_id === myReg?.partner_id)?.player1?.full_name ?? '—'}
              </Text>
            </View>
          </View>
        )}

        {/* Participants */}
        {participants.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.participantsHeader} onPress={() => setShowParticipants(!showParticipants)}>
              <Text style={styles.sectionTitle}>👥 Participants ({participants.length})</Text>
              <Text style={styles.participantsChevron}>{showParticipants ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showParticipants && (
              <View style={styles.participantsList}>
                {participants.map((p, idx) => {
                  const payment = Array.isArray(p.payment) ? p.payment[0] : p.payment;
                  const pStatus = p.status === 'confirmed' ? 'confirmed' : payment?.status === 'pending' ? 'pending' : p.status;
                  return (
                    <View key={p.id} style={styles.participantRow}>
                      <View style={styles.participantNum}><Text style={styles.participantNumText}>{idx + 1}</Text></View>
                      <View style={styles.participantInfo}>
                        <Text style={styles.participantName}>{(p.profile as any)?.full_name ?? 'Unknown'}</Text>
                        {(p.profile as any)?.division && (
                          <Text style={styles.participantDiv}>{DIVISION_LABELS[(p.profile as any).division as Division] ?? (p.profile as any).division}</Text>
                        )}
                      </View>
                      {isAdmin ? (
                        <View style={styles.participantRight}>
                          {pStatus !== 'confirmed' ? (
                            <TouchableOpacity style={styles.confirmRegBtn} onPress={() => handleConfirmRegistration((p as any).student_id, (p.profile as any)?.full_name ?? 'Student', p.id)}>
                              <Text style={styles.confirmRegBtnText}>Confirm ✅</Text>
                            </TouchableOpacity>
                          ) : (
                            <View style={[styles.participantStatus, { backgroundColor: '#DCFCE7' }]}>
                              <Text style={[styles.participantStatusText, { color: '#16A34A' }]}>✓ Confirmed</Text>
                            </View>
                          )}
                          {payment?.method && (
                            <Text style={styles.participantMethod}>{payment.method === 'bank_transfer' ? '🏦 Bank' : '💳 Card'}</Text>
                          )}
                        </View>
                      ) : (
                        <View style={[styles.participantStatus, { backgroundColor: pStatus === 'confirmed' ? '#DCFCE7' : '#F3F4F6' }]}>
                          <Text style={[styles.participantStatusText, { color: pStatus === 'confirmed' ? '#16A34A' : '#6B7280' }]}>
                            {pStatus === 'confirmed' ? '✓' : '⏳'}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Your Next Match */}
        {nextMatch && (
          <View style={styles.section}>
            <View style={styles.nextMatchCard}>
              <Text style={styles.nextMatchHeader}>🎾 Your Next Match</Text>
              <View style={styles.nextMatchVsRow}>
                <Text style={styles.nextMatchTeam}>{getTeamName(nextMatch.team1)}</Text>
                <Text style={styles.vsTextAmber}>vs</Text>
                <Text style={[styles.nextMatchTeam,{textAlign:'right'}]}>{getTeamName(nextMatch.team2)}</Text>
              </View>
              {nextMatch.court && <Text style={styles.nextMatchMeta}>🎾 {nextMatch.court}</Text>}
              {nextMatch.scheduled_at && (
                <Text style={styles.nextMatchMeta}>
                  🕐 {new Date(nextMatch.scheduled_at).toLocaleString('en-GB', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Teams section */}
        {teams.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.participantsHeader} onPress={() => setShowTeams(!showTeams)}>
              <Text style={styles.sectionTitle}>👥 Teams ({teams.length})</Text>
              <Text style={styles.participantsChevron}>{showTeams ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showTeams && (
              <View>
                {teams.filter((r: any) => r.partner_id).map((r: any) => (
                  <View key={r.id} style={styles.teamRow}>
                    {r.seed ? <View style={styles.seedBadge}><Text style={styles.seedBadgeText}>{r.seed}</Text></View> : null}
                    <View style={{flex:1}}>
                      <Text style={styles.teamPlayerName}>{r.player1?.full_name}</Text>
                      <Text style={styles.teamPartnerName}>& {r.partner1?.full_name}</Text>
                    </View>
                    <View style={styles.teamDivBadge}><Text style={styles.teamDivBadgeText}>{r.division}</Text></View>
                  </View>
                ))}
                {teams.filter((r: any) => !r.partner_id).length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle,{fontSize:13,marginTop:12,marginBottom:8}]}>Solo Players</Text>
                    {teams.filter((r: any) => !r.partner_id).map((r: any) => (
                      <View key={r.id} style={styles.teamRow}>
                        <View style={{flex:1}}><Text style={styles.teamPlayerName}>{r.player1?.full_name}</Text></View>
                        <View style={styles.teamDivBadge}><Text style={styles.teamDivBadgeText}>{r.division}</Text></View>
                      </View>
                    ))}
                  </>
                )}
              </View>
            )}
          </View>
        )}

        {/* Bracket */}
        {matches.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏆 Bracket</Text>
            {rounds.map((round) => (
              <View key={round} style={styles.roundBlock}>
                <Text style={styles.roundLabel}>{round}</Text>
                {matches.filter((m) => m.round === round).map((match) => {
                  const t1Name = getTeamName(match.team1);
                  const t2Name = getTeamName(match.team2);
                  const t1Won = match.winner_id && match.team1?.student_id === match.winner_id;
                  const t2Won = match.winner_id && match.team2?.student_id === match.winner_id;
                  return (
                    <View key={match.id} style={styles.matchCard}>
                      <View style={styles.matchRow}>
                        <Text style={[styles.matchPlayer, t1Won ? styles.winner : undefined]}>{t1Name}</Text>
                        <Text style={styles.vsText}>vs</Text>
                        <Text style={[styles.matchPlayer, t2Won ? styles.winner : undefined, {textAlign:'right'}]}>{t2Name}</Text>
                      </View>
                      {match.score && <Text style={styles.matchScore}>{match.score}</Text>}
                      {match.court && <Text style={styles.matchMeta}>🎾 {match.court}</Text>}
                      {match.scheduled_at && (
                        <Text style={styles.matchMeta}>
                          🕐 {new Date(match.scheduled_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Partner nomination modal */}
      <Modal visible={partnerModal.visible} animationType="slide" presentationStyle="pageSheet">
        <View style={{flex:1,backgroundColor:'#0B1628'}}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setPartnerModal({visible:false,search:''})}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Choose Partner</Text>
            <View style={{width:60}} />
          </View>
          <TextInput
            style={styles.modalSearch}
            placeholder="Search by name…"
            placeholderTextColor="#7A8FA6"
            value={partnerModal.search}
            onChangeText={v => setPartnerModal(p => ({...p,search:v}))}
          />
          <FlatList
            data={availablePartners.filter((r: any) => (r.player1?.full_name ?? '').toLowerCase().includes(partnerModal.search.toLowerCase()))}
            keyExtractor={(r: any) => r.id}
            renderItem={({item}: any) => (
              <TouchableOpacity style={styles.modalRow} onPress={() => nominatePartner(item.student_id)}>
                <Text style={styles.modalRowText}>{item.player1?.full_name}</Text>
                <Text style={styles.modalRowSub}>{item.division}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={{color:'#7A8FA6',textAlign:'center',paddingVertical:24}}>No available players</Text>}
          />
        </View>
      </Modal>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusLabel(status: string) {
  const map: Record<string, string> = {
    draft: 'Draft', registration_open: 'Registration Open', registration_closed: 'Registration Closed',
    in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled',
  };
  return map[status] ?? status;
}

function statusColor(status: string) {
  const map: Record<string, string> = {
    draft: '#6B7280', registration_open: '#16A34A', registration_closed: '#D97706',
    in_progress: '#2563EB', completed: '#7C3AED', cancelled: '#DC2626',
  };
  return map[status] ?? '#6B7280';
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
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
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#F0F6FC', marginBottom: 12 },
  divRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  divChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  divText: { fontSize: 12, fontWeight: '600' },

  regCard: { flexDirection: 'row', alignItems: 'center', gap: 12, margin: 20, borderRadius: 14, padding: 16, borderWidth: 1 },
  regCardConfirmed: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  regCardPending: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  regCardIcon: { fontSize: 28 },
  regCardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 3 },
  regCardSub: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  withdrawBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#FCA5A5' },
  withdrawBtnText: { color: '#DC2626', fontSize: 12, fontWeight: '600' },

  registerCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  registerPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  registerPriceLabel: { fontSize: 14, color: '#374151', fontWeight: '600' },
  registerPrice: { fontSize: 26, fontWeight: '800', color: '#111827' },
  registerHint: { fontSize: 13, color: '#6B7280', lineHeight: 19, marginBottom: 16 },
  registerBtn: { backgroundColor: '#16A34A', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  registerBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  upcomingCard: { margin: 20, backgroundColor: '#EFF6FF', borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#BFDBFE' },
  upcomingIcon: { fontSize: 32, marginBottom: 8 },
  upcomingTitle: { fontSize: 16, fontWeight: '700', color: '#1E40AF', marginBottom: 6 },
  upcomingText: { fontSize: 13, color: '#1D4ED8', textAlign: 'center', lineHeight: 20 },

  fullCard: { margin: 20, backgroundColor: '#FFF7ED', borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#FED7AA' },
  fullIcon: { fontSize: 32, marginBottom: 8 },
  fullTitle: { fontSize: 16, fontWeight: '700', color: '#92400E', marginBottom: 6 },
  fullText: { fontSize: 13, color: '#78350F', textAlign: 'center', lineHeight: 20 },

  participantsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  participantsChevron: { fontSize: 13, color: '#9CA3AF', fontWeight: '700' },
  participantsList: { gap: 6 },
  participantRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  participantNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  participantNumText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  participantInfo: { flex: 1 },
  participantName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  participantDiv: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  participantRight: { alignItems: 'flex-end', gap: 4 },
  participantStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  participantStatusText: { fontSize: 11, fontWeight: '700' },
  participantMethod: { fontSize: 10, color: '#9CA3AF' },
  confirmRegBtn: { backgroundColor: '#ECFDF5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#A7F3D0' },
  confirmRegBtnText: { fontSize: 12, fontWeight: '700', color: '#16A34A' },

  // Teams section
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(17,30,51,0.6)', borderRadius: 10, padding: 10, marginBottom: 6 },
  teamPlayerName: { fontSize: 14, fontWeight: '700', color: '#F0F6FC' },
  teamPartnerName: { fontSize: 12, color: '#7A8FA6' },
  teamDivBadge: { backgroundColor: '#1E3A5F', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  teamDivBadgeText: { fontSize: 10, color: '#93C5FD', fontWeight: '600' },
  seedBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' },
  seedBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Next match
  nextMatchCard: { backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#F59E0B' },
  nextMatchHeader: { fontSize: 14, fontWeight: '800', color: '#F59E0B', marginBottom: 8 },
  nextMatchVsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  nextMatchTeam: { flex: 1, fontSize: 14, fontWeight: '700', color: '#F0F6FC' },
  vsTextAmber: { fontSize: 12, color: '#F59E0B' },
  nextMatchMeta: { fontSize: 12, color: '#D97706', marginTop: 2 },

  // Partner nomination
  nominateBtn: { backgroundColor: 'rgba(59,130,246,0.2)', borderRadius: 10, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: '#3B82F6' },
  nominateBtnText: { color: '#3B82F6', fontWeight: '700', fontSize: 14 },
  partnerConfirmedCard: { backgroundColor: 'rgba(22,163,74,0.15)', borderRadius: 10, paddingVertical: 11, paddingHorizontal: 16, borderWidth: 1, borderColor: '#16A34A' },
  partnerConfirmedText: { color: '#16A34A', fontWeight: '600', fontSize: 14 },

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

  // Partner modal
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#F0F6FC' },
  modalCancel: { fontSize: 15, color: '#7A8FA6' },
  modalSearch: { margin: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 12, color: '#F0F6FC', fontSize: 15 },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  modalRowText: { fontSize: 15, color: '#F0F6FC', fontWeight: '600' },
  modalRowSub: { fontSize: 12, color: '#7A8FA6' },
});
