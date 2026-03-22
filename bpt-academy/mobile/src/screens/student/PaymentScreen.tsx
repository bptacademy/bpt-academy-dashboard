import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
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
  const {
    tournamentId, programId, enrollmentId,
    amount, programDivision, studentId,
  } = route.params;

  const { profile } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [tab, setTab]                   = useState<PaymentTab>('card');
  const [bankDetails, setBankDetails]   = useState<BankDetails | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [reference, setReference]       = useState('');
  const [loadingCard, setLoadingCard]   = useState(false);
  const [loadingBank, setLoadingBank]   = useState(false);
  const [sheetReady, setSheetReady]     = useState(false);

  // Stable reference so we don't re-init on every render
  const generatedRef = useRef(
    `BPT-${(studentId ?? profile?.id ?? '').slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
  ).current;

  // ── Load settings + initialise Stripe Payment Sheet ─────────────────────
  useEffect(() => {
    const init = async () => {
      // 1. Fetch bank details from DB
      const { data } = await supabase
        .from('academy_settings')
        .select('key, value')
        .in('key', ['bank_account_name', 'bank_sort_code', 'bank_account_number', 'bank_payment_notes']);

      if (data) {
        const map: Record<string, string> = {};
        data.forEach(({ key, value }) => { map[key] = value; });
        setBankDetails(map as BankDetails);
      }

      // 2. Create a PaymentIntent via our Edge Function
      try {
        const { data: piData, error: piError } = await supabase.functions.invoke('create-payment-intent', {
          body: {
            amount_gbp: amount,
            program_id: programId ?? null,
            tournament_id: tournamentId ?? null,
            student_id: studentId ?? profile?.id,
          },
        });

        if (piError || !piData?.clientSecret) throw new Error(piError?.message ?? 'Could not create payment');

        // 3. Initialise the Payment Sheet
        const { error: initError } = await initPaymentSheet({
          merchantDisplayName: 'BPT Academy',
          paymentIntentClientSecret: piData.clientSecret,
          allowsDelayedPaymentMethods: false,
          defaultBillingDetails: { name: profile?.full_name ?? '' },
          style: 'alwaysLight',
          applePay: { merchantCountryCode: 'GB' },
          googlePay: { merchantCountryCode: 'GB', testEnv: false, currencyCode: 'gbp' },
        });

        if (initError) throw new Error(initError.message);
        setSheetReady(true);
      } catch (err: any) {
        // Sheet failed to init — card tab will show an error state
        console.warn('Payment sheet init failed:', err.message);
      }

      setLoadingSettings(false);
    };

    init();
  }, []);

  // ── Card payment ─────────────────────────────────────────────────────────
  const handleCardPayment = async () => {
    if (!sheetReady) {
      Alert.alert('Not ready', 'Payment is still loading. Please wait a moment.');
      return;
    }
    setLoadingCard(true);

    const { error } = await presentPaymentSheet();

    if (error) {
      setLoadingCard(false);
      if (error.code !== 'Canceled') Alert.alert('Payment failed', error.message);
      return;
    }

    // Payment succeeded — create enrollment + log payment
    if (programId && studentId) {
      await supabase.from('enrollments').insert({
        student_id: studentId,
        program_id: programId,
        status: 'active',
      });
    }

    await supabase.from('payments').insert({
      student_id: studentId ?? profile!.id,
      tournament_id: tournamentId ?? null,
      program_id: programId ?? null,
      enrollment_id: enrollmentId ?? null,
      amount_gbp: amount,
      method: 'card',
      status: 'confirmed',
      notes: 'Stripe Payment Sheet',
    });

    setLoadingCard(false);
    Alert.alert('✅ Payment confirmed!', "You're now enrolled. Welcome to the program!", [
      { text: 'Done', onPress: () => navigation.goBack() },
    ]);
  };

  // ── Bank transfer ────────────────────────────────────────────────────────
  const handleBankTransfer = async () => {
    setLoadingBank(true);

    if (programId && studentId) {
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
      '✅ Enrollment Confirmed',
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

        {/* Amount */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount Due</Text>
          <Text style={styles.amountValue}>£{amount.toFixed(2)}</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, tab === 'card' && styles.tabActive]}
            onPress={() => setTab('card')}
          >
            <Text style={[styles.tabText, tab === 'card' && styles.tabTextActive]}>💳 Card</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'bank_transfer' && styles.tabActive]}
            onPress={() => setTab('bank_transfer')}
          >
            <Text style={[styles.tabText, tab === 'bank_transfer' && styles.tabTextActive]}>🏦 Bank Transfer</Text>
          </TouchableOpacity>
        </View>

        {/* ── CARD TAB ── */}
        {tab === 'card' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pay by Card</Text>
            <Text style={styles.instructions}>
              Secure payment powered by Stripe. Apple Pay and Google Pay accepted.
            </Text>

            {/* Payment method icons */}
            <View style={styles.methodRow}>
              {['💳', '🍎', 'G'].map((icon, i) => (
                <View key={i} style={styles.methodBadge}>
                  <Text style={styles.methodIcon}>{icon}</Text>
                </View>
              ))}
              <Text style={styles.methodLabel}>All major cards · Apple Pay · Google Pay</Text>
            </View>

            <View style={styles.secureRow}>
              <Text style={styles.secureIcon}>🔒</Text>
              <Text style={styles.secureText}>
                Your payment details are encrypted and never stored on our servers.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, (loadingCard || loadingSettings) && styles.submitBtnDisabled]}
              onPress={handleCardPayment}
              disabled={loadingCard || loadingSettings}
            >
              {loadingCard || loadingSettings
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.submitBtnText}>Pay £{amount.toFixed(2)}</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* ── BANK TRANSFER TAB ── */}
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

  amountCard: {
    backgroundColor: '#111827', borderRadius: 16, padding: 28,
    alignItems: 'center', marginBottom: 20,
  },
  amountLabel: { fontSize: 13, color: '#9CA3AF', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  amountValue: { fontSize: 44, fontWeight: '800', color: '#FFFFFF' },

  tabRow: {
    flexDirection: 'row', backgroundColor: '#E5E7EB',
    borderRadius: 10, padding: 4, marginBottom: 24,
  },
  tab: { flex: 1, paddingVertical: 11, borderRadius: 8, alignItems: 'center' },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#111827' },

  section: {},
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 8 },
  instructions: { fontSize: 13, color: '#6B7280', marginBottom: 20, lineHeight: 20 },

  methodRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  methodBadge: {
    width: 36, height: 24, borderRadius: 4, backgroundColor: '#F3F4F6',
    borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center',
  },
  methodIcon: { fontSize: 14 },
  methodLabel: { fontSize: 12, color: '#6B7280', flex: 1 },

  secureRow: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#F0FDF4', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#BBF7D0', marginBottom: 24,
  },
  secureIcon: { fontSize: 18 },
  secureText: { fontSize: 13, color: '#166534', lineHeight: 19, flex: 1 },

  bankCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20,
  },
  bankRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  bankLabel: { fontSize: 13, color: '#6B7280', flex: 1 },
  bankValue: { fontSize: 14, fontWeight: '700', color: '#111827', flex: 2, textAlign: 'right' },
  refRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10 },
  refBadge: { backgroundColor: '#ECFDF5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  refValue: { fontSize: 13, fontWeight: '700', color: '#16A34A', letterSpacing: 0.5 },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#111827',
    minHeight: 60, textAlignVertical: 'top', marginBottom: 20,
  },

  submitBtn: { backgroundColor: '#16A34A', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  submitBtnBank: { backgroundColor: '#1D4ED8' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
