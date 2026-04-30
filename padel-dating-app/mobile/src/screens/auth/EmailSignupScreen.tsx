import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';

export default function EmailSignupScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      // Try sign in first (returning user)
      const { data: signInData } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password: `volpair_${trimmed}_mvp`,
      });

      if (signInData?.session) {
        navigation.navigate('PlatformSelect');
        return;
      }

      // New user — sign up
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: trimmed,
        password: `volpair_${trimmed}_mvp`,
      });

      if (signUpError) throw signUpError;
      if (!signUpData?.session) throw new Error('Account created but no session returned. Please try again.');

      // Create the users row immediately so Edge Functions can find it
      const { error: insertError } = await supabase.from('users').upsert({
        auth_id: signUpData.session.user.id,
        email: trimmed,
        profile_complete: false,
        created_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
      }, { onConflict: 'auth_id' });

      if (insertError) console.warn('users insert error (non-fatal):', insertError.message);

      navigation.navigate('PlatformSelect');
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Error', err?.message ?? 'Something went wrong. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.title}>{"What's your email?"}</Text>
          <Text style={styles.subtitle}>
            This is your Volpair account. We'll use it to save your profile and send you matches.
          </Text>

          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor={theme.textDim}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            returnKeyType="go"
            onSubmitEditing={handleContinue}
          />

          <Text style={styles.note}>No spam. No marketing. Just your matches.</Text>
        </View>

        <View style={styles.bottom}>
          <TouchableOpacity
            style={[styles.btn, (!email.trim() || loading) && styles.btnDisabled]}
            onPress={handleContinue}
            disabled={!email.trim() || loading}
          >
            {loading
              ? <ActivityIndicator color={theme.bg} />
              : <Text style={styles.btnText}>Continue →</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: 24 },
  backBtn: { paddingVertical: 16 },
  backText: { color: theme.textSecondary, fontSize: 16 },
  content: { flex: 1, paddingTop: 16 },
  title: { fontSize: 28, fontWeight: '800', color: theme.textPrimary, marginBottom: 10 },
  subtitle: { fontSize: 15, color: theme.textMuted, lineHeight: 22, marginBottom: 32 },
  input: {
    backgroundColor: theme.bgCard, borderRadius: 14, padding: 18,
    fontSize: 18, color: theme.textPrimary, borderWidth: 1.5, borderColor: theme.border,
    marginBottom: 16,
  },
  note: { fontSize: 13, color: theme.textDim },
  bottom: { paddingBottom: 12 },
  btn: {
    backgroundColor: theme.primary, borderRadius: 16, padding: 18, alignItems: 'center',
    shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: theme.bg, fontSize: 17, fontWeight: '800' },
});
