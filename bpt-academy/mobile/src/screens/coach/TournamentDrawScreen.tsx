import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal,
  TextInput, Alert, Image, Dimensions, FlatList, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import BackHeader from '../../components/common/BackHeader';

const { width, height } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────
interface Reg {
  id: string; student_id: string; partner_id: string | null;
  team_name: string | null; seed: number | null; division: string;
  status: string;
  player1: { full_name: string } | null;
  partner: { full_name: string } | null;
}
interface Match {
  id: string; round: string; court: string | null; scheduled_at: string | null;
  score: string | null; winner_id: string | null; notes: string | null;
  team1_registration_id: string | null; team2_registration_id: string | null;
  played_at: string | null;
}

const ROUND_CHIPS = ['Group A','Group B','Group C','Round of 16','Quarter Final','Semi Final','Final'];

function getTeamLabel(reg: Reg | undefined): string {
  if (!reg) return 'TBD';
  if (reg.team_name) return reg.team_name;
  const p1 = reg.player1?.full_name ?? '?';
  const p2 = reg.partner?.full_name;
  return p2 ? `${p1} & ${p2}` : p1;
}

export default function TournamentDrawScreen({ navigation, route }: any) {
  const { tournamentId, tournamentTitle } = route.params;
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'Teams'|'Matches'|'Results'>('Teams');
  const [regs, setRegs] = useState<Reg[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [allStudents, setAllStudents] = useState<{id:string;full_name:string}[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [partnerModal, setPartnerModal] = useState<{visible:boolean;regId:string;search:string}>({visible:false,regId:'',search:''});
  const [addPlayerModal, setAddPlayerModal] = useState<{visible:boolean;search:string;replaceId?:string}>({visible:false,search:''});
  const [matchModal, setMatchModal] = useState<{visible:boolean;editMatch?:Match;t1:string;t2:string;round:string;court:string;datetime:string;notes:string}>({visible:false,t1:'',t2:'',round:'',court:'',datetime:'',notes:''});
  const [resultState, setResultState] = useState<Record<string,{score:string;winner:string}>>({});

  const load = useCallback(async () => {
    const [rRes, mRes] = await Promise.all([
      supabase.from('tournament_registrations')
        .select('id, student_id, partner_id, team_name, seed, division, status, player1:profiles!student_id(full_name), partner:profiles!partner_id(full_name)')
        .eq('tournament_id', tournamentId)
        .order('seed', { nullsFirst: false }),
      supabase.from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('created_at'),
    ]);
    if (rRes.data) setRegs(rRes.data as any);
    if (mRes.data) setMatches(mRes.data as any);
    setLoading(false);
  }, [tournamentId]);

  const loadStudents = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('id, full_name').eq('role', 'student').order('full_name');
    if (data) setAllStudents(data);
  }, []);

  useEffect(() => { load(); loadStudents(); }, [load, loadStudents]);

  // ─── TEAMS TAB ───────────────────────────────────────────────────────────────
  const confirmedRegs = regs.filter(r => r.status === 'confirmed');
  const withdrawnRegs = regs.filter(r => r.status === 'withdrawn');
  const playerCount = confirmedRegs.reduce((acc, r) => acc + 1 + (r.partner_id ? 1 : 0), 0);

  const openPartnerModal = (regId: string) => setPartnerModal({visible:true,regId,search:''});

  const setPartner = async (regId: string, partnerId: string) => {
    await supabase.from('tournament_registrations').update({ partner_id: partnerId }).eq('id', regId);
    setPartnerModal({visible:false,regId:'',search:''});
    load();
  };

  const setSeed = (reg: Reg) => {
    Alert.prompt('Set Seed', `Seed number for ${reg.player1?.full_name ?? 'player'}:`, async (val) => {
      if (!val) return;
      const n = parseInt(val);
      if (isNaN(n)) { Alert.alert('Invalid', 'Enter a number'); return; }
      await supabase.from('tournament_registrations').update({ seed: n }).eq('id', reg.id);
      load();
    }, 'plain-text', reg.seed?.toString() ?? '');
  };

  const removeReg = (reg: Reg) => {
    Alert.alert('Remove Player', `Remove ${reg.player1?.full_name}? This cannot be undone.`, [
      {text:'Cancel',style:'cancel'},
      {text:'Remove',style:'destructive', onPress: async () => {
        await supabase.from('tournament_registrations').update({ status: 'withdrawn' }).eq('id', reg.id);
        if (reg.partner_id) {
          // Unpair partner registrations that point to this player
          await supabase.from('tournament_registrations').update({ partner_id: null })
            .eq('tournament_id', tournamentId).eq('partner_id', reg.student_id);
        }
        load();
      }},
    ]);
  };

  const addPlayer = async (student: {id:string;full_name:string}, replaceId?: string) => {
    setAddPlayerModal({visible:false,search:''});
    if (replaceId) {
      await supabase.from('tournament_registrations').update({ student_id: student.id, status: 'confirmed', partner_id: null }).eq('id', replaceId);
    } else {
      await supabase.from('tournament_registrations').insert({ tournament_id: tournamentId, student_id: student.id, status: 'confirmed' });
    }
    load();
  };

  // students not currently registered (confirmed)
  const registeredIds = new Set(confirmedRegs.map(r => r.student_id));
  const unregisteredStudents = allStudents.filter(s => !registeredIds.has(s.id));

  // students available as partner (not already partnered in someone else's reg)
  const pairedPartnerIds = new Set(confirmedRegs.filter(r => r.partner_id).map(r => r.partner_id));
  const availablePartners = confirmedRegs.filter(r => !pairedPartnerIds.has(r.student_id) && r.student_id !== partnerModal.regId);

  // ─── MATCHES TAB ─────────────────────────────────────────────────────────────
  const rounds = [...new Set(matches.map(m => m.round))];

  const openAddMatch = () => setMatchModal({visible:true,t1:'',t2:'',round:'',court:'',datetime:'',notes:''});
  const openEditMatch = (m: Match) => setMatchModal({visible:true,editMatch:m,t1:m.team1_registration_id??'',t2:m.team2_registration_id??'',round:m.round,court:m.court??'',datetime:m.scheduled_at ? new Date(m.scheduled_at).toLocaleString('en-GB',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).replace(',','') : '',notes:m.notes??''});

  const saveMatch = async () => {
    const { t1, t2, round, court, datetime, notes, editMatch } = matchModal;
    if (!t1 || !t2 || !round) { Alert.alert('Required', 'Select both teams and a round'); return; }
    let scheduled_at: string | null = null;
    if (datetime.trim()) {
      // parse "DD/MM/YYYY HH:MM"
      const [datePart, timePart] = datetime.trim().split(' ');
      if (datePart && timePart) {
        const [d,mo,y] = datePart.split('/');
        scheduled_at = new Date(`${y}-${mo}-${d}T${timePart}:00`).toISOString();
      }
    }
    const payload = { tournament_id: tournamentId, team1_registration_id: t1, team2_registration_id: t2, round, court: court||null, scheduled_at, notes: notes||null };
    if (editMatch) {
      await supabase.from('tournament_matches').update(payload).eq('id', editMatch.id);
    } else {
      await supabase.from('tournament_matches').insert(payload);
    }
    setMatchModal({visible:false,t1:'',t2:'',round:'',court:'',datetime:'',notes:''});
    load();
  };

  const deleteMatch = (id: string) => {
    Alert.alert('Delete Match', 'Remove this match?', [
      {text:'Cancel',style:'cancel'},
      {text:'Delete',style:'destructive',onPress:async()=>{ await supabase.from('tournament_matches').delete().eq('id',id); load(); }},
    ]);
  };

  // ─── RESULTS TAB ─────────────────────────────────────────────────────────────
  const completedCount = matches.filter(m => m.winner_id).length;

  const saveResult = async (m: Match) => {
    const st = resultState[m.id];
    if (!st?.score || !st?.winner) { Alert.alert('Required', 'Enter score and select winner'); return; }
    const winnerReg = confirmedRegs.find(r => r.id === st.winner);
    if (!winnerReg) return;
    await supabase.from('tournament_matches').update({
      score: st.score,
      winner_id: winnerReg.student_id,
      played_at: new Date().toISOString(),
      // also set legacy player ids
      player1_id: confirmedRegs.find(r => r.id === m.team1_registration_id)?.student_id ?? null,
      player2_id: confirmedRegs.find(r => r.id === m.team2_registration_id)?.student_id ?? null,
    }).eq('id', m.id);
    load();
  };

  const regById = (id: string | null) => confirmedRegs.find(r => r.id === id);

  // ─── RENDER ───────────────────────────────────────────────────────────────────
  if (loading) return (
    <View style={s.root}>
      <Image source={require('../../../assets/bg.png')} style={s.bg} resizeMode="cover" />
      <BackHeader title={tournamentTitle ?? 'Draw'} />
      <ActivityIndicator color="#3B82F6" style={{marginTop:60}} />
    </View>
  );

  return (
    <View style={s.root}>
      <Image source={require('../../../assets/bg.png')} style={s.bg} resizeMode="cover" />
      <BackHeader title={`${tournamentTitle ?? 'Draw'} — Draw`} />

      {/* Tab bar */}
      <View style={s.tabBar}>
        {(['Teams','Matches','Results'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tabBtn, tab===t && s.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabBtnText, tab===t && s.tabBtnTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── TEAMS ── */}
      {tab === 'Teams' && (
        <View style={{flex:1}}>
          <ScrollView style={{flex:1}} contentContainerStyle={{padding:16,paddingBottom:100}}>
            <Text style={s.summaryText}>{confirmedRegs.length} teams · {playerCount} players</Text>

            {confirmedRegs.map(reg => (
              <View key={reg.id} style={s.teamCard}>
                <View style={s.teamCardRow}>
                  <View style={[s.seedBadge, !reg.seed && s.seedBadgeGrey]}>
                    <Text style={s.seedBadgeText}>{reg.seed ?? '?'}</Text>
                  </View>
                  <View style={{flex:1}}>
                    <Text style={s.playerName}>{reg.player1?.full_name ?? '—'}</Text>
                    {reg.partner_id
                      ? <Text style={s.partnerName}>& {reg.partner?.full_name}</Text>
                      : <Text style={s.noPartner}>⚠️ No partner</Text>}
                  </View>
                  <View style={[s.divBadge]}>
                    <Text style={s.divBadgeText}>{reg.division}</Text>
                  </View>
                </View>
                <View style={s.actionRow}>
                  <TouchableOpacity style={s.actionBtn} onPress={() => openPartnerModal(reg.id)}>
                    <Text style={s.actionBtnText}>👤 Partner</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.actionBtn} onPress={() => setSeed(reg)}>
                    <Text style={s.actionBtnText}>🔢 Seed</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.actionBtn,s.actionBtnDanger]} onPress={() => removeReg(reg)}>
                    <Text style={[s.actionBtnText,{color:'#EF4444'}]}>🗑 Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {withdrawnRegs.length > 0 && (
              <>
                <Text style={[s.summaryText,{marginTop:16}]}>Withdrawn</Text>
                {withdrawnRegs.map(reg => (
                  <View key={reg.id} style={[s.teamCard,{opacity:0.6}]}>
                    <View style={s.teamCardRow}>
                      <Text style={[s.playerName,{flex:1}]}>{reg.player1?.full_name ?? '—'}</Text>
                      <View style={[s.divBadge,{backgroundColor:'#374151'}]}>
                        <Text style={s.divBadgeText}>Withdrawn</Text>
                      </View>
                    </View>
                    <TouchableOpacity style={[s.actionBtn,{marginTop:8}]} onPress={() => setAddPlayerModal({visible:true,search:'',replaceId:reg.id})}>
                      <Text style={s.actionBtnText}>🔄 Replace Player</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
          </ScrollView>

          {/* Floating + Add Player */}
          <TouchableOpacity style={s.fab} onPress={() => setAddPlayerModal({visible:true,search:''})}>
            <Text style={s.fabText}>+ Add Player</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── MATCHES ── */}
      {tab === 'Matches' && (
        <ScrollView style={{flex:1}} contentContainerStyle={{padding:16,paddingBottom:80}}>
          <TouchableOpacity style={s.addMatchBtn} onPress={openAddMatch}>
            <Text style={s.addMatchBtnText}>＋ Add Match</Text>
          </TouchableOpacity>
          {rounds.length === 0 && <Text style={s.emptyText}>No matches yet. Tap + Add Match to start.</Text>}
          {rounds.map(round => (
            <View key={round} style={{marginBottom:16}}>
              <Text style={s.roundLabel}>{round}</Text>
              {matches.filter(m => m.round === round).map(m => {
                const t1 = regById(m.team1_registration_id);
                const t2 = regById(m.team2_registration_id);
                return (
                  <View key={m.id} style={s.matchCard}>
                    <View style={s.matchVsRow}>
                      <View style={{flex:1}}>
                        <Text style={s.matchTeamName}>{getTeamLabel(t1)}</Text>
                        {t1?.partner && <Text style={s.matchTeamSub}>{t1.partner.full_name}</Text>}
                      </View>
                      <Text style={s.vsText}>vs</Text>
                      <View style={{flex:1,alignItems:'flex-end'}}>
                        <Text style={[s.matchTeamName,{textAlign:'right'}]}>{getTeamLabel(t2)}</Text>
                        {t2?.partner && <Text style={[s.matchTeamSub,{textAlign:'right'}]}>{t2.partner.full_name}</Text>}
                      </View>
                    </View>
                    <View style={s.matchMeta}>
                      {m.court && <Text style={s.matchMetaText}>🎾 {m.court}</Text>}
                      {m.scheduled_at && <Text style={s.matchMetaText}>🕐 {new Date(m.scheduled_at).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</Text>}
                    </View>
                    <View style={s.matchActions}>
                      <TouchableOpacity style={s.actionBtn} onPress={() => openEditMatch(m)}><Text style={s.actionBtnText}>✏️ Edit</Text></TouchableOpacity>
                      <TouchableOpacity style={[s.actionBtn,s.actionBtnDanger]} onPress={() => deleteMatch(m.id)}><Text style={[s.actionBtnText,{color:'#EF4444'}]}>🗑 Delete</Text></TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── RESULTS ── */}
      {tab === 'Results' && (
        <ScrollView style={{flex:1}} contentContainerStyle={{padding:16,paddingBottom:80}}>
          <Text style={s.summaryText}>{completedCount} / {matches.length} matches completed</Text>
          {matches.map(m => {
            const t1 = regById(m.team1_registration_id);
            const t2 = regById(m.team2_registration_id);
            const st = resultState[m.id] ?? {score: m.score ?? '', winner: m.winner_id ? (confirmedRegs.find(r => r.student_id === m.winner_id)?.id ?? '') : ''};
            const done = !!m.winner_id;
            const winnerReg = done ? confirmedRegs.find(r => r.student_id === m.winner_id) : null;
            return (
              <View key={m.id} style={s.resultCard}>
                <View style={s.matchVsRow}>
                  <View style={{flex:1}}>
                    <Text style={[s.matchTeamName, winnerReg?.id === t1?.id && s.winnerText]}>{getTeamLabel(t1)}</Text>
                    {t1?.partner && <Text style={s.matchTeamSub}>{t1.partner.full_name}</Text>}
                  </View>
                  <Text style={done ? s.scoreLarge : s.vsText}>{done ? m.score : 'vs'}</Text>
                  <View style={{flex:1,alignItems:'flex-end'}}>
                    <Text style={[s.matchTeamName,{textAlign:'right'}, winnerReg?.id === t2?.id && s.winnerText]}>{getTeamLabel(t2)}</Text>
                    {t2?.partner && <Text style={[s.matchTeamSub,{textAlign:'right'}]}>{t2.partner.full_name}</Text>}
                  </View>
                </View>
                {!done && (
                  <>
                    <TextInput
                      style={s.scoreInput}
                      placeholder="e.g. 6-3 7-5"
                      placeholderTextColor="#7A8FA6"
                      value={st.score}
                      onChangeText={v => setResultState(prev => ({...prev,[m.id]:{...st,score:v}}))}
                    />
                    <View style={s.winnerBtns}>
                      <TouchableOpacity style={[s.winnerBtn, st.winner===t1?.id && s.winnerBtnActive]} onPress={() => t1 && setResultState(prev => ({...prev,[m.id]:{...st,winner:t1.id}}))}>
                        <Text style={[s.winnerBtnText, st.winner===t1?.id && {color:'#fff'}]}>{getTeamLabel(t1)} Wins</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.winnerBtn, st.winner===t2?.id && s.winnerBtnActive]} onPress={() => t2 && setResultState(prev => ({...prev,[m.id]:{...st,winner:t2.id}}))}>
                        <Text style={[s.winnerBtnText, st.winner===t2?.id && {color:'#fff'}]}>{getTeamLabel(t2)} Wins</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={s.saveResultBtn} onPress={() => saveResult(m)}>
                      <Text style={s.saveResultBtnText}>Save Result</Text>
                    </TouchableOpacity>
                  </>
                )}
                {done && winnerReg && (
                  <Text style={s.winnerLabel}>🏆 {getTeamLabel(winnerReg)}</Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ─── PARTNER MODAL ─── */}
      <Modal visible={partnerModal.visible} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modalContainer}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setPartnerModal({visible:false,regId:'',search:''})}><Text style={s.cancelBtn}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>Set Partner</Text>
            <View style={{width:60}} />
          </View>
          <TextInput style={s.searchInput} placeholder="Search by name…" placeholderTextColor="#7A8FA6" value={partnerModal.search} onChangeText={v => setPartnerModal(p => ({...p,search:v}))} />
          <FlatList
            data={availablePartners.filter(r => (r.player1?.full_name ?? '').toLowerCase().includes(partnerModal.search.toLowerCase()))}
            keyExtractor={r => r.id}
            renderItem={({item}) => (
              <TouchableOpacity style={s.listRow} onPress={() => setPartner(partnerModal.regId, item.student_id)}>
                <Text style={s.listRowText}>{item.player1?.full_name}</Text>
                <Text style={s.listRowSub}>{item.division}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={s.emptyText}>No available players</Text>}
          />
        </View>
      </Modal>

      {/* ─── ADD PLAYER MODAL ─── */}
      <Modal visible={addPlayerModal.visible} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modalContainer}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setAddPlayerModal({visible:false,search:''})}><Text style={s.cancelBtn}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>{addPlayerModal.replaceId ? 'Replace Player' : 'Add Player'}</Text>
            <View style={{width:60}} />
          </View>
          <TextInput style={s.searchInput} placeholder="Search by name…" placeholderTextColor="#7A8FA6" value={addPlayerModal.search} onChangeText={v => setAddPlayerModal(p => ({...p,search:v}))} />
          <FlatList
            data={unregisteredStudents.filter(s => s.full_name.toLowerCase().includes(addPlayerModal.search.toLowerCase()))}
            keyExtractor={s => s.id}
            renderItem={({item}) => (
              <TouchableOpacity style={s.listRow} onPress={() => addPlayer(item, addPlayerModal.replaceId)}>
                <Text style={s.listRowText}>{item.full_name}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={s.emptyText}>No unregistered students found</Text>}
          />
        </View>
      </Modal>

      {/* ─── MATCH MODAL ─── */}
      <Modal visible={matchModal.visible} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={s.modalContainer}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setMatchModal({visible:false,t1:'',t2:'',round:'',court:'',datetime:'',notes:''})}><Text style={s.cancelBtn}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>{matchModal.editMatch ? 'Edit Match' : 'Add Match'}</Text>
            <TouchableOpacity onPress={saveMatch}><Text style={s.saveBtn}>Save</Text></TouchableOpacity>
          </View>
          <View style={{padding:16,gap:12}}>
            <Text style={s.fieldLabel}>Team 1</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:4}}>
              {confirmedRegs.map(r => (
                <TouchableOpacity key={r.id} style={[s.teamChip, matchModal.t1===r.id && s.teamChipActive]} onPress={() => setMatchModal(p => ({...p,t1:r.id}))}>
                  <Text style={[s.teamChipText, matchModal.t1===r.id && {color:'#fff'}]}>{getTeamLabel(r)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.fieldLabel}>Team 2</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:4}}>
              {confirmedRegs.map(r => (
                <TouchableOpacity key={r.id} style={[s.teamChip, matchModal.t2===r.id && s.teamChipActive]} onPress={() => setMatchModal(p => ({...p,t2:r.id}))}>
                  <Text style={[s.teamChipText, matchModal.t2===r.id && {color:'#fff'}]}>{getTeamLabel(r)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.fieldLabel}>Round</Text>
            <View style={s.chipRow}>
              {ROUND_CHIPS.map(rc => (
                <TouchableOpacity key={rc} style={[s.roundChip, matchModal.round===rc && s.roundChipActive]} onPress={() => setMatchModal(p => ({...p,round:rc}))}>
                  <Text style={[s.roundChipText, matchModal.round===rc && {color:'#fff'}]}>{rc}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={s.input} placeholder="Or type custom round…" placeholderTextColor="#7A8FA6" value={matchModal.round} onChangeText={v => setMatchModal(p => ({...p,round:v}))} />

            <Text style={s.fieldLabel}>Court</Text>
            <TextInput style={s.input} placeholder="e.g. Court 1" placeholderTextColor="#7A8FA6" value={matchModal.court} onChangeText={v => setMatchModal(p => ({...p,court:v}))} />

            <Text style={s.fieldLabel}>Date & Time</Text>
            <TextInput style={s.input} placeholder="e.g. 23/05/2026 14:30" placeholderTextColor="#7A8FA6" value={matchModal.datetime} onChangeText={v => setMatchModal(p => ({...p,datetime:v}))} />

            <Text style={s.fieldLabel}>Notes (optional)</Text>
            <TextInput style={[s.input,{height:72,textAlignVertical:'top'}]} placeholder="Any notes…" placeholderTextColor="#7A8FA6" multiline value={matchModal.notes} onChangeText={v => setMatchModal(p => ({...p,notes:v}))} />
            <View style={{height:40}} />
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B1628' },
  bg: { position: 'absolute', top: 0, left: 0, width, height },
  tabBar: { flexDirection: 'row', backgroundColor: 'rgba(17,30,51,0.85)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#3B82F6' },
  tabBtnText: { fontSize: 14, color: '#7A8FA6', fontWeight: '600' },
  tabBtnTextActive: { color: '#3B82F6' },
  summaryText: { fontSize: 13, color: '#7A8FA6', marginBottom: 12 },
  teamCard: { backgroundColor: 'rgba(17,30,51,0.85)', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  teamCardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  seedBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' },
  seedBadgeGrey: { backgroundColor: '#374151' },
  seedBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  playerName: { fontSize: 15, fontWeight: '700', color: '#F0F6FC' },
  partnerName: { fontSize: 13, color: '#7A8FA6', marginTop: 2 },
  noPartner: { fontSize: 13, color: '#F59E0B', marginTop: 2 },
  divBadge: { backgroundColor: '#1E40AF', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  divBadgeText: { fontSize: 10, color: '#93C5FD', fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 8, paddingVertical: 7, alignItems: 'center' },
  actionBtnDanger: { borderColor: '#7F1D1D' },
  actionBtnText: { fontSize: 12, color: '#F0F6FC', fontWeight: '600' },
  fab: { position: 'absolute', bottom: 24, right: 20, backgroundColor: '#16A34A', borderRadius: 28, paddingHorizontal: 20, paddingVertical: 14, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  addMatchBtn: { backgroundColor: '#3B82F6', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 16 },
  addMatchBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  roundLabel: { fontSize: 12, fontWeight: '800', color: '#16A34A', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  matchCard: { backgroundColor: 'rgba(17,30,51,0.85)', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  matchVsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  matchTeamName: { fontSize: 14, fontWeight: '700', color: '#F0F6FC' },
  matchTeamSub: { fontSize: 11, color: '#7A8FA6' },
  vsText: { fontSize: 12, color: '#7A8FA6', fontWeight: '600' },
  matchMeta: { flexDirection: 'row', gap: 12, marginTop: 2 },
  matchMetaText: { fontSize: 12, color: '#7A8FA6' },
  matchActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  resultCard: { backgroundColor: 'rgba(17,30,51,0.85)', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  scoreInput: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 12, color: '#F0F6FC', fontSize: 15, marginTop: 8, marginBottom: 8 },
  winnerBtns: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  winnerBtn: { flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  winnerBtnActive: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  winnerBtnText: { color: '#7A8FA6', fontWeight: '600', fontSize: 12 },
  saveResultBtn: { backgroundColor: '#3B82F6', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  saveResultBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  scoreLarge: { fontSize: 20, fontWeight: '800', color: '#F0F6FC' },
  winnerText: { color: '#16A34A' },
  winnerLabel: { fontSize: 14, color: '#16A34A', fontWeight: '700', textAlign: 'center', marginTop: 8 },
  emptyText: { color: '#7A8FA6', textAlign: 'center', paddingVertical: 24 },
  // Modals
  modalContainer: { flex: 1, backgroundColor: '#0B1628' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#F0F6FC' },
  cancelBtn: { fontSize: 15, color: '#7A8FA6' },
  saveBtn: { fontSize: 15, color: '#16A34A', fontWeight: '700' },
  searchInput: { margin: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 12, color: '#F0F6FC', fontSize: 15 },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  listRowText: { fontSize: 15, color: '#F0F6FC', fontWeight: '600' },
  listRowSub: { fontSize: 12, color: '#7A8FA6' },
  fieldLabel: { fontSize: 13, color: '#7A8FA6', fontWeight: '600', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 12, color: '#F0F6FC', fontSize: 15 },
  teamChip: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  teamChipActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  teamChipText: { color: '#7A8FA6', fontSize: 13, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  roundChip: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  roundChipActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  roundChipText: { color: '#7A8FA6', fontSize: 12, fontWeight: '600' },
});
