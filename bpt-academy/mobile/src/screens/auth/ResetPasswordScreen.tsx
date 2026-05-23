import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, ScrollView,
  Image, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

type Props = { navigation: any };

export default function ResetPasswordScreen({ navigation }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);

  // Supabase fires onAuthStateChange with PASSWORD_RECOVERY when the deep link is opened
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User is now in password recovery session — ready to set new password
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSave = async () => {
    if (!password) { Alert.alert('Error', 'Please enter a new password'); return; }
    if (password.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters'); return; }
    if (password !== confirm) { Alert.alert('Error', 'Passwords do not match'); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) { Alert.alert('Error', error.message); return; }
    setDone(true);
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
          <View style={styles.header}>
            <Text style={styles.title}>Choose a new password</Text>
            <Text style={styles.subtitle}>Enter and confirm your new password below.</Text>
          </View>

          <View style={styles.card}>
            {!done ? (
              <>
                <Text style={styles.label}>New Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Minimum 6 characters"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoFocus
                />
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Repeat your new password"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={confirm}
                  onChangeText={setConfirm}
                  secureTextEntry
                />
                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleSave}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Save New Password'}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.successBox}>
                <Text style={styles.successIcon}>✅</Text>
                <Text style={styles.successTitle}>Password updated!</Text>
                <Text style={styles.successText}>Your password has been changed successfully.</Text>
                <TouchableOpacity style={styles.button} onPress={() => navigation.replace('Login')}>
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
  inner: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 0, marginTop: '15%' },
  header: { marginBottom: 28 },
  title: { fontSize: 26, fontWeight: '800', color: '#F0F6FC', marginBottom: 10 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 20 },
  card: {
    backgroundColor: 'rgba(17,30,51,0.80)', borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
  },
  label: { fontSize: 14, fontWeight: '600', color: '#F0F6FC', marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 10,
    padding: 14, fontSize: 16, color: '#F0F6FC', marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  button: { backgroundColor: '#3B82F6', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  successBox: { alignItems: 'center', gap: 12 },
  successIcon: { fontSize: 48, marginBottom: 4 },
  successTitle: { fontSize: 20, fontWeight: '800', color: '#F0F6FC' },
  successText: { fontSize: 14, color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginBottom: 8 },
});
