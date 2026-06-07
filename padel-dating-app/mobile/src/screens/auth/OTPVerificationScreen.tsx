import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  TextInputChangeEventData,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, fonts } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;

// ─── Component ───────────────────────────────────────────────────────────────

export default function OTPVerificationScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { refreshUser } = useAuth();

  const phone: string = route?.params?.phone ?? '';
  const mode: string = route?.params?.mode ?? 'register';

  // ─── State ─────────────────────────────────────────────────────────────────

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);

  // ─── Refs ──────────────────────────────────────────────────────────────────

  const inputRefs = useRef<Array<TextInput | null>>(Array(CODE_LENGTH).fill(null));
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // ─── Countdown ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // ─── Derived ───────────────────────────────────────────────────────────────

  const code = digits.join('');
  const isComplete = code.length === CODE_LENGTH && digits.every((d) => d !== '');

  // ─── Shake animation ───────────────────────────────────────────────────────

  const triggerShake = useCallback(() => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8,   duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  // ─── Digit input handlers ──────────────────────────────────────────────────

  const focusInput = (index: number) => {
    const clamped = Math.max(0, Math.min(CODE_LENGTH - 1, index));
    inputRefs.current[clamped]?.focus();
    setActiveIndex(clamped);
  };

  const handleChange = (index: number) => (text: string) => {
    // Support paste: if pasted 6 chars, fill all boxes
    if (text.length > 1) {
      const clean = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
      if (clean.length === CODE_LENGTH) {
        const next = clean.split('');
        setDigits(next);
        focusInput(CODE_LENGTH - 1);
        return;
      }
    }

    const char = text.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);

    if (char && index < CODE_LENGTH - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyPress = (index: number) => (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>
  ) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (digits[index]) {
        // Clear current box
        const next = [...digits];
        next[index] = '';
        setDigits(next);
      } else if (index > 0) {
        // Move to previous and clear it
        const next = [...digits];
        next[index - 1] = '';
        setDigits(next);
        focusInput(index - 1);
      }
    }
  };

  // ─── Verify ────────────────────────────────────────────────────────────────

  const handleVerify = async () => {
    if (!isComplete || loading) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: code,
        type: 'sms',
      });
      if (error) throw error;
      await refreshUser();
      // Navigation is handled automatically by navigation/index.tsx
    } catch (err: any) {
      triggerShake();
      setDigits(Array(CODE_LENGTH).fill(''));
      focusInput(0);
      Alert.alert('Incorrect code', err?.message ?? 'The code you entered is wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Resend ────────────────────────────────────────────────────────────────

  const handleResend = async () => {
    if (countdown > 0) return;
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      setCountdown(RESEND_SECONDS);
      setDigits(Array(CODE_LENGTH).fill(''));
      focusInput(0);
    } catch (err: any) {
      Alert.alert('Could not resend', err?.message ?? 'Please try again.');
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>Enter the code</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to{' '}
            <Text style={styles.phoneHighlight}>{phone}</Text>
          </Text>

          {/* Digit boxes */}
          <Animated.View
            style={[
              styles.boxRow,
              { transform: [{ translateX: shakeAnim }] },
            ]}
          >
            {digits.map((digit, i) => (
              <TextInput
                key={i}
                ref={(ref) => { inputRefs.current[i] = ref; }}
                style={[
                  styles.digitBox,
                  activeIndex === i && styles.digitBoxActive,
                  digit ? styles.digitBoxFilled : null,
                ]}
                value={digit}
                onChangeText={handleChange(i)}
                onKeyPress={handleKeyPress(i)}
                onFocus={() => setActiveIndex(i)}
                keyboardType="number-pad"
                maxLength={6} // allow paste of full code into first box
                textAlign="center"
                selectTextOnFocus
                caretHidden
              />
            ))}
          </Animated.View>

          {/* Resend */}
          <TouchableOpacity
            onPress={handleResend}
            disabled={countdown > 0}
            style={styles.resendBtn}
          >
            <Text style={[styles.resendText, countdown > 0 && styles.resendDisabled]}>
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom CTA */}
        <View style={styles.bottom}>
          <TouchableOpacity
            style={[styles.btn, (!isComplete || loading) && styles.btnDisabled]}
            onPress={handleVerify}
            disabled={!isComplete || loading}
          >
            {loading
              ? <ActivityIndicator color={theme.bg} />
              : <Text style={styles.btnText}>Verify →</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
    paddingHorizontal: 24,
  },
  backBtn: {
    paddingVertical: 16,
  },
  backText: {
    color: theme.textSecondary,
    fontSize: 16,
    fontFamily: fonts.bodyLight,
  },

  content: {
    flex: 1,
    paddingTop: 8,
  },
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
    marginBottom: 36,
    fontFamily: fonts.bodyLight,
  },
  phoneHighlight: {
    color: theme.textPrimary,
    fontFamily: fonts.bodyBold,
  },

  // Digit boxes
  boxRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 28,
  },
  digitBox: {
    width: 52,
    height: 64,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.border,
    backgroundColor: theme.bgCard,
    fontSize: 24,
    fontFamily: fonts.headlineBold,
    color: theme.textPrimary,
    textAlign: 'center',
  },
  digitBoxActive: {
    borderColor: theme.primary,
  },
  digitBoxFilled: {
    borderColor: theme.primaryBorder,
  },

  // Resend
  resendBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  resendText: {
    fontSize: 14,
    color: theme.primary,
    fontFamily: fonts.bodyBold,
  },
  resendDisabled: {
    color: theme.textMuted,
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
  btnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    color: '#05020E',
    fontSize: 17,
    fontFamily: fonts.headlineBold,
  },
});
