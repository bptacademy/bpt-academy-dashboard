import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, TextInput, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import BackHeader from '../../components/common/BackHeader';

type PaymentTab = 'card' | 'bank_transfer';

type BankDetails = {
  bank_account_name: string;
  bank_sort_code: string;
  bank_account_number: string;
  bank_payment_notes: string;
};

export default function PaymentScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const {
    tournamentId, programId, enrollmentId,
    amount, programDivision, studentId, label,
  } = route.params;

  const { profile } = useAuth();

  const [tab, setTab]                         = useState<PaymentTab>('card');
  const [bankDetails, setBankDetails]         = useState<BankDetails | null>(null);
  const [paymentLink, setPaymentLink]         = useState<string | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [reference, setReference]             = useState('');
  const [loadingCard, setLoadingCard]         = useState(false);
  const [loadingBank, setLoadingBank]         = useState(false);

  const divisionShort: Record<string, string> = {
    amateur:       'AM',
    semi_pro:      'SP',
    pro:           'PRO',
    junior_9_11:   'JR1',
    junior_12_15:  'JR2',
    junior_15_18:  'JR3',
  };
  const divSlug = programDivision ? (divisionShort[programDivision] ?? programDivision.toUpperCase().slice(0, 3)) : 'GEN';
  const lastName = (profile?.full_name ?? '').split(' ').pop()?.toUpperCase().slice(0, 6) ?? 'STUDENT';
  const generatedRef = useRef(`BPT-${divSlug}-${lastName}`).current;

  const divisionLinkKey = programDivision ? `stripe_payment_link_${programDivision}` : null;

  // Notify all admins/coaches about a tournament registration
  const notifyAdminsTournamentReg = async (tournamentTitle: string, method: 'card' | 'bank_transfer') => {
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'coach']);
    if (!admins || admins.length === 0) return;
    const studentName = profile?.full_name ?? 'A student';
    const methodLabel = method === 'card' ? 'card payment' : 'bank transfer';
    await supabase.from('notifications').insert(
      admins.map((a: { id: string }) => ({
        recipient_id: a.id,
        title: '🎾 New Tournament Registration',
        body: `${studentName} registered for ${tournamentTitle} via ${methodLabel}. Payment pending confirmation.`,
        type: 'payment',
        read: false,
      }))
    );
  };

  useEffect(() => {
    const keys = [
      'bank_account_name', 'bank_sort_code',
      'bank_account_number', 'bank_payment_notes',
      ...(divisionLinkKey ? [divisionLinkKey] : []),
    ];
    supabase
      .from('academy_settings')
      .select('key, value')
      .in('key', keys)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach(({ key, value }) => { map[key] = value; });
          setBankDetails(map as BankDetails);
          if (divisionLinkKey && map[divisionLinkKey]) setPaymentLink(map[divisionLinkKey]);
        }
        setLoadingSettings(false);
      });
  }, []);

  // ── Card: open Stripe Payment Link ───────────────────────────────────────
  const handleCardPayment = async () => {
    if (!paymentLink) {
      Alert.alert('No payment link', 'Contact your coach to set up card payment for this division.');
      return;
    }
    setLoadingCard(true);

    // Create enrollment or tournament registration
    if (programId && studentId) {
      const { data: existingEnroll } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', studentId)
        .eq('program_id', programId)
        .maybeSingle();
      if (existingEnroll) {
        await supabase.from('enrollments').update({ status: 'active' }).eq('id', existingEnroll.id);
      } else {
        await supabase.from('enrollments').insert({ student_id: studentId, program_id: programId, status: 'active' });
      }
    }
    if (tournamentId && studentId) {
      await supabase.from('tournament_registrations').insert({
        tournament_id: tournamentId, student_id: studentId, status: 'pending',
      });
      await notifyAdminsTournamentReg(label ?? 'a tournament', 'card');
    }

    await supabase.from('payments').insert({
      student_id: studentId ?? profile!.id,
      tournament_id: tournamentId ?? null,
      program_id: programId ?? null,
      enrollment_id: enrollmentId ?? null,
      amount_gbp: amount,
      method: 'card',
      status: 'pending',
      notes: `Stripe payment link: ${paymentLink}`,
    });

    setLoadingCard(false);
    await Linking.openURL(paymentLink);
    Alert.alert(
      '🔗 Checkout Opened',
      `Complete your payment in the browser. Your ${tournamentId ? 'registration' : 'enrollment'} is reserved and will be confirmed once payment is received.`,
      [{ text: 'OK', onPress: () => navigation.goBack() }],
    );
  };

  // ── Bank transfer ────────────────────────────────────────────────────────
  const handleBankTransfer = async () => {
    setLoadingBank(true);

    if (programId && studentId) {
      // Check if enrollment already exists — if so, just update status to active
      const { data: existing } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', studentId)
        .eq('program_id', programId)
        .maybeSingle();

      if (existing) {
        await supabase.from('enrollments').update({ status: 'active' }).eq('id', existing.id);
      } else {
        const { error: enrollError } = await supabase.from('enrollments').insert({
          student_id: studentId,
          program_id: programId,
          status: 'active',
        });
        if (enrollError) {
          setLoadingBank(false);
          Alert.alert('Error', enrollError.message);
          return;
        }
      }
    }

    if (tournamentId && studentId) {
      const { error: regError } = await supabase.from('tournament_registrations').insert({
        tournament_id: tournamentId,
        student_id: studentId,
        status: 'pending',
      });
      if (regError) {
        setLoadingBank(false);
        Alert.alert('Error', regError.message);
        return;
      }
      await notifyAdminsTournamentReg(label ?? 'a tournament', 'bank_transfer');
    }

    const { error } = await supabase.from('payments').insert({
      student_id: studentId ?? profile!.id,
      tournament_id: tournamentId ?? null,
      program_id: programId ?? null,
      enrollment_id: enrollmentId ?? null,
      amount_gbp: amount,
      method: 'bank_transfer',
      status: 'pending',
      bank_reference: generatedRef,
      notes: reference || null,
    });

    setLoadingBank(false);
    if (error) { Alert.alert('Error', error.message); return; }

    Alert.alert(
      tournamentId ? '✅ Registration Confirmed' : '✅ Enrollment Confirmed',
      `Please transfer £${amount.toFixed(2)} to:\n\n` +
      `Account: ${bankDetails?.bank_account_name ?? 'BPT Academy'}\n` +
      `Sort Code: ${bankDetails?.bank_sort_code ?? '—'}\n` +
      `Account No: ${bankDetails?.bank_account_number ?? '—'}\n` +
      `Reference: ${generatedRef}\n\n` +
      `Payment verified within 1–2 business days.`,
      [{ text: 'OK', onPress: () => navigation.goBack() }],
    );
  };

  return (
    <View style={styles.container}>
      <BackHeader title="Payment" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        <View style={styles.amountCard}>
          {label && <Text style={styles.amountContext}>{label}</Text>}
          <Text style={styles.amountLabel}>Amount Due</Text>
          <Text style={styles.amountValue}>£{amount.toFixed(2)}</Text>
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tab, tab === 'card' && styles.tabActive]} onPress={() => setTab('card')}>
            <Text style={[styles.tabText, tab === 'card' && styles.tabTextActive]}>💳 Card</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, tab === 'bank_transfer' && styles.tabActive]} onPress={() => setTab('bank_transfer')}>
            <Text style={[styles.tabText, tab === 'bank_transfer' && styles.tabTextActive]}>🏦 Bank Transfer</Text>
          </TouchableOpacity>
        </View>

        {/* ── CARD ── */}
        {tab === 'card' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pay by Card</Text>
            <Text style={styles.instructions}>
              You'll be taken to a secure Stripe checkout page in your browser. All major cards accepted.
            </Text>
            <View style={styles.secureRow}>
              <Text style={styles.secureIcon}>🔒</Text>
              <Text style={styles.secureText}>Payments are encrypted and processed securely by Stripe.</Text>
            </View>
            {!loadingSettings && !paymentLink && (
              <View style={styles.noLinkCard}>
                <Text style={styles.noLinkText}>⚠️ Card payment not configured for this division. Please use bank transfer or contact your coach.</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.submitBtn, (loadingCard || loadingSettings || !paymentLink) && styles.submitBtnDisabled]}
              onPress={handleCardPayment}
              disabled={loadingCard || loadingSettings || !paymentLink}
            >
              {loadingCard || loadingSettings
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.submitBtnText}>Pay £{amount.toFixed(2)} with Card →</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* ── BANK TRANSFER ── */}
        {tab === 'bank_transfer' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bank Transfer</Text>
            {loadingSettings ? (
              <ActivityIndicator color="#16A34A" style={{ marginVertical: 20 }} />
            ) : (
              <>
                <Text style={styles.instructions}>
                  {bankDetails?.bank_payment_notes ||
                    `Transfer exactly £${amount.toFixed(2)} using the reference below. Verified within 1–2 business days.`}
                </Text>
                <View style={styles.bankCard}>
                  <BankRow label="Account Name"   value={bankDetails?.bank_account_name   ?? '—'} />
                  <BankRow label="Sort Code"      value={bankDetails?.bank_sort_code      ?? '—'} />
                  <BankRow label="Account Number" value={bankDetails?.bank_account_number ?? '—'} />
                  <View style={styles.refRow}>
                    <Text style={styles.bankLabel}>Your Reference</Text>
                    <View style={styles.refBadge}>
                      <Text style={styles.refValue}>{generatedRef}</Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.fieldLabel}>Additional notes (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. transfer confirmation number"
                  placeholderTextColor="#9CA3AF"
                  value={reference}
                  onChangeText={setReference}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.submitBtn, styles.submitBtnBank, loadingBank && styles.submitBtnDisabled]}
                  onPress={handleBankTransfer}
                  disabled={loadingBank}
                >
                  {loadingBank
                    ? <ActivityIndicator color="#FFFFFF" />
                    : <Text style={styles.submitBtnText}>I've Made the Transfer</Text>
                  }
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

function BankRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.bankRow}>
      <Text style={styles.bankLabel}>{label}</Text>
      <Text style={styles.bankValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20, paddingBottom: 40 },
  amountCard: { backgroundColor: '#111827', borderRadius: 16, padding: 28, alignItems: 'center', marginBottom: 20 },
  amountContext: { fontSize: 14, color: '#D1FAE5', fontWeight: '600', marginBottom: 4 },
  amountLabel: { fontSize: 13, color: '#9CA3AF', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  amountValue: { fontSize: 44, fontWeight: '800', color: '#FFFFFF' },
  tabRow: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 10, padding: 4, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 11, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#111827' },
  section: {},
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 8 },
  instructions: { fontSize: 13, color: '#6B7280', marginBottom: 16, lineHeight: 20 },
  secureRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: '#F0FDF4', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#BBF7D0', marginBottom: 24 },
  secureIcon: { fontSize: 18 },
  secureText: { fontSize: 13, color: '#166534', lineHeight: 19, flex: 1 },
  noLinkCard: { backgroundColor: '#FFF7ED', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#FED7AA', marginBottom: 16 },
  noLinkText: { fontSize: 13, color: '#92400E', lineHeight: 20 },
  bankCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 },
  bankRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  bankLabel: { fontSize: 13, color: '#6B7280', flex: 1 },
  bankValue: { fontSize: 14, fontWeight: '700', color: '#111827', flex: 2, textAlign: 'right' },
  refRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10 },
  refBadge: { backgroundColor: '#ECFDF5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  refValue: { fontSize: 13, fontWeight: '700', color: '#16A34A', letterSpacing: 0.5 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#111827', minHeight: 60, textAlignVertical: 'top', marginBottom: 20 },
  submitBtn: { backgroundColor: '#16A34A', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  submitBtnBank: { backgroundColor: '#1D4ED8' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
