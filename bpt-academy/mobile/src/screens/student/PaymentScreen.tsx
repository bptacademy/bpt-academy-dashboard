import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import BackHeader from '../../components/common/BackHeader';

interface Props {
  navigation: any;
  route: {
    params: {
      tournamentId?: string;
      programId?: string;
      enrollmentId?: string;
      amount: number;
      registrationId?: string;
    };
  };
}

type PaymentTab = 'bank_transfer' | 'card';

export default function PaymentScreen({ navigation, route }: any) {
  const { tournamentId, programId, enrollmentId, amount, registrationId } = route.params;
  const { profile } = useAuth();
  const [tab, setTab] = useState<PaymentTab>('bank_transfer');
  const [loading, setLoading] = useState(false);
  const [reference, setReference] = useState('');

  const bankDetails = {
    bank: 'BPT Academy Ltd',
    sortCode: '20-12-34',
    accountNumber: '12345678',
  };

  const generatedRef = `BPT-${profile?.id?.slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  const handleBankTransfer = async () => {
    if (!profile) return;
    setLoading(true);
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
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert(
        'Payment Submitted',
        `Please transfer £${amount.toFixed(2)} using reference:\n\n${generatedRef}\n\nYour payment will be confirmed by our team within 1-2 business days.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    }
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
            style={[styles.tab, tab === 'bank_transfer' && styles.tabActive]}
            onPress={() => setTab('bank_transfer')}
          >
            <Text style={[styles.tabText, tab === 'bank_transfer' && styles.tabTextActive]}>🏦 Bank Transfer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'card' && styles.tabActive]}
            onPress={() => setTab('card')}
          >
            <Text style={[styles.tabText, tab === 'card' && styles.tabTextActive]}>💳 Card</Text>
          </TouchableOpacity>
        </View>

        {tab === 'bank_transfer' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bank Transfer Details</Text>
            <Text style={styles.instructions}>
              Please transfer exactly £{amount.toFixed(2)} to the account below using the reference provided. Our team will confirm your payment within 1–2 business days.
            </Text>

            <View style={styles.bankCard}>
              <BankRow label="Account Name" value={bankDetails.bank} />
              <BankRow label="Sort Code" value={bankDetails.sortCode} />
              <BankRow label="Account Number" value={bankDetails.accountNumber} />
              <View style={styles.refRow}>
                <Text style={styles.bankLabel}>Reference</Text>
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
              style={styles.submitBtn}
              onPress={handleBankTransfer}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.submitBtnText}>I've Made the Transfer</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {tab === 'card' && (
          <View style={styles.section}>
            <View style={styles.stripePlaceholder}>
              <Text style={styles.stripePlaceholderIcon}>💳</Text>
              <Text style={styles.stripePlaceholderTitle}>Card Payment</Text>
              <Text style={styles.stripePlaceholderText}>
                Stripe card payment integration coming soon. Please use bank transfer for now.
              </Text>
            </View>
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
  amountValue: { fontSize: 36, fontWeight: '800', color: '#FFFFFF' },
  tabRow: {
    flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 10,
    padding: 4, marginBottom: 20,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#111827' },
  section: {},
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 10 },
  instructions: { fontSize: 13, color: '#6B7280', marginBottom: 16, lineHeight: 20 },
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
  refValue: { fontSize: 14, fontWeight: '700', color: '#16A34A', letterSpacing: 0.5 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#111827',
    minHeight: 60, textAlignVertical: 'top', marginBottom: 20,
  },
  submitBtn: {
    backgroundColor: '#16A34A', borderRadius: 12, paddingVertical: 16, alignItems: 'center',
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  stripePlaceholder: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 40,
    alignItems: 'center', borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed',
  },
  stripePlaceholderIcon: { fontSize: 48, marginBottom: 16 },
  stripePlaceholderTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  stripePlaceholderText: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
});
