import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Payment } from '../../types';
import ScreenHeader from '../../components/common/ScreenHeader';

interface PaymentRow extends Payment {
  studentName: string;
  programTitle?: string;
  tournamentTitle?: string;
}

export default function PaymentReconciliationScreen() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'confirmed' | 'all'>('pending');

  const fetchPayments = async () => {
    const query = supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter !== 'all') query.eq('status', filter);

    const { data } = await query;
    if (!data) return;

    const enriched: PaymentRow[] = await Promise.all(
      data.map(async (p: any) => {
        const { data: student } = await supabase
          .from('profiles').select('full_name').eq('id', p.student_id).single();
        let programTitle: string | undefined;
        let tournamentTitle: string | undefined;
        if (p.program_id) {
          const { data: prog } = await supabase.from('programs').select('title').eq('id', p.program_id).single();
          programTitle = prog?.title;
        }
        if (p.tournament_id) {
          const { data: tourn } = await supabase.from('tournaments').select('title').eq('id', p.tournament_id).single();
          tournamentTitle = tourn?.title;
        }
        return { ...p, studentName: student?.full_name ?? 'Unknown', programTitle, tournamentTitle };
      })
    );
    setPayments(enriched);
  };

  const load = async () => { setLoading(true); await fetchPayments(); setLoading(false); };
  const onRefresh = async () => { setRefreshing(true); await fetchPayments(); setRefreshing(false); };
  useEffect(() => { load(); }, [filter]);

  const updateStatus = async (payment: PaymentRow, newStatus: 'confirmed' | 'failed') => {
    Alert.alert(
      newStatus === 'confirmed' ? 'Confirm Payment' : 'Mark as Failed',
      `${newStatus === 'confirmed' ? 'Confirm' : 'Reject'} £${payment.amount_gbp} from ${payment.studentName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: newStatus === 'confirmed' ? 'Confirm ✅' : 'Mark Failed ❌',
          style: newStatus === 'confirmed' ? 'default' : 'destructive',
          onPress: async () => {
            setProcessing(payment.id);
            await supabase.from('payments').update({
              status: newStatus,
              confirmed_by: profile!.id,
              confirmed_at: new Date().toISOString(),
            }).eq('id', payment.id);

            // Update enrollment payment_status
            if (payment.enrollment_id) {
              await supabase.from('enrollments')
                .update({ payment_status: newStatus })
                .eq('id', payment.enrollment_id);
            }

            // Notify student
            await supabase.from('notifications').insert({
              recipient_id: payment.student_id,
              title: newStatus === 'confirmed' ? '✅ Payment Confirmed' : '❌ Payment Issue',
              body: newStatus === 'confirmed'
                ? `Your payment of £${payment.amount_gbp} has been confirmed. Welcome aboard!`
                : `There was an issue with your payment of £${payment.amount_gbp}. Please contact us.`,
              type: 'payment',
            });

            setProcessing(null);
            fetchPayments();
          },
        },
      ]
    );
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const pendingCount = payments.filter(p => p.status === 'pending').length;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScreenHeader title="Payments" />

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNum}>{pendingCount}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNum}>
            £{payments.filter(p => p.status === 'confirmed').reduce((s, p) => s + p.amount_gbp, 0).toFixed(0)}
          </Text>
          <Text style={styles.summaryLabel}>Confirmed</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.filters}>
        {(['pending', 'confirmed', 'all'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#16A34A" style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.list}>
          {payments.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>💳</Text>
              <Text style={styles.emptyText}>No {filter === 'all' ? '' : filter} payments.</Text>
            </View>
          )}
          {payments.map(p => (
            <View key={p.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.studentName}>{p.studentName}</Text>
                <Text style={styles.amount}>£{Number(p.amount_gbp).toFixed(2)}</Text>
              </View>
              {(p.programTitle || p.tournamentTitle) && (
                <Text style={styles.forText}>For: {p.programTitle ?? p.tournamentTitle}</Text>
              )}
              <View style={styles.metaRow}>
                <View style={styles.methodBadge}>
                  <Text style={styles.methodText}>{p.method === 'bank_transfer' ? '🏦 Bank Transfer' : '💳 Card'}</Text>
                </View>
                <Text style={styles.date}>{formatDate(p.created_at)}</Text>
              </View>
              {p.bank_reference && (
                <View style={styles.refBox}>
                  <Text style={styles.refLabel}>Reference:</Text>
                  <Text style={styles.refValue}>{p.bank_reference}</Text>
                </View>
              )}

              {p.status === 'pending' && (
                <View style={styles.actions}>
                  {processing === p.id ? (
                    <ActivityIndicator color="#16A34A" />
                  ) : (
                    <>
                      <TouchableOpacity style={styles.confirmBtn} onPress={() => updateStatus(p, 'confirmed')}>
                        <Text style={styles.confirmBtnText}>✅ Confirm</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.failBtn} onPress={() => updateStatus(p, 'failed')}>
                        <Text style={styles.failBtnText}>❌ Failed</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}
              {p.status !== 'pending' && (
                <View style={[styles.statusPill, { backgroundColor: p.status === 'confirmed' ? '#ECFDF5' : '#FEF2F2' }]}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: p.status === 'confirmed' ? '#16A34A' : '#DC2626' }}>
                    {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  summary: { flexDirection: 'row', backgroundColor: '#111827', paddingVertical: 16 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNum: { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },
  summaryLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  filters: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  filterChip: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#F9FAFB' },
  filterChipActive: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  filterText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  filterTextActive: { color: '#FFFFFF', fontWeight: '700' },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  studentName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  amount: { fontSize: 18, fontWeight: '800', color: '#16A34A' },
  forText: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  methodBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  methodText: { fontSize: 12, color: '#374151' },
  date: { fontSize: 12, color: '#9CA3AF' },
  refBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10, marginBottom: 12, gap: 8 },
  refLabel: { fontSize: 12, color: '#6B7280' },
  refValue: { fontSize: 13, fontWeight: '700', color: '#111827', fontFamily: 'monospace' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  confirmBtn: { flex: 1, backgroundColor: '#ECFDF5', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#86EFAC' },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#16A34A' },
  failBtn: { flex: 1, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#FCA5A5' },
  failBtnText: { fontSize: 14, fontWeight: '700', color: '#DC2626' },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, marginTop: 8 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#9CA3AF', fontSize: 14 },
});
