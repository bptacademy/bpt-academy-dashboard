import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, Image, Dimensions} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { supabase } from '../../lib/supabase';
import ScreenHeader from '../../components/common/ScreenHeader';

type Settings = Record<string, string>;

const BANK_FIELDS: { key: string; label: string; placeholder: string; multiline?: boolean }[] = [
  { key: 'bank_account_name',   label: 'Account Name',   placeholder: 'e.g. BPT Academy Ltd' },
  { key: 'bank_sort_code',      label: 'Sort Code',      placeholder: 'e.g. 20-12-34' },
  { key: 'bank_account_number', label: 'Account Number', placeholder: 'e.g. 12345678' },
  { key: 'bank_payment_notes',  label: 'Payment Notes',  placeholder: 'Instructions shown to students', multiline: true },
];

const PAYMENT_LINK_FIELDS: { key: string; label: string; placeholder: string }[] = [
  { key: 'stripe_payment_link_amateur',  label: 'Amateur Division',  placeholder: 'https://buy.stripe.com/...' },
  { key: 'stripe_payment_link_semi_pro', label: 'Semi-Pro Division', placeholder: 'https://buy.stripe.com/...' },
  { key: 'stripe_payment_link_pro',      label: 'Pro Division',      placeholder: 'https://buy.stripe.com/...' },
];

const ALL_FIELDS = [...BANK_FIELDS, ...PAYMENT_LINK_FIELDS];

export default function AcademySettingsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarPadding = useTabBarPadding();
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  const fetchSettings = async () => {
    const { data } = await supabase.from('academy_settings').select('key, value');
    if (data) {
      const map: Settings = {};
      data.forEach(({ key, value }) => { map[key] = value; });
      setSettings(map);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSave = async () => {
    setSaving(true);
    const upserts = ALL_FIELDS.map(({ key }) => ({ key, value: settings[key] ?? '', updated_at: new Date().toISOString() }));
    const { error } = await supabase.from('academy_settings').upsert(upserts, { onConflict: 'key' });
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    Alert.alert('✅ Settings saved!');
  };

  const update = (key: string, value: string) => setSettings((prev) => ({ ...prev, [key]: value }));

  if (loading) {
    return (
      <View style={styles.center}>
      <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />

        <ActivityIndicator size="large" color="#16A34A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Academy Settings" />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Bank Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏦 Bank Transfer Details</Text>
          <Text style={styles.sectionHint}>
            Shown to students when they choose bank transfer as their payment method.
          </Text>
          <View style={styles.card}>
            {BANK_FIELDS.map(({ key, label, placeholder, multiline }) => (
              <View key={key} style={styles.field}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  style={[styles.input, multiline && styles.inputMultiline]}
                  value={settings[key] ?? ''}
                  onChangeText={(v) => update(key, v)}
                  placeholder={placeholder}
                  placeholderTextColor="#9CA3AF"
                  multiline={multiline}
                  numberOfLines={multiline ? 3 : 1}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Stripe Payment Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔗 Stripe Payment Links</Text>
          <Text style={styles.sectionHint}>
            One Stripe Payment Link per division. Students are sent to the link for their division when paying by card. Generate links at dashboard.stripe.com → Payment Links.
          </Text>
          <View style={styles.card}>
            {PAYMENT_LINK_FIELDS.map(({ key, label, placeholder }) => (
              <View key={key} style={styles.field}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  style={styles.input}
                  value={settings[key] ?? ''}
                  onChangeText={(v) => update(key, v)}
                  placeholder={placeholder}
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
            ))}
          </View>
        </View>

        {/* Stripe placeholder */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💳 Stripe Integration</Text>
          <View style={styles.stripeCard}>
            <Text style={styles.stripeIcon}>💳</Text>
            <Text style={styles.stripeTitle}>Connect Your Stripe Account</Text>
            <Text style={styles.stripeText}>
              To enable card payments, provide your Stripe keys. Contact your developer to add these to the backend environment:
            </Text>
            <View style={styles.keyList}>
              <Text style={styles.keyItem}>• <Text style={styles.keyCode}>STRIPE_SECRET_KEY</Text> (server-side, never in the app)</Text>
              <Text style={styles.keyItem}>• <Text style={styles.keyCode}>STRIPE_PUBLISHABLE_KEY</Text> (safe for the app)</Text>
              <Text style={styles.keyItem}>• <Text style={styles.keyCode}>STRIPE_WEBHOOK_SECRET</Text> (for payment confirmation)</Text>
            </View>
            <Text style={styles.stripeNote}>
              Once connected, students will see a live card payment form powered by Stripe.
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={styles.saveBtnText}>Save Settings</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 48 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
  sectionHint: { fontSize: 13, color: '#6B7280', marginBottom: 14, lineHeight: 20 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', padding: 16, gap: 14 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: '#111827', backgroundColor: '#F9FAFB',
  },
  inputMultiline: { height: 80, textAlignVertical: 'top' },
  stripeCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2,
    borderColor: '#E5E7EB', borderStyle: 'dashed', padding: 24, alignItems: 'center',
  },
  stripeIcon: { fontSize: 40, marginBottom: 12 },
  stripeTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8, textAlign: 'center' },
  stripeText: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  keyList: { alignSelf: 'stretch', backgroundColor: '#F9FAFB', borderRadius: 10, padding: 14, marginBottom: 14, gap: 6 },
  keyItem: { fontSize: 13, color: '#374151', lineHeight: 20 },
  keyCode: { fontFamily: 'monospace', color: '#16A34A', fontWeight: '600' },
  stripeNote: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 },
  saveBtn: { backgroundColor: '#16A34A', borderRadius: 12, padding: 16, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
