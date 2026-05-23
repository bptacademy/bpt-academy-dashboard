import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, ScrollView,
  Image, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = { navigation: NativeStackNavigationProp<any> };

export default function ForgotPasswordScreen({ navigation }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  const handleReset = async () => {
    if (!email.trim()) { Alert.alert('Error', 'Please enter your email address'); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'https://app.bptacademy.uk/reset-password.html',
    });
    setLoading(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setSent(true);
  };

  return (
    <View style={styles.root}>
      <Image source={require('../../../assets/bg.png')} style={[styles.bg, { width, height }]} resizeMode="cover" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.inner, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your email and we'll send you a link to reset your password.
            </Text>
          </View>

          <View style={styles.card}>
            {!sent ? (
              <>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  autoFocus
                />
                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleReset}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send Reset Link'}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.successBox}>
                <Text style={styles.successIcon}>✅</Text>
                <Text style={styles.successTitle}>Check your inbox</Text>
                <Text style={styles.successText}>
                  We've sent a password reset link to{'\n'}
                  <Text style={styles.successEmail}>{email}</Text>
                </Text>
                <Text style={styles.successHint}>
                  Click the link in the email to set a new password. Check your spam folder if you don't see it.
                </Text>
                <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
                  <Text style={styles.buttonText}>Back to Login</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B1628' },
  bg: { position: 'absolute', top: 0, left: 0 },
  flex: { flex: 1 },
  inner: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 0, marginTop: '10%' },
  backBtn: { marginBottom: 24 },
  backText: { color: '#3B82F6', fontSize: 16, fontWeight: '600' },
  header: { marginBottom: 28 },
  title: { fontSize: 26, fontWeight: '800', color: '#F0F6FC', marginBottom: 10 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 20 },
  card: {
    backgroundColor: 'rgba(17,30,51,0.80)', borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
  },
  label: { fontSize: 14, fontWeight: '600', color: '#F0F6FC', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 10,
    padding: 14, fontSize: 16, color: '#F0F6FC', marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  button: { backgroundColor: '#3B82F6', borderRadius: 10, padding: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  successBox: { alignItems: 'center', gap: 12 },
  successIcon: { fontSize: 48, marginBottom: 4 },
  successTitle: { fontSize: 20, fontWeight: '800', color: '#F0F6FC' },
  successText: { fontSize: 14, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 22 },
  successEmail: { color: '#3B82F6', fontWeight: '700' },
  successHint: { fontSize: 12, color: 'rgba(255,255,255,0.40)', textAlign: 'center', lineHeight: 18, marginBottom: 8 },
});
