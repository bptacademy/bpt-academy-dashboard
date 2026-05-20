import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, TextInput, ActivityIndicator, Image, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import ScreenHeader from '../../components/common/ScreenHeader';

const SUPABASE_URL = 'https://nobxhhnhakawhbimrate.supabase.co';
const SERVICE_ROLE_KEY = 'REDACTED_SERVICE_ROLE_KEY';

export default function DeleteAccountScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile, signOut } = useAuth();

  const [step, setStep] = useState<'confirm' | 'type' | 'deleting'>('confirm');
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');

  const handleProceed = () => {
    setStep('type');
  };

  const handleDelete = async () => {
    if (typed !== 'DELETE') {
      setError('Please type DELETE exactly to confirm.');
      return;
    }
    setError('');
    setStep('deleting');

    try {
      const userId = profile?.id;
      if (!userId) throw new Error('No user ID found.');

      // 1. Delete user data (retain payments per HMRC)
      await supabase.from('notifications').delete().eq('user_id', userId);
      await supabase.from('video_bookmarks').delete().eq('user_id', userId);
      await supabase.from('video_comments').delete().eq('user_id', userId);
      await supabase.from('coach_notes').delete().eq('student_id', userId);
      await supabase.from('student_progress').delete().eq('student_id', userId);
      await supabase.from('session_attendance').delete().eq('student_id', userId);
      await supabase.from('tournament_registrations').delete().eq('student_id', userId);
      await supabase.from('conversation_members').delete().eq('user_id', userId);
      await supabase.from('enrollments').delete().eq('student_id', userId);
      await supabase.from('profiles').delete().eq('id', userId);

      // 2. Delete the auth user via service role (required to remove login)
      const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });

      if (!res.ok && res.status !== 404) {
        const body = await res.text();
        throw new Error(`Auth deletion failed: ${body}`);
      }

      // 3. Sign out locally
      await signOut();

    } catch (err: any) {
      setStep('type');
      Alert.alert(
        'Deletion failed',
        err.message ?? 'Something went wrong. Please contact office@bptacademy.uk to request manual deletion.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0B1628' }}>
      <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />
      <ScreenHeader title="Delete Account" />

      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32 }]}>

        {step === 'confirm' && (
          <>
            <View style={styles.warningBanner}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <Text style={styles.warningTitle}>This action is permanent</Text>
              <Text style={styles.warningSubtitle}>
                Deleting your account cannot be undone. Please read what will happen before continuing.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What will be deleted</Text>
              <View style={styles.card}>
                {[
                  '👤  Your profile and personal details',
                  '📊  Your training progress and attendance',
                  '🏆  Your tournament records',
                  '💬  Your messages and conversations',
                  '🔔  Your notifications',
                  '🎬  Your video bookmarks and comments',
                  '📋  Your programme enrolments',
                ].map((item, i) => (
                  <View key={i}>
                    {i > 0 && <View style={styles.divider} />}
                    <Text style={styles.listItem}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What will be retained</Text>
              <View style={styles.card}>
                <Text style={styles.listItem}>💳  Payment records are kept for 7 years as required by HMRC</Text>
                <View style={styles.divider} />
                <Text style={styles.listItem}>📈  Anonymised usage statistics (no personal data)</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.noteText}>
                Account deletion is processed immediately. If you need help, contact{' '}
                <Text style={styles.emailLink}>office@bptacademy.uk</Text>.
              </Text>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.proceedBtn} onPress={handleProceed}>
                <Text style={styles.proceedBtnText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {step === 'type' && (
          <>
            <View style={styles.warningBanner}>
              <Text style={styles.warningIcon}>🗑️</Text>
              <Text style={styles.warningTitle}>Confirm account deletion</Text>
              <Text style={styles.warningSubtitle}>
                Type <Text style={styles.deleteWord}>DELETE</Text> below to permanently delete your account.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.inputLabel}>Type DELETE to confirm</Text>
              <TextInput
                style={[styles.confirmInput, error ? styles.confirmInputError : null]}
                value={typed}
                onChangeText={(t) => { setTyped(t); setError(''); }}
                placeholder="DELETE"
                placeholderTextColor="#4B6080"
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {!!error && <Text style={styles.errorText}>{error}</Text>}
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setStep('confirm'); setTyped(''); setError(''); }}>
                <Text style={styles.cancelBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteBtn, typed !== 'DELETE' && styles.deleteBtnDisabled]}
                onPress={handleDelete}
                disabled={typed !== 'DELETE'}
              >
                <Text style={styles.deleteBtnText}>Delete My Account</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {step === 'deleting' && (
          <View style={styles.deletingContainer}>
            <ActivityIndicator size="large" color="#EF4444" />
            <Text style={styles.deletingText}>Deleting your account…</Text>
            <Text style={styles.deletingSubtext}>This may take a moment. Please don't close the app.</Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  bgImage: { position: 'absolute', top: 0, left: 0, width, height },
  container: { padding: 16 },
  warningBanner: {
    backgroundColor: 'rgba(220,38,38,0.12)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.30)',
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  warningIcon: { fontSize: 36, marginBottom: 10 },
  warningTitle: { fontSize: 18, fontWeight: '700', color: '#F0F6FC', marginBottom: 6, textAlign: 'center' },
  warningSubtitle: { fontSize: 14, color: '#7A8FA6', textAlign: 'center', lineHeight: 20 },
  deleteWord: { color: '#EF4444', fontWeight: '700' },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#7A8FA6',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  card: {
    backgroundColor: 'rgba(17,30,51,0.85)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', overflow: 'hidden',
    paddingHorizontal: 4,
  },
  listItem: { fontSize: 15, color: '#F0F6FC', padding: 14, lineHeight: 22 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 14 },
  noteText: { fontSize: 13, color: '#7A8FA6', lineHeight: 20, textAlign: 'center' },
  emailLink: { color: '#3B82F6' },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12, padding: 16, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#7A8FA6' },
  proceedBtn: {
    flex: 1.5, backgroundColor: 'rgba(220,38,38,0.20)',
    borderRadius: 12, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(220,38,38,0.40)',
  },
  proceedBtnText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#F0F6FC', marginBottom: 10 },
  confirmInput: {
    backgroundColor: 'rgba(17,30,51,0.85)', borderRadius: 12,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
    padding: 16, fontSize: 18, fontWeight: '700', color: '#F0F6FC',
    textAlign: 'center', letterSpacing: 4,
  },
  confirmInputError: { borderColor: '#EF4444' },
  errorText: { color: '#EF4444', fontSize: 13, marginTop: 8, textAlign: 'center' },
  deleteBtn: {
    flex: 1.5, backgroundColor: '#EF4444',
    borderRadius: 12, padding: 16, alignItems: 'center',
  },
  deleteBtnDisabled: { backgroundColor: 'rgba(220,38,38,0.25)' },
  deleteBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  deletingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 16 },
  deletingText: { fontSize: 18, fontWeight: '700', color: '#F0F6FC' },
  deletingSubtext: { fontSize: 14, color: '#7A8FA6', textAlign: 'center' },
});
