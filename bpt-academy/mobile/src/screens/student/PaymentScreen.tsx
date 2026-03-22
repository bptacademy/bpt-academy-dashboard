import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, TextInput, Linking,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import BackHeader from '../../components/common/BackHeader';
import { Division } from '../../types';

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
    amount, onPaymentComplete, programDivision,
  } = route.params;

  const { profile } = useAuth();

  const [tab, setTab]                   = useState<PaymentTab>('card');
  const [bankDetails, setBankDetails]   = useState<BankDetails | null>(null);
  const [paymentLink, setPaymentLink]   = useState<string | null>(null);
  const [loadingBank, setLoadingBank]   = useState(true);
  const [reference, setReference]       = useState('');
  const [loadingCard, setLoadingCard]   = useState(false);
  const [loadingBank2, setLoadingBank2] = useState(false);

  const generatedRef = `BPT-${profile?.id?.slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  const divisionLinkKey = programDivision
    ? `stripe_payment_link_${programDivision}` // e.g. stripe_payment_link_amateur
    : null;

  // Load bank details + payment link from DB
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
          if (divisionLinkKey && map[divisionLinkKey]) {
            setPaymentLink(map[divisionLinkKey]);
          }
        }
        setLoadingBank(false);
      });
  }, []);

  // ── Card payment via Stripe Payment Link ────────────────────────────────
  const handleCardPayment = async () => {
    if (!paymentLink) {
      Alert.alert('Not available', 'No payment link configured for this division. Please use bank transfer or contact your coach.');
      return;
    }

    // Log the pending payment record first, then open Stripe
    await supabase.from('payments').insert({
      student_id: profile!.id,
      tournament_id: tournamentId ?? null,
      program_id: programId ?? null,
      enrollment_id: enrollmentId ?? null,
      amount_gbp: amount,
      method: 'card',
      status: 'pending',
      notes: `Stripe payment link: ${paymentLink}`,
    });

    // Run enrollment callback (enroll pending payment confirmation)
    if (onPaymentComplete) await onPaymentComplete();

    // Open the Stripe payment link in the browser
    const supported = await Linking.canOpenURL(paymentLink);
    if (supported) {
      await Linking.openURL(paymentLink);
    } else {
      Alert.alert('Error', 'Could not open payment link.');
      return;
    }

    Alert.alert(
      '🔗 Stripe Checkout Opened',
      'Complete your payment in the browser. Your enrollment has been reserved and will be confirmed once payment is received.',
      [{ text: 'OK', onPress: () => navigation.goBack() }],
    );
  };

  // ── Bank transfer ────────────────────────────────────────────────────────
  const handleBankTransfer = async () => {
    if (!profile) return;
    setLoadingBank2(true);

    const { error } = await supabase.from('payments').insert({
      student_id: profile.id,
      tournament_id: tournamentId ?? null,
      program_id: programId ?? null,
      enrollment_id: enrollmentId ?? null,
      amount_gbp: amount,
      method: 'bank_transfer',
      status: 'pending',
      bank_reference: generatedRef,
      notes: reference || null,
    });

    if (error) {
      setLoadingBank2(false);
      Alert.alert('Error', error.message);
      return;
    }

    if (onPaymentComplete) await onPaymentComplete();

    setLoadingBank2(false);
    Alert.alert(
      '✅ Transfer Submitted',
      `Please send £${amount.toFixed(2)} to:\n\n` +
      `Account: ${bankDetails?.bank_account_name ?? 'BPT Academy'}\n` +
      `Sort Code: ${bankDetails?.bank_sort_code ?? '—'}\n` +
      `Account No: ${bankDetails?.bank_account_number ?? '—'}\n` +
      `Reference: ${generatedRef}\n\n` +
      `Your enrollment is confirmed and payment will be verified within 1–2 business days.`,
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

        {/* Tab switcher */}
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
              Secure checkout powered by Stripe. You'll be taken to a payment page in your browser.
            </Text>

            <View style={styles.stripeInfoCard}>
              <Text style={styles.stripeInfoIcon}>🔒</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.stripeInfoTitle}>Secure Checkout</Text>
                <Text style={styles.stripeInfoText}>
                  All major cards accepted. Your enrollment is reserved immediately.
                </Text>
              </View>
            </View>

            {!paymentLink && !loadingBank && (
              <View style={styles.noLinkCard}>
                <Text style={styles.noLinkText}>
                  ⚠️ No card payment link set up for this division yet. Please use bank transfer or contact your coach.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, (!paymentLink || loadingBank) && styles.submitBtnDisabled]}
              onPress={handleCardPayment}
              disabled={!paymentLink || loadingBank}
            >
              {loadingBank
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.submitBtnText}>Pay £{amount.toFixed(2)} with Card →</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* ── BANK TRANSFER TAB ── */}
        {tab === 'bank_transfer' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bank Transfer</Text>
            {loadingBank ? (
              <ActivityIndicator color="#16A34A" style={{ marginVertical: 20 }} />
            ) : (
              <>
                <Text style={styles.instructions}>
                  {bankDetails?.bank_payment_notes ||
                    `Transfer exactly £${amount.toFixed(2)} using the reference below. Our team will confirm within 1–2 business days.`}
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
                  style={[styles.submitBtn, styles.submitBtnBank, loadingBank2 && styles.submitBtnDisabled]}
                  onPress={handleBankTransfer}
                  disabled={loadingBank2}
                >
                  {loadingBank2
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
  content: { padding: 20 },

  amountCard: {
    backgroundColor: '#111827', borderRadius: 14, padding: 24,
    alignItems: 'center', marginBottom: 20,
  },
  amountLabel: { fontSize: 13, color: '#9CA3AF', marginBottom: 6 },
  amountValue: { fontSize: 40, fontWeight: '800', color: '#FFFFFF' },

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
  instructions: { fontSize: 13, color: '#6B7280', marginBottom: 16, lineHeight: 20 },

  stripeInfoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#ECFDF5', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#BBF7D0', marginBottom: 24,
  },
  stripeInfoIcon: { fontSize: 28 },
  stripeInfoTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  stripeInfoText: { fontSize: 13, color: '#374151', lineHeight: 18 },

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
  refRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10,
  },
  refBadge: { backgroundColor: '#ECFDF5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  refValue: { fontSize: 13, fontWeight: '700', color: '#16A34A', letterSpacing: 0.5 },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#111827',
    minHeight: 60, textAlignVertical: 'top', marginBottom: 20,
  },

  submitBtn: {
    backgroundColor: '#16A34A', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  submitBtnBank: { backgroundColor: '#1D4ED8' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  noLinkCard: {
    backgroundColor: '#FFF7ED', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#FED7AA', marginBottom: 16,
  },
  noLinkText: { fontSize: 13, color: '#92400E', lineHeight: 20 },
});
