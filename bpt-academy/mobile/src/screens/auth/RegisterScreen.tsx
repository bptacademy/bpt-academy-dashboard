import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, Image, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Division, DIVISION_LABELS, DIVISION_COLORS, SkillLevel } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const LOGO_WIDTH = Math.min(SCREEN_WIDTH - 48, 320);
const LOGO_HEIGHT = LOGO_WIDTH * 0.55;

type Props = { navigation: NativeStackNavigationProp<any> };

const DIVISIONS: Division[] = ['amateur', 'semi_pro', 'pro'];
const AMATEUR_LEVELS: { label: string; value: SkillLevel }[] = [
  { label: 'Beginner',     value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced',     value: 'advanced' },
];

export default function RegisterScreen({ navigation }: Props) {
  const [accountType, setAccountType] = useState<'student' | 'parent' | null>(null);
  const [fullName, setFullName]   = useState('');
  const [email, setEmail]         = useState('');
  const [phone, setPhone]         = useState('');
  const [password, setPassword]   = useState('');
  const [division, setDivision]   = useState<Division>('amateur');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('beginner');
  const [loading, setLoading]     = useState(false);

  const handleRegister = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'student',
          division,
          skill_level: division === 'amateur' ? skillLevel : null,
        },
      },
    });
    setLoading(false);
    if (error) {
      Alert.alert('Registration failed', error.message);
    } else {
      Alert.alert('Account created!', 'Check your email to confirm, then log in.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Image source={require('../../../assets/logo.png')} style={[styles.logo, { width: LOGO_WIDTH, height: LOGO_HEIGHT }]} resizeMode="contain" />
          <Text style={styles.subtitle}>Create your account</Text>
        </View>

        {/* Account type selector */}
        <Text style={styles.accountTypeLabel}>I am registering as a...</Text>
        <View style={styles.accountTypeRow}>
          <TouchableOpacity
            style={[styles.accountTypeCard, accountType === 'student' && styles.accountTypeCardActive]}
            onPress={() => setAccountType('student')}
          >
            <Text style={styles.accountTypeIcon}>🎾</Text>
            <Text style={[styles.accountTypeTitle, accountType === 'student' && styles.accountTypeTitleActive]}>Player</Text>
            <Text style={[styles.accountTypeHint, accountType === 'student' && styles.accountTypeHintActive]}>I play padel at BPT Academy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.accountTypeCard, accountType === 'parent' && styles.accountTypeCardActive]}
            onPress={() => {
              setAccountType('parent');
              navigation.navigate('ParentRegister');
            }}
          >
            <Text style={styles.accountTypeIcon}>👨‍👩‍👧‍👦</Text>
            <Text style={[styles.accountTypeTitle, accountType === 'parent' && styles.accountTypeTitleActive]}>Parent / Guardian</Text>
            <Text style={[styles.accountTypeHint, accountType === 'parent' && styles.accountTypeHintActive]}>I'm registering my child</Text>
          </TouchableOpacity>
        </View>

        {/* Student form — only shown once Player is selected */}
        {accountType === 'student' && (
          <View style={styles.form}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput style={styles.input} placeholder="Your full name" placeholderTextColor="#9CA3AF"
              value={fullName} onChangeText={setFullName} />

            <Text style={styles.label}>Email *</Text>
            <TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor="#9CA3AF"
              value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

            <Text style={styles.label}>Phone</Text>
            <TextInput style={styles.input} placeholder="+44 7700 000000" placeholderTextColor="#9CA3AF"
              value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

            <Text style={styles.label}>Password *</Text>
            <TextInput style={styles.input} placeholder="Min. 6 characters" placeholderTextColor="#9CA3AF"
              value={password} onChangeText={setPassword} secureTextEntry />

            <Text style={styles.label}>Division *</Text>
            <View style={styles.chipRow}>
              {DIVISIONS.map((div) => {
                const color = DIVISION_COLORS[div];
                const selected = division === div;
                return (
                  <TouchableOpacity
                    key={div}
                    style={[styles.chip, selected && { backgroundColor: color, borderColor: color }]}
                    onPress={() => setDivision(div)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                      {DIVISION_LABELS[div]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {division === 'amateur' && (
              <>
                <Text style={styles.label}>Amateur Level *</Text>
                <View style={styles.chipRow}>
                  {AMATEUR_LEVELS.map((s) => (
                    <TouchableOpacity
                      key={s.value}
                      style={[styles.chip, skillLevel === s.value && styles.chipActive]}
                      onPress={() => setSkillLevel(s.value)}
                    >
                      <Text style={[styles.chipText, skillLevel === s.value && styles.chipTextActive]}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Creating account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkText}>
            Already have an account? <Text style={styles.linkBold}>Sign in</Text>
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  inner: { flexGrow: 1, padding: 24 },
  header: { alignItems: 'center', marginBottom: 24, marginTop: 20 },
  logo: { marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6B7280', marginTop: 4 },

  accountTypeLabel: { fontSize: 15, fontWeight: '700', color: '#1a2744', marginBottom: 12, textAlign: 'center' },
  accountTypeRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  accountTypeCard: {
    flex: 1, borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 14,
    padding: 16, alignItems: 'center', backgroundColor: '#F9FAFB',
  },
  accountTypeCardActive: { borderColor: '#16A34A', backgroundColor: '#F0FDF4' },
  accountTypeIcon: { fontSize: 28, marginBottom: 8 },
  accountTypeTitle: { fontSize: 14, fontWeight: '700', color: '#374151', textAlign: 'center', marginBottom: 4 },
  accountTypeTitleActive: { color: '#16A34A' },
  accountTypeHint: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 15 },
  accountTypeHintActive: { color: '#16A34A' },

  form: { marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    padding: 14, fontSize: 16, color: '#111827', marginBottom: 12, backgroundColor: '#F9FAFB',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: '#F9FAFB' },
  chipActive: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  chipText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  button: { backgroundColor: '#16A34A', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 12, marginBottom: 20 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  linkButton: { alignItems: 'center', marginTop: 12, marginBottom: 32 },
  linkText: { color: '#6B7280', fontSize: 14 },
  linkBold: { color: '#16A34A', fontWeight: '700' },
});
