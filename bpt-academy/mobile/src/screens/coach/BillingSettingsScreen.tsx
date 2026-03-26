import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import ScreenHeader from '../../components/common/ScreenHeader';

// ─── Config ──────────────────────────────────────────────────────────────────

const BANK_FIELDS: { key: string; label: string; placeholder: string; multiline?: boolean }[] = [
  { key: 'bank_account_name',   label: 'Account Name',   placeholder: 'e.g. BPT Academy Ltd' },
  { key: 'bank_sort_code',      label: 'Sort Code',      placeholder: 'e.g. 20-12-34' },
  { key: 'bank_account_number', label: 'Account Number', placeholder: 'e.g. 12345678' },
  { key: 'bank_payment_notes',  label: 'Payment Notes',  placeholder: 'Instructions shown to students when paying by bank transfer', multiline: true },
];

const PAYMENT_LINK_FIELDS: { key: string; label: string; color: string }[] = [
  { key: 'stripe_payment_link_amateur',  label: 'Amateur Division',  color: '#16A34A' },
  { key: 'stripe_payment_link_semi_pro', label: 'Semi-Pro Division', color: '#D97706' },
  { key: 'stripe_payment_link_pro',      label: 'Pro Division',      color: '#DC2626' },
];

const ALL_KEYS = [
  ...BANK_FIELDS.map((f) => f.key),
  ...PAYMENT_LINK_FIELDS.map((f) => f.key),
];

type Tab = 'bank' | 'stripe';

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function BillingSettingsScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab]           = useState<Tab>('stripe');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    supabase
      .from('academy_settings')
      .select('key, value')
      .in('key', ALL_KEYS)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach(({ key, value }) => { map[key] = value; });
          setSettings(map);
        }
        setLoading(false);
      });
  }, []);

  const update = (key: string, value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    const upserts = ALL_KEYS.map((key) => ({
      key,
      value: settings[key] ?? '',
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase
      .from('academy_settings')
      .upsert(upserts, { onConflict: 'key' });
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    Alert.alert('✅ Saved', 'Billing settings updated successfully.');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16A34A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Billing Settings" />

      {/* Tab switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'stripe' && styles.tabBtnActive]}
          onPress={() => setTab('stripe')}
        >
          <Text style={[styles.tabBtnText, tab === 'stripe' && styles.tabBtnTextActive]}>
            💳 Stripe
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'bank' && styles.tabBtnActive]}
          onPress={() => setTab('bank')}
        >
          <Text style={[styles.tabBtnText, tab === 'bank' && styles.tabBtnTextActive]}>
            🏦 Bank Transfer
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* ── STRIPE TAB ── */}
        {tab === 'stripe' && (
          <>
            {/* Integration mode info */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>🔗</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoTitle}>Current Mode: Payment Links</Text>
                  <Text style={styles.infoText}>
                    Students are redirected to a Stripe-hosted page in their browser to complete payment. Simple and secure.
                  </Text>
                </View>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📱</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoTitle}>Upgrade: Native In-App Payments</Text>
                  <Text style={styles.infoText}>
                    For the most professional experience — card form inside the app, Apple Pay, Google Pay, instant confirmation — build with EAS Build. Ask your developer to run{' '}
                    <Text style={styles.infoCode}>npx eas build</Text>.
                  </Text>
                </View>
              </View>
            </View>

            {/* Payment Links per division */}
            <Text style={styles.sectionTitle}>Payment Links by Division</Text>
            <Text style={styles.sectionHint}>
              Create a Payment Link in your Stripe Dashboard for each division. Students are sent to the correct link based on the program they're enrolling in.
            </Text>

            {PAYMENT_LINK_FIELDS.map(({ key, label, color }) => {
              const value = settings[key] ?? '';
              const hasLink = value.startsWith('https://');
              return (
                <View key={key} style={styles.linkCard}>
                  <View style={styles.linkHeader}>
                    <View style={[styles.divisionDot, { backgroundColor: color }]} />
                    <Text style={styles.linkLabel}>{label}</Text>
                    {hasLink && (
                      <TouchableOpacity onPress={() => Linking.openURL(value)}>
                        <Text style={styles.testLink}>Test →</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput
                    style={[styles.linkInput, hasLink && styles.linkInputActive]}
                    value={value}
                    onChangeText={(v) => update(key, v)}
                    placeholder="https://buy.stripe.com/..."
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                  {hasLink && (
                    <View style={styles.linkStatus}>
                      <Text style={styles.linkStatusDot}>●</Text>
                      <Text style={styles.linkStatusText}>Active</Text>
                    </View>
                  )}
                  {!hasLink && (
                    <View style={styles.linkStatus}>
                      <Text style={[styles.linkStatusDot, { color: '#9CA3AF' }]}>○</Text>
                      <Text style={[styles.linkStatusText, { color: '#9CA3AF' }]}>Not configured</Text>
                    </View>
                  )}
                </View>
              );
            })}

            <TouchableOpacity
              style={styles.stripePortalBtn}
              onPress={() => Linking.openURL('https://dashboard.stripe.com/payment-links')}
            >
              <Text style={styles.stripePortalBtnText}>Open Stripe Dashboard →</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── BANK TRANSFER TAB ── */}
        {tab === 'bank' && (
          <>
            <Text style={styles.sectionTitle}>Bank Account Details</Text>
            <Text style={styles.sectionHint}>
              These details are shown to students when they choose bank transfer. Each student gets a unique reference code to include with their transfer.
            </Text>

            <View style={styles.card}>
              {BANK_FIELDS.map(({ key, label, placeholder, multiline }, idx) => (
                <View key={key}>
                  {idx > 0 && <View style={styles.fieldDivider} />}
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>{label}</Text>
                    <TextInput
                      style={[styles.fieldInput, multiline && styles.fieldInputMultiline]}
                      value={settings[key] ?? ''}
                      onChangeText={(v) => update(key, v)}
                      placeholder={placeholder}
                      placeholderTextColor="#9CA3AF"
                      multiline={multiline}
                      numberOfLines={multiline ? 3 : 1}
                    />
                  </View>
                </View>
              ))}
            </View>

            {/* Preview */}
            {(settings['bank_account_name'] || settings['bank_sort_code']) && (
              <View style={styles.previewCard}>
                <Text style={styles.previewTitle}>Preview (what students see)</Text>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Account Name</Text>
                  <Text style={styles.previewValue}>{settings['bank_account_name'] || '—'}</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Sort Code</Text>
                  <Text style={styles.previewValue}>{settings['bank_sort_code'] || '—'}</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Account Number</Text>
                  <Text style={styles.previewValue}>{settings['bank_account_number'] || '—'}</Text>
                </View>
                <View style={[styles.previewRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.previewLabel}>Reference</Text>
                  <View style={styles.refBadge}>
                    <Text style={styles.refBadgeText}>BPT-A1B2C3-XY4Z</Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={styles.saveBtnText}>Save Billing Settings</Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  tabBar: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
    paddingHorizontal: 16, paddingTop: 8, gap: 4,
  },
  tabBtn: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: '#16A34A' },
  tabBtnText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  tabBtnTextActive: { color: '#16A34A' },

  content: { padding: 20, paddingBottom: 48 },

  // Info card (Stripe mode explanation)
  infoCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    marginBottom: 24, overflow: 'hidden',
  },
  infoRow: { flexDirection: 'row', gap: 12, padding: 16, alignItems: 'flex-start' },
  infoIcon: { fontSize: 22 },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  infoText: { fontSize: 13, color: '#6B7280', lineHeight: 19 },
  infoCode: { fontFamily: 'monospace', color: '#16A34A', fontSize: 12 },
  infoDivider: { height: 1, backgroundColor: '#F3F4F6' },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 6 },
  sectionHint:  { fontSize: 13, color: '#6B7280', lineHeight: 19, marginBottom: 16 },

  // Payment link cards
  linkCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    padding: 14, marginBottom: 12,
  },
  linkHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  divisionDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  linkLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: '#111827' },
  testLink: { fontSize: 13, color: '#16A34A', fontWeight: '600' },
  linkInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13, color: '#111827', backgroundColor: '#F9FAFB',
    fontFamily: 'monospace',
  },
  linkInputActive: { borderColor: '#16A34A', backgroundColor: '#F0FDF4' },
  linkStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  linkStatusDot: { fontSize: 10, color: '#16A34A' },
  linkStatusText: { fontSize: 12, color: '#16A34A', fontWeight: '500' },

  stripePortalBtn: {
    borderWidth: 1.5, borderColor: '#16A34A', borderRadius: 10,
    paddingVertical: 13, alignItems: 'center', marginTop: 4, marginBottom: 24,
  },
  stripePortalBtnText: { color: '#16A34A', fontWeight: '700', fontSize: 14 },

  // Bank fields
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    padding: 16, marginBottom: 20,
  },
  fieldDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  fieldRow: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  fieldInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 11,
    fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB',
  },
  fieldInputMultiline: { height: 72, textAlignVertical: 'top' },

  // Bank details preview
  previewCard: {
    backgroundColor: '#111827', borderRadius: 14,
    padding: 16, marginBottom: 24,
  },
  previewTitle: { fontSize: 12, color: '#6B7280', marginBottom: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  previewRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#1F2937',
  },
  previewLabel: { fontSize: 13, color: '#9CA3AF' },
  previewValue: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  refBadge: { backgroundColor: '#16A34A', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  refBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', fontFamily: 'monospace' },

  saveBtn: {
    backgroundColor: '#16A34A', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
