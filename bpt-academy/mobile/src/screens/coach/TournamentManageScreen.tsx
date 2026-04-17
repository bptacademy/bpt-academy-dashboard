import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, Modal, TextInput, Image, Dimensions} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { supabase } from '../../lib/supabase';
import { Tournament, TournamentStatus, Division, DIVISION_LABELS } from '../../types';
import ScreenHeader from '../../components/common/ScreenHeader';
import LTASection from '../../components/common/LTASection';

const ALL_DIVISIONS: Division[] = ['amateur', 'semi_pro', 'pro', 'junior_9_11', 'junior_12_15', 'junior_15_18'];

const STATUS_COLORS: Record<TournamentStatus, { bg: string; text: string }> = {
  upcoming:          { bg: '#EFF6FF', text: '#2563EB' },
  registration_open: { bg: '#F0FDF4', text: '#16A34A' },
  ongoing:           { bg: '#FFFBEB', text: '#D97706' },
  completed:         { bg: '#F3F4F6', text: '#6B7280' },
};

const STATUS_CYCLE: TournamentStatus[] = ['upcoming', 'registration_open', 'ongoing', 'completed'];

export default function TournamentManageScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const tabBarPadding = useTabBarPadding();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [registrationCounts, setRegistrationCounts] = useState<Record<string, number>>({});
  const [form, setForm] = useState({
    title: '', description: '', start_date: '', end_date: '',
    location: '', entry_fee_gbp: '', max_participants: '',
    registration_deadline: '', eligible_divisions: ['semi_pro', 'pro'] as Division[],
  });

  const fetch = async () => {
    const { data } = await supabase.from('tournaments').select('*').order('start_date');
    if (data) setTournaments(data as Tournament[]);
    const counts: Record<string, number> = {};
    await Promise.all((data ?? []).map(async (t: any) => {
      const { count } = await supabase
        .from('tournament_registrations')
        .select('id', { count: 'exact', head: true })
        .eq('tournament_id', t.id).eq('status', 'confirmed');
      counts[t.id] = count ?? 0;
    }));
    setRegistrationCounts(counts);
  };

  const onRefresh = async () => { setRefreshing(true); await fetch(); setRefreshing(false); };
  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    if (!form.title || !form.start_date) { Alert.alert('Error', 'Title and start date are required'); return; }
    const { error } = await supabase.from('tournaments').insert({
      title: form.title,
      description: form.description || null,
      start_date: form.start_date,
      end_date: form.end_date || null,
      location: form.location || null,
      entry_fee_gbp: parseFloat(form.entry_fee_gbp) || 0,
      max_participants: form.max_participants ? parseInt(form.max_participants) : null,
      registration_deadline: form.registration_deadline || null,
      eligible_divisions: form.eligible_divisions,
      status: 'upcoming',
    });
    if (error) { Alert.alert('Error', error.message); return; }
    setModalVisible(false);
    setForm({ title: '', description: '', start_date: '', end_date: '', location: '', entry_fee_gbp: '', max_participants: '', registration_deadline: '', eligible_divisions: ['semi_pro', 'pro'] });
    fetch();
  };

  const cycleStatus = async (t: Tournament) => {
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(t.status) + 1) % STATUS_CYCLE.length];
    Alert.alert('Update Status', `Change to "${next}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: async () => {
        await supabase.from('tournaments').update({ status: next }).eq('id', t.id);
        fetch();
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

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <View style={{ flex: 1 }}>
      <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />

      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Tournaments" />

        {/* LTA British Tour 2026 */}
        <LTASection />

        {/* Academy Tournaments */}
        <View style={styles.academyHeader}>
          <Text style={styles.academyTitle}>🎾 BPT Academy Tournaments</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.addBtnText}>+ New</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.list}>
          {tournaments.length === 0 && (
            <View style={styles.empty}><Text style={styles.emptyText}>No academy tournaments yet.</Text></View>
          )}
          {tournaments.map(t => {
            const sc = STATUS_COLORS[t.status];
            return (
              <View key={t.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <TouchableOpacity style={[styles.statusBadge, { backgroundColor: sc.bg }]} onPress={() => cycleStatus(t)}>
                    <Text style={[styles.statusText, { color: sc.text }]}>
                      {t.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())} ›
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.regCount}>{registrationCounts[t.id] ?? 0}/{t.max_participants ?? '∞'} registered</Text>
                </View>
                <Text style={styles.cardTitle}>{t.title}</Text>
                <Text style={styles.cardMeta}>📅 {formatDate(t.start_date)}{t.end_date ? ` – ${formatDate(t.end_date)}` : ''}</Text>
                {t.location && <Text style={styles.cardMeta}>📍 {t.location}</Text>}
                <Text style={styles.cardMeta}>💰 {t.entry_fee_gbp > 0 ? `£${t.entry_fee_gbp}` : 'Free'}</Text>
                <View style={styles.divTags}>
                  {t.eligible_divisions.map((d: string) => (
                    <View key={d} style={styles.divTag}>
                      <Text style={styles.divTagText}>{DIVISION_LABELS[d as Division] ?? d}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.viewRegsBtn}
                  onPress={() => navigation.navigate('TournamentDetail', { tournamentId: t.id })}
                >
                  <Text style={styles.viewRegsBtnText}>👥 View Registrations</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.cancelBtn}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>New Tournament</Text>
            <TouchableOpacity onPress={handleCreate}><Text style={styles.saveBtn}>Create</Text></TouchableOpacity>
          </View>
          <View style={styles.form}>
            {[
              { label: 'Title *', key: 'title', placeholder: 'BPT Spring Open' },
              { label: 'Description', key: 'description', placeholder: 'Tournament details...' },
              { label: 'Start Date *', key: 'start_date', placeholder: 'YYYY-MM-DD' },
              { label: 'End Date', key: 'end_date', placeholder: 'YYYY-MM-DD' },
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
                  placeholderTextColor="#9CA3AF"
                  keyboardType={(keyboardType as any) ?? 'default'}
                />
              </View>
            ))}
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
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  academyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 4 },
  academyTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  addBtn: { backgroundColor: '#16A34A', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  regCount: { fontSize: 12, color: '#6B7280' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 },
  cardMeta: { fontSize: 13, color: '#6B7280', marginBottom: 3 },
  divTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  divTag: { backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  divTagText: { fontSize: 11, color: '#374151' },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#9CA3AF', fontSize: 14 },
  modal: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  cancelBtn: { fontSize: 16, color: '#6B7280' },
  saveBtn: { fontSize: 16, color: '#16A34A', fontWeight: '700' },
  form: { padding: 20, gap: 4 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 14, fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB', marginBottom: 4 },
  divGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  divChip: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#F9FAFB' },
  divChipActive: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  divChipText: { fontSize: 13, color: '#374151' },
  divChipTextActive: { color: '#FFFFFF', fontWeight: '600' },
  viewRegsBtn: {
    marginTop: 12, backgroundColor: '#EFF6FF', borderRadius: 8,
    paddingVertical: 9, alignItems: 'center',
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  viewRegsBtnText: { fontSize: 13, fontWeight: '700', color: '#2563EB' },
});
