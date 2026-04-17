import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
  ScrollView, Image, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Division, DIVISION_LABELS, DIVISION_COLORS, SkillLevel } from '../../types';

type Props = { navigation: NativeStackNavigationProp<any> };

const DIVISIONS: Division[] = ['amateur', 'semi_pro', 'pro'];
const AMATEUR_LEVELS: { label: string; value: SkillLevel }[] = [
  { label: 'Beginner',     value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced',     value: 'advanced' },
];

export default function RegisterScreen({ navigation }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const LOGO_WIDTH  = Math.min(width - 64, 220);
  const LOGO_HEIGHT = LOGO_WIDTH * 0.55;

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
    <View style={styles.root}>
      {/* Full-screen background */}
      <Image
        source={require('../../../assets/bg.png')}
        style={[styles.bg, { width, height }]}
        resizeMode="cover"
      />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[
            styles.inner,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.header}>
            <Image
              source={require('../../../assets/logo.png')}
              style={{ width: LOGO_WIDTH, height: LOGO_HEIGHT, marginBottom: 8 }}
              resizeMode="contain"
            />
            <Text style={styles.subtitle}>Create your account</Text>
          </View>

          {/* Account type */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>I am registering as a...</Text>
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
                onPress={() => { setAccountType('parent'); navigation.navigate('ParentRegister'); }}
              >
                <Text style={styles.accountTypeIcon}>👨‍👩‍👧‍👦</Text>
                <Text style={[styles.accountTypeTitle, accountType === 'parent' && styles.accountTypeTitleActive]}>Parent / Guardian</Text>
                <Text style={[styles.accountTypeHint, accountType === 'parent' && styles.accountTypeHintActive]}>I'm registering my child</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Student form */}
          {accountType === 'student' && (
            <View style={[styles.card, { marginTop: 12 }]}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput style={styles.input} placeholder="Your full name" placeholderTextColor="rgba(255,255,255,0.35)"
                value={fullName} onChangeText={setFullName} />

              <Text style={styles.label}>Email *</Text>
              <TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor="rgba(255,255,255,0.35)"
                value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} />

              <Text style={styles.label}>Phone</Text>
              <TextInput style={styles.input} placeholder="+44 7700 000000" placeholderTextColor="rgba(255,255,255,0.35)"
                value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

              <Text style={styles.label}>Password *</Text>
              <TextInput style={styles.input} placeholder="Min. 6 characters" placeholderTextColor="rgba(255,255,255,0.35)"
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
                <Text style={styles.buttonText}>{loading ? 'Creating account...' : 'Create Account'}</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>
              Already have an account?{' '}
              <Text style={styles.linkBold}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B1628' },
  bg: { position: 'absolute', top: 0, left: 0 },
  flex: { flex: 1 },
  inner: { flexGrow: 1, paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 24 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.55)', marginTop: 4 },
  card: {
    backgroundColor: 'rgba(17,30,51,0.80)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#F0F6FC', marginBottom: 14, textAlign: 'center' },
  accountTypeRow: { flexDirection: 'row', gap: 12 },
  accountTypeCard: {
    flex: 1, borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14, padding: 14, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  accountTypeCardActive: { borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.15)' },
  accountTypeIcon: { fontSize: 26, marginBottom: 6 },
  accountTypeTitle: { fontSize: 13, fontWeight: '700', color: '#F0F6FC', textAlign: 'center', marginBottom: 4 },
  accountTypeTitleActive: { color: '#3B82F6' },
  accountTypeHint: { fontSize: 11, color: 'rgba(255,255,255,0.40)', textAlign: 'center', lineHeight: 15 },
  accountTypeHintActive: { color: 'rgba(59,130,246,0.80)' },
  label: { fontSize: 14, fontWeight: '600', color: '#F0F6FC', marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#F0F6FC',
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.20)',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  chipActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  chipText: { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  button: { backgroundColor: '#3B82F6', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 12, marginBottom: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  linkButton: { alignItems: 'center', marginTop: 20, marginBottom: 8 },
  linkText: { color: 'rgba(255,255,255,0.50)', fontSize: 14 },
  linkBold: { color: '#3B82F6', fontWeight: '700' },
});
