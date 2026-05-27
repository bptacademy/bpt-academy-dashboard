import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, Modal, TextInput, Image, Dimensions} from 'react-native';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { supabase } from '../../lib/supabase';
import { Tournament, TournamentStatus, Division, DIVISION_LABELS } from '../../types';
import ScreenHeader from '../../components/common/ScreenHeader';
import LTASection from '../../components/common/LTASection';

const BG = require('../../../assets/bg.png');
const { width, height } = Dimensions.get('window');

const ALL_DIVISIONS: Division[] = ['amateur', 'semi_pro', 'pro', 'junior_9_11', 'junior_12_15', 'junior_15_18'];

const ALL_DRAWS = [
  { value: 'mens',   label: "Men's" },
  { value: 'womens', label: "Women's" },
  { value: 'mixed',  label: 'Mixed' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  upcoming:           { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B' },
  registration_open:  { bg: 'rgba(22,163,74,0.15)',  text: '#4ADE80' },
  ongoing:            { bg: 'rgba(59,130,246,0.15)',  text: '#60A5FA' },
  completed:          { bg: 'rgba(107,114,128,0.15)', text: '#9CA3AF' },
};

const STATUS_CYCLE: TournamentStatus[] = ['upcoming', 'registration_open', 'ongoing', 'completed'];

const DRAW_LABELS: Record<string, string> = { mens: "Men's", womens: "Women's", mixed: 'Mixed' };

export default function TournamentManageScreen({ navigation }: any) {
  const tabBarPadding = useTabBarPadding();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [registrationCounts, setRegistrationCounts] = useState<Record<string, number>>({});
  const [form, setForm] = useState({
    title: '', description: '', start_date: '', end_date: '',
    location: '', entry_fee_gbp: '', max_participants: '',
    registration_deadline: '', registration_opens_at: '',
    eligible_divisions: ['semi_pro', 'pro'] as Division[],
    draws: ['mens', 'womens'] as string[],
  });

  const fetchTournaments = async () => {
    const { data } = await supabase.from('tournaments').select('*').order('start_date');
    if (data) setTournaments(data as Tournament[]);
    const counts: Record<string, number> = {};
    await Promise.all((data ?? []).map(async (t: any) => {
      const { count } = await supabase
        .from('tournament_registrations')
        .select('id', { count: 'exact', head: true })
        .eq('tournament_id', t.id).neq('status', 'withdrawn');
      counts[t.id] = count ?? 0;
    }));
    setRegistrationCounts(counts);
  };

  const onRefresh = async () => { setRefreshing(true); await fetchTournaments(); setRefreshing(false); };
  useEffect(() => { fetchTournaments(); }, []);

  const handleCreate = async () => {
    if (!form.title || !form.start_date) { Alert.alert('Error', 'Title and start date are required'); return; }
    if (form.draws.length === 0) { Alert.alert('Error', 'Select at least one draw (Men\'s / Women\'s / Mixed)'); return; }
    const { error } = await supabase.from('tournaments').insert({
      title: form.title,
      description: form.description || null,
      start_date: form.start_date,
      end_date: form.end_date || null,
      location: form.location || null,
      entry_fee_gbp: parseFloat(form.entry_fee_gbp) || 0,
      max_participants: form.max_participants ? parseInt(form.max_participants) : null,
      registration_deadline: form.registration_deadline || null,
      registration_opens_at: form.registration_opens_at || null,
      eligible_divisions: form.eligible_divisions,
      draws: form.draws,
      status: 'upcoming',
    });
    if (error) { Alert.alert('Error', error.message); return; }
    setModalVisible(false);
    resetForm();
    fetchTournaments();
  };

  const resetForm = () => setForm({
    title: '', description: '', start_date: '', end_date: '',
    location: '', entry_fee_gbp: '', max_participants: '',
    registration_deadline: '', registration_opens_at: '',
    eligible_divisions: ['semi_pro', 'pro'],
    draws: ['mens', 'womens'],
  });

  const cycleStatus = async (t: Tournament) => {
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(t.status as TournamentStatus) + 1) % STATUS_CYCLE.length];
    const label = next.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    Alert.alert('Update Status', `Change status to "${label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: async () => {
        await supabase.from('tournaments').update({ status: next }).eq('id', t.id);
        fetchTournaments();
      }},
    ]);
  };

  const toggleDivision = (div: Division) => {
    setForm(f => ({
      ...f,
      eligible_divisions: f.eligible_divisions.includes(div)
        ? f.eligible_divisions.filter(d => d !== div)
        : [...f.eligible_divisions, div],
    }));
  };

  const toggleDraw = (draw: string) => {
    setForm(f => ({
      ...f,
      draws: f.draws.includes(draw)
        ? f.draws.filter(d => d !== draw)
        : [...f.draws, draw],
    }));
  };

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <View style={styles.container}>
      <Image source={BG} style={styles.bgImage} resizeMode="cover" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: tabBarPadding }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Tournaments" />
        <LTASection />

        <View style={styles.academyHeader}>
          <Text style={styles.academyTitle}>🎾 BPT Academy Tournaments</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => { resetForm(); setModalVisible(true); }}>
            <Text style={styles.addBtnText}>+ New</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.list}>
          {tournaments.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No academy tournaments yet.</Text>
            </View>
          )}
          {tournaments.map(t => {
            const sc = STATUS_COLORS[t.status] ?? { bg: 'rgba(107,114,128,0.15)', text: '#9CA3AF' };
            const regOpensAt = (t as any).registration_opens_at;
            const now = new Date();
            const regOpen = t.status === 'registration_open' || (regOpensAt && new Date(regOpensAt) <= now);
            const draws: string[] = (t as any).draws ?? [];
            return (
              <View key={t.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <TouchableOpacity style={[styles.statusBadge, { backgroundColor: sc.bg }]} onPress={() => cycleStatus(t)}>
                    <Text style={[styles.statusText, { color: sc.text }]}>
                      {t.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())} ›
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.regCount}>{registrationCounts[t.id] ?? 0}/{t.max_participants ?? '∞'}</Text>
                </View>

                <Text style={styles.cardTitle}>{t.title}</Text>
                <Text style={styles.cardMeta}>📅 {formatDate(t.start_date)}{t.end_date ? ` – ${formatDate(t.end_date)}` : ''}</Text>
                {t.location && <Text style={styles.cardMeta}>📍 {t.location}</Text>}
                <Text style={styles.cardMeta}>💰 {t.entry_fee_gbp > 0 ? `£${t.entry_fee_gbp}` : 'Free'}</Text>
                {t.registration_deadline && (
                  <Text style={styles.cardMeta}>⏰ Deadline: {formatDate(t.registration_deadline)}</Text>
                )}
                {regOpensAt && (
                  <Text style={[styles.cardMeta, { color: regOpen ? '#4ADE80' : '#F59E0B' }]}>
                    🗓 Registration opens: {formatDate(regOpensAt)}{regOpen ? ' ✅' : ' ⏳'}
                  </Text>
                )}

                {/* Draws chips */}
                {draws.length > 0 && (
                  <View style={styles.drawTags}>
                    {draws.map(d => (
                      <View key={d} style={[styles.drawTag, d === 'mens' ? styles.drawTagMens : d === 'womens' ? styles.drawTagWomens : styles.drawTagMixed]}>
                        <Text style={styles.drawTagText}>{DRAW_LABELS[d] ?? d}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.divTags}>
                  {t.eligible_divisions.map((d: string) => (
                    <View key={d} style={styles.divTag}>
                      <Text style={styles.divTagText}>{DIVISION_LABELS[d as Division] ?? d}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.cardActionBtn, { backgroundColor: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.3)' }]}
                    onPress={() => navigation.navigate('TournamentDetail', { tournamentId: t.id })}
                  >
                    <Text style={[styles.cardActionBtnText, { color: '#60A5FA' }]}>👥 Registrations</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cardActionBtn, { backgroundColor: 'rgba(22,163,74,0.15)', borderColor: 'rgba(22,163,74,0.3)' }]}
                    onPress={() => navigation.navigate('TournamentDraw', { tournamentId: t.id, tournamentTitle: t.title, draws })}
                  >
                    <Text style={[styles.cardActionBtnText, { color: '#4ADE80' }]}>🏆 Draw</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Create Tournament Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelBtn}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Tournament</Text>
            <TouchableOpacity onPress={handleCreate}>
              <Text style={styles.saveBtn}>Create</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.form}>
            {[
              { label: 'Title *', key: 'title', placeholder: 'BPT Spring Open' },
              { label: 'Description', key: 'description', placeholder: 'Tournament details...' },
              { label: 'Start Date *', key: 'start_date', placeholder: 'YYYY-MM-DD' },
              { label: 'End Date', key: 'end_date', placeholder: 'YYYY-MM-DD' },
              { label: 'Registration Opens On', key: 'registration_opens_at', placeholder: 'YYYY-MM-DD' },
              { label: 'Registration Deadline', key: 'registration_deadline', placeholder: 'YYYY-MM-DD' },
              { label: 'Location', key: 'location', placeholder: 'London, UK' },
              { label: 'Entry Fee (£)', key: 'entry_fee_gbp', placeholder: '0', keyboardType: 'decimal-pad' },
              { label: 'Max Participants', key: 'max_participants', placeholder: '32', keyboardType: 'numeric' },
            ].map(({ label, key, placeholder, keyboardType }) => (
              <View key={key}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  style={styles.input}
                  value={(form as any)[key]}
                  onChangeText={(v) => setForm(f => ({ ...f, [key]: v }))}
                  placeholder={placeholder}
                  placeholderTextColor="#4B5563"
                  keyboardType={(keyboardType as any) ?? 'default'}
                />
              </View>
            ))}

            {/* Draws */}
            <Text style={styles.label}>Draws *</Text>
            <Text style={styles.labelHint}>Select which draws this tournament has</Text>
            <View style={styles.divGrid}>
              {ALL_DRAWS.map(({ value, label }) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.divChip, form.draws.includes(value) && styles.divChipActive]}
                  onPress={() => toggleDraw(value)}
                >
                  <Text style={[styles.divChipText, form.draws.includes(value) && styles.divChipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Eligible Divisions */}
            <Text style={styles.label}>Eligible Divisions</Text>
            <View style={styles.divGrid}>
              {ALL_DIVISIONS.map(div => (
                <TouchableOpacity
                  key={div}
                  style={[styles.divChip, form.eligible_divisions.includes(div) && styles.divChipActive]}
                  onPress={() => toggleDivision(div)}
                >
                  <Text style={[styles.divChipText, form.eligible_divisions.includes(div) && styles.divChipTextActive]}>
                    {DIVISION_LABELS[div]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bgImage: { position: 'absolute', top: 0, left: 0, width, height },
  container: { flex: 1, backgroundColor: '#0B1628' },
  academyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  academyTitle: { fontSize: 16, fontWeight: '700', color: '#F0F6FC' },
  addBtn: { backgroundColor: '#3B82F6', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { backgroundColor: 'rgba(17,30,51,0.85)', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  regCount: { fontSize: 12, color: '#7A8FA6', fontWeight: '600' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#F0F6FC', marginBottom: 6 },
  cardMeta: { fontSize: 13, color: '#7A8FA6', marginBottom: 3 },
  drawTags: { flexDirection: 'row', gap: 6, marginTop: 8, marginBottom: 4 },
  drawTag: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  drawTagMens: { backgroundColor: 'rgba(59,130,246,0.2)' },
  drawTagWomens: { backgroundColor: 'rgba(236,72,153,0.2)' },
  drawTagMixed: { backgroundColor: 'rgba(168,85,247,0.2)' },
  drawTagText: { fontSize: 11, fontWeight: '700', color: '#F0F6FC' },
  divTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  divTag: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  divTagText: { fontSize: 11, color: '#7A8FA6' },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#7A8FA6', fontSize: 14 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  cardActionBtn: { flex: 1, borderRadius: 8, paddingVertical: 9, alignItems: 'center', borderWidth: 1 },
  cardActionBtnText: { fontSize: 13, fontWeight: '700' },
  // Modal
  modal: { flex: 1, backgroundColor: '#0B1628' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#F0F6FC' },
  cancelBtn: { fontSize: 16, color: '#7A8FA6' },
  saveBtn: { fontSize: 16, color: '#3B82F6', fontWeight: '700' },
  form: { padding: 20, gap: 4 },
  label: { fontSize: 14, fontWeight: '600', color: '#F0F6FC', marginBottom: 6, marginTop: 8 },
  labelHint: { fontSize: 12, color: '#7A8FA6', marginBottom: 8, marginTop: -4 },
  input: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 14, fontSize: 15, color: '#F0F6FC', backgroundColor: 'rgba(17,30,51,0.85)', marginBottom: 4 },
  divGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  divChip: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.05)' },
  divChipActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  divChipText: { fontSize: 13, color: '#7A8FA6' },
  divChipTextActive: { color: '#FFFFFF', fontWeight: '600' },
});
