import React, { useState } from 'react';
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
  Modal,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, fonts } from '../../lib/theme';
import { supabase } from '../../lib/supabase';

// ─── Country data ────────────────────────────────────────────────────────────

interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
  { code: 'US', name: 'United States',  dialCode: '+1',  flag: '🇺🇸' },
  { code: 'RO', name: 'Romania',         dialCode: '+40', flag: '🇷🇴' },
  { code: 'ES', name: 'Spain',          dialCode: '+34', flag: '🇪🇸' },
  { code: 'SE', name: 'Sweden',         dialCode: '+46', flag: '🇸🇪' },
  { code: 'IT', name: 'Italy',          dialCode: '+39', flag: '🇮🇹' },
  { code: 'FR', name: 'France',         dialCode: '+33', flag: '🇫🇷' },
  { code: 'DE', name: 'Germany',        dialCode: '+49', flag: '🇩🇪' },
  { code: 'AU', name: 'Australia',      dialCode: '+61', flag: '🇦🇺' },
  { code: 'NL', name: 'Netherlands',    dialCode: '+31', flag: '🇳🇱' },
  { code: 'PT', name: 'Portugal',       dialCode: '+351',flag: '🇵🇹' },
  { code: 'AE', name: 'UAE',            dialCode: '+971',flag: '🇦🇪' },
  { code: 'ZA', name: 'South Africa',   dialCode: '+27', flag: '🇿🇦' },
  { code: 'AR', name: 'Argentina',      dialCode: '+54', flag: '🇦🇷' },
  { code: 'MX', name: 'Mexico',         dialCode: '+52', flag: '🇲🇽' },
  { code: 'BR', name: 'Brazil',         dialCode: '+55', flag: '🇧🇷' },
  { code: 'IN', name: 'India',          dialCode: '+91', flag: '🇮🇳' },
  { code: 'JP', name: 'Japan',          dialCode: '+81', flag: '🇯🇵' },
  { code: 'SG', name: 'Singapore',      dialCode: '+65', flag: '🇸🇬' },
  { code: 'CA', name: 'Canada',         dialCode: '+1',  flag: '🇨🇦' },
  { code: 'IE', name: 'Ireland',        dialCode: '+353',flag: '🇮🇪' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cleanPhoneNumber(raw: string): string {
  // Remove spaces, dashes, parentheses
  let cleaned = raw.replace(/[\s\-().]/g, '');
  // Remove leading zero
  if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
  return cleaned;
}

// ─── Component ───────────────────────────────────────────────────────────────

type Mode = 'register' | 'login';

export default function PhoneAuthScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const mode: Mode = route?.params?.mode ?? 'register';
  const isRegister = mode === 'register';

  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]); // GB default
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const digitCount = phoneNumber.replace(/\D/g, '').length;
  const canSend = digitCount >= 7;

  const handleSendCode = async () => {
    if (!canSend || loading) return;

    const cleaned = cleanPhoneNumber(phoneNumber);
    const fullPhoneNumber = selectedCountry.dialCode + cleaned;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: fullPhoneNumber });
      if (error) throw error;
      navigation.navigate('OTPVerification', { phone: fullPhoneNumber, mode });
    } catch (err: any) {
      Alert.alert('Could not send code', err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseEmail = () => {
    navigation.navigate('EmailSignup', { mode });
  };

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
          <Text style={styles.title}>
            {isRegister ? "What's your number?" : 'Welcome back'}
          </Text>
          <Text style={styles.subtitle}>
            {isRegister
              ? "We'll send you a verification code."
              : 'Enter your number to sign in.'}
          </Text>

          {/* Phone input row */}
          <View style={styles.phoneRow}>
            {/* Country code picker */}
            <TouchableOpacity
              style={styles.countryPicker}
              onPress={() => setPickerVisible(true)}
              activeOpacity={0.75}
            >
              <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
              <Text style={styles.countryDialCode}>{selectedCountry.dialCode}</Text>
              <Text style={styles.pickerCaret}>▾</Text>
            </TouchableOpacity>

            {/* Phone number input */}
            <TextInput
              style={styles.phoneInput}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="07700 900000"
              placeholderTextColor={theme.textDim}
              keyboardType="phone-pad"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSendCode}
            />
          </View>

          {/* Use email instead */}
          <TouchableOpacity onPress={handleUseEmail} style={styles.emailLink}>
            <Text style={styles.emailLinkText}>Use email instead</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom area */}
        <View style={styles.bottom}>
          <TouchableOpacity
            style={[styles.btn, (!canSend || loading) && styles.btnDisabled]}
            onPress={handleSendCode}
            disabled={!canSend || loading}
          >
            {loading
              ? <ActivityIndicator color={theme.bg} />
              : <Text style={styles.btnText}>Send code →</Text>
            }
          </TouchableOpacity>

          <Text style={styles.legalNote}>
            By continuing you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </View>

      {/* Country picker modal */}
      <Modal
        visible={pickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        />
        <SafeAreaView style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Select country</Text>
          <FlatList
            data={COUNTRIES}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.countryRow,
                  item.code === selectedCountry.code && styles.countryRowActive,
                ]}
                onPress={() => {
                  setSelectedCountry(item);
                  setPickerVisible(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.countryRowFlag}>{item.flag}</Text>
                <Text style={styles.countryRowName}>{item.name}</Text>
                <Text style={styles.countryRowDial}>{item.dialCode}</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </SafeAreaView>
      </Modal>
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
    marginBottom: 32,
    fontFamily: fonts.bodyLight,
  },

  // Phone input row
  phoneRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'stretch',
  },
  countryPicker: {
    backgroundColor: theme.bgCard,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.border,
    gap: 6,
  },
  countryFlag: {
    fontSize: 20,
    lineHeight: 24,
  },
  countryDialCode: {
    fontSize: 16,
    color: theme.textPrimary,
    fontFamily: fonts.bodyBold,
  },
  pickerCaret: {
    fontSize: 10,
    color: theme.textMuted,
    marginLeft: 2,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: theme.bgCard,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: theme.textPrimary,
    borderWidth: 1.5,
    borderColor: theme.border,
    fontFamily: fonts.bodyLight,
  },

  // Email link
  emailLink: {
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  emailLinkText: {
    fontSize: 14,
    color: theme.primary,
    fontFamily: fonts.bodyBold,
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
  legalNote: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    lineHeight: 16,
    fontFamily: fonts.bodyLight,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    backgroundColor: theme.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    paddingBottom: 24,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: fonts.headlineBold,
    color: theme.textPrimary,
    textAlign: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 12,
  },
  countryRowActive: {
    backgroundColor: theme.primaryDim,
  },
  countryRowFlag: {
    fontSize: 22,
    lineHeight: 26,
    width: 30,
    textAlign: 'center',
  },
  countryRowName: {
    flex: 1,
    fontSize: 15,
    color: theme.textPrimary,
    fontFamily: fonts.bodyLight,
  },
  countryRowDial: {
    fontSize: 14,
    color: theme.textSecondary,
    fontFamily: fonts.bodyBold,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.border,
    marginHorizontal: 24,
  },
});
