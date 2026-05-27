import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, TextInput as RNTextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, fonts } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

async function ensureUsersRow(userId: string, email: string, firstName: string, lastName: string) {
  const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
  const { error } = await supabase.from('users').upsert({
    auth_id: userId,
    email,
    full_name: fullName || null,
    profile_complete: false,
    last_active_at: new Date().toISOString(),
  }, { onConflict: 'auth_id' });
  if (error) console.warn('users upsert warning:', error.message);
}

type Mode = 'register' | 'login';

export default function EmailSignupScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { refreshUser } = useAuth();

  // mode passed from WelcomeScreen — 'register' (default) or 'login'
  const initialMode: Mode = route?.params?.mode ?? 'register';
  const [mode, setMode] = useState<Mode>(initialMode);

  // Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Refs for keyboard focus chain
  const lastNameRef = useRef<RNTextInput>(null);
  const emailRef = useRef<RNTextInput>(null);
  const passwordRef = useRef<RNTextInput>(null);

  const isRegister = mode === 'register';

  // ─── Validation ────────────────────────────────────────────────────────────

  const validateRegister = () => {
    if (!firstName.trim()) return 'Please enter your first name.';
    if (!lastName.trim()) return 'Please enter your last name.';
    if (!email.trim().includes('@')) return 'Please enter a valid email address.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    return null;
  };

  const validateLogin = () => {
    if (!email.trim().includes('@')) return 'Please enter a valid email address.';
    if (!password) return 'Please enter your password.';
    return null;
  };

  const canSubmit = isRegister
    ? firstName.trim() && lastName.trim() && email.trim() && password.length >= 8
    : email.trim() && password;

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleRegister = async () => {
    const err = validateRegister();
    if (err) { Alert.alert('Check your details', err); return; }

    setLoading(true);
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: { first_name: trimmedFirst, last_name: trimmedLast },
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes('already registered')) {
          throw new Error('An account with this email already exists. Try signing in instead.');
        }
        throw error;
      }

      if (!data?.session) {
        // Email confirmation required — tell the user
        Alert.alert(
          'Check your inbox 📬',
          `We sent a confirmation link to ${trimmedEmail}. Tap it to activate your account, then come back and sign in.`,
          [{ text: 'OK', onPress: () => setMode('login') }],
        );
        setLoading(false);
        return;
      }

      await ensureUsersRow(data.session.user.id, trimmedEmail, trimmedFirst, trimmedLast);
      await refreshUser();
      // Navigation auto-switches via Navigation component (profile_complete = false → onboarding)
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Sign up failed', err?.message ?? 'Something went wrong. Please try again.');
    }
  };

  const handleLogin = async () => {
    const err = validateLogin();
    if (err) { Alert.alert('Check your details', err); return; }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes('invalid login')) {
          throw new Error('Incorrect email or password. Please try again.');
        }
        throw error;
      }

      if (!data?.session) throw new Error('Sign in failed. Please try again.');

      await refreshUser();
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Sign in failed', err?.message ?? 'Something went wrong. Please try again.');
    }
  };

  const handleForgotPassword = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes('@')) {
      Alert.alert('Enter your email first', 'Type your email address above, then tap "Forgot password".');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: 'https://volpair.app/reset-password.html',
    });
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Reset link sent 📬', `Check your inbox at ${trimmed} for a password reset link.`);
    }
  };

  const handleSubmit = () => {
    if (isRegister) handleRegister();
    else handleLogin();
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Text style={styles.title}>
            {isRegister ? 'Create your account' : 'Welcome back'}
          </Text>
          <Text style={styles.subtitle}>
            {isRegister
              ? "Fill in the basics. We'll ask for the rest after you confirm your email."
              : 'Sign in to continue finding your next padel partner.'}
          </Text>

          {/* Register-only fields */}
          {isRegister && (
            <View style={styles.nameRow}>
              <View style={[styles.inputWrap, { flex: 1 }]}>
                <Text style={styles.label}>First name</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Fabian"
                  placeholderTextColor={theme.textDim}
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoFocus
                  returnKeyType="next"
                  onSubmitEditing={() => lastNameRef.current?.focus()}
                />
              </View>
              <View style={[styles.inputWrap, { flex: 1 }]}>
                <Text style={styles.label}>Last name</Text>
                <TextInput
                  ref={lastNameRef}
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="David"
                  placeholderTextColor={theme.textDim}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              </View>
            </View>
          )}

          {/* Email */}
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              ref={emailRef}
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor={theme.textDim}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus={!isRegister}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </View>

          {/* Password */}
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Password{isRegister ? ' (min 8 characters)' : ''}</Text>
            <View style={styles.passwordRow}>
              <TextInput
                ref={passwordRef}
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder={isRegister ? 'Create a password' : 'Your password'}
                placeholderTextColor={theme.textDim}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword((v) => !v)}
                activeOpacity={0.7}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot password (login only) */}
          {!isRegister && (
            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          )}

          {/* Register note */}
          {isRegister && (
            <Text style={styles.note}>
              No spam. No marketing. Just your padel matches.
            </Text>
          )}
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.bottom}>
          <TouchableOpacity
            style={[styles.btn, (!canSubmit || loading) && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || loading}
          >
            {loading
              ? <ActivityIndicator color={theme.bg} />
              : <Text style={styles.btnText}>
                  {isRegister ? 'Create account →' : 'Sign in →'}
                </Text>
            }
          </TouchableOpacity>

          {/* Toggle mode */}
          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => setMode(isRegister ? 'login' : 'register')}
          >
            <Text style={styles.toggleText}>
              {isRegister
                ? 'Already have an account? '
                : "Don't have an account? "}
              <Text style={styles.toggleLink}>
                {isRegister ? 'Sign in' : 'Get started'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
    paddingHorizontal: 24,
  },
  backBtn: { paddingVertical: 16 },
  backText: { color: theme.textSecondary, fontSize: 16, fontFamily: fonts.bodyLight },

  scroll: { flex: 1 },
  scrollContent: { paddingTop: 8, paddingBottom: 24 },

  title: {
    fontSize: 28,
    fontFamily: fonts.headlineBold,
    color: theme.textPrimary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: theme.textMuted,
    lineHeight: 22,
    marginBottom: 28,
    fontFamily: fonts.bodyLight,
  },

  // Name row (side by side)
  nameRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 0,
  },

  inputWrap: {
    marginBottom: 18,
  },
  label: {
    fontSize: 12,
    fontFamily: fonts.bodyBold,
    color: theme.textSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.bgCard,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: theme.textPrimary,
    borderWidth: 1.5,
    borderColor: theme.border,
    fontFamily: fonts.bodyLight,
  },

  // Password
  passwordRow: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 52,
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  eyeIcon: { fontSize: 18 },

  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 8,
  },
  forgotText: {
    fontSize: 13,
    color: theme.primary,
    fontFamily: fonts.bodyBold,
  },

  note: {
    fontSize: 13,
    color: theme.textDim,
    marginTop: 4,
    fontFamily: fonts.bodyLight,
  },

  // Bottom
  bottom: {
    paddingBottom: 8,
    gap: 12,
  },
  btn: {
    backgroundColor: theme.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: {
    color: theme.bg,
    fontSize: 17,
    fontFamily: fonts.headlineBold,
  },

  toggleBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleText: {
    fontSize: 14,
    color: theme.textMuted,
    fontFamily: fonts.bodyLight,
  },
  toggleLink: {
    color: theme.primary,
    fontFamily: fonts.bodyBold,
  },
});
