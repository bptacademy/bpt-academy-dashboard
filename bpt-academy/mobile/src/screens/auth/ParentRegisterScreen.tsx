import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, ScrollView,
  Image, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../lib/supabase';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DIVISION_COLORS } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const LOGO_WIDTH = Math.min(SCREEN_WIDTH - 48, 280);
const LOGO_HEIGHT = LOGO_WIDTH * 0.55;

type Props = { navigation: NativeStackNavigationProp<any> };

type JuniorDivision = 'junior_9_11' | 'junior_12_15';

interface ChildForm {
  fullName: string;
  dateOfBirth: Date | null;
  division: JuniorDivision;
  childEmail: string;
  childPassword: string;
}

const JUNIOR_DIVISIONS: { value: JuniorDivision; label: string }[] = [
  { value: 'junior_9_11',  label: 'Junior 9–11' },
  { value: 'junior_12_15', label: 'Junior 12–15' },
];

function calcAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function makeEmptyChild(): ChildForm {
  return { fullName: '', dateOfBirth: null, division: 'junior_9_11', childEmail: '', childPassword: '' };
}

export default function ParentRegisterScreen({ navigation }: Props) {
  // Parent fields
  const [parentName, setParentName]         = useState('');
  const [parentEmail, setParentEmail]       = useState('');
  const [parentPhone, setParentPhone]       = useState('');
  const [parentPassword, setParentPassword] = useState('');

  // Children
  const [children, setChildren]       = useState<ChildForm[]>([makeEmptyChild()]);
  const [showDatePicker, setShowDatePicker] = useState<number | null>(null);
  const [loading, setLoading]         = useState(false);

  const updateChild = (idx: number, field: keyof ChildForm, value: any) => {
    setChildren((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === 'dateOfBirth' && value instanceof Date) {
        const age = calcAge(value);
        next[idx].division = age >= 12 ? 'junior_12_15' : 'junior_9_11';
      }
      return next;
    });
  };

  const addChild = () => {
    if (children.length >= 3) {
      Alert.alert('Maximum reached', 'You can register up to 3 children.');
      return;
    }
    setChildren((prev) => [...prev, makeEmptyChild()]);
  };

  const removeChild = (idx: number) => {
    if (children.length === 1) return;
    setChildren((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleRegister = async () => {
    if (!parentName || !parentEmail || !parentPassword) {
      Alert.alert('Missing fields', 'Please fill in all parent details.');
      return;
    }
    for (let i = 0; i < children.length; i++) {
      if (!children[i].fullName || !children[i].dateOfBirth) {
        Alert.alert('Missing fields', `Please fill in all fields for child ${i + 1}.`);
        return;
      }
    }

    setLoading(true);
    try {
      // 1. Create parent auth user
      const { data: parentAuth, error: parentAuthError } = await supabase.auth.signUp({
        email: parentEmail,
        password: parentPassword,
        options: { data: { full_name: parentName, role: 'parent' } },
      });
      if (parentAuthError || !parentAuth.user) {
        throw new Error(parentAuthError?.message ?? 'Failed to create parent account');
      }
      const parentId = parentAuth.user.id;

      // 2. Upsert parent profile
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: parentId,
        full_name: parentName,
        phone: parentPhone,
        role: 'parent',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (profileError) throw new Error(profileError.message);

      // 3. Register each child
      for (const child of children) {
        const dobStr = child.dateOfBirth!.toISOString().split('T')[0];
        const age = calcAge(child.dateOfBirth!);
        const hasChildLogin = age >= 12 && !!child.childEmail && !!child.childPassword;

        let childAuthId: string | null = null;
        if (hasChildLogin) {
          const { data: childAuth, error: childAuthError } = await supabase.auth.signUp({
            email: child.childEmail,
            password: child.childPassword,
            options: { data: { full_name: child.fullName, role: 'student', is_junior: true } },
          });
          if (childAuthError || !childAuth.user) {
            throw new Error(`Failed to create child login: ${childAuthError?.message}`);
          }
          childAuthId = childAuth.user.id;
        }

        // Use auth ID as profile ID if available, otherwise generate one client-side
        const childProfileId = childAuthId ?? generateUUID();

        const { data: childProfile, error: childProfileError } = await supabase
          .from('profiles')
          .upsert({
            id: childProfileId,
            full_name: child.fullName,
            role: 'student',
            division: child.division,
            date_of_birth: dobStr,
            is_junior: true,
            child_email: hasChildLogin ? child.childEmail : null,
            child_auth_id: childAuthId,
            parent_name: parentName,
            parent_email: parentEmail,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (childProfileError || !childProfile) {
          throw new Error(`Failed to create profile for ${child.fullName}: ${childProfileError?.message}`);
        }

        // 4. Link parent_access
        const { error: accessError } = await supabase
          .from('parent_access')
          .insert({ parent_id: parentId, student_id: childProfile.id });
        if (accessError) throw new Error(`Failed to link parent to child: ${accessError.message}`);
      }

      Alert.alert(
        'Account created! 🎉',
        'Check your email to confirm your account, then log in.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }],
      );
    } catch (err: any) {
      Alert.alert('Registration failed', err.message ?? 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={styles.header}>
            <Image
              source={require('../../../assets/logo.png')}
              style={[styles.logo, { width: LOGO_WIDTH, height: LOGO_HEIGHT }]}
              resizeMode="contain"
            />
            <Text style={styles.title}>Parent / Guardian Registration</Text>
            <Text style={styles.subtitle}>Register your child for BPT Academy</Text>
          </View>

          {/* Parent section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>👤</Text>
              <Text style={styles.sectionTitle}>Your Details</Text>
            </View>

            <Text style={styles.label}>Full Name *</Text>
            <TextInput style={styles.input} placeholder="Your full name" placeholderTextColor="#9CA3AF"
              value={parentName} onChangeText={setParentName} />

            <Text style={styles.label}>Email *</Text>
            <TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor="#9CA3AF"
              value={parentEmail} onChangeText={setParentEmail} autoCapitalize="none" keyboardType="email-address" />

            <Text style={styles.label}>Phone</Text>
            <TextInput style={styles.input} placeholder="+44 7700 000000" placeholderTextColor="#9CA3AF"
              value={parentPhone} onChangeText={setParentPhone} keyboardType="phone-pad" />

            <Text style={styles.label}>Password *</Text>
            <TextInput style={styles.input} placeholder="Min. 6 characters" placeholderTextColor="#9CA3AF"
              value={parentPassword} onChangeText={setParentPassword} secureTextEntry />
          </View>

          {/* Child sections */}
          {children.map((child, idx) => {
            const age = child.dateOfBirth ? calcAge(child.dateOfBirth) : null;
            const showChildLogin = age !== null && age >= 12;

            return (
              <View key={idx} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>🎾</Text>
                  <Text style={styles.sectionTitle}>
                    {children.length > 1 ? `Child ${idx + 1}` : 'Child Details'}
                  </Text>
                  {children.length > 1 && (
                    <TouchableOpacity style={styles.removeBtn} onPress={() => removeChild(idx)}>
                      <Text style={styles.removeBtnText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.label}>Child's Full Name *</Text>
                <TextInput style={styles.input} placeholder="Child's full name" placeholderTextColor="#9CA3AF"
                  value={child.fullName} onChangeText={(v) => updateChild(idx, 'fullName', v)} />

                <Text style={styles.label}>Date of Birth *</Text>
                <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(idx)}>
                  <Text style={[styles.dateText, !child.dateOfBirth && styles.placeholderText]}>
                    {child.dateOfBirth
                      ? child.dateOfBirth.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
                      : 'Select date of birth'}
                  </Text>
                  <Text style={styles.dateIcon}>📅</Text>
                </TouchableOpacity>

                {showDatePicker === idx && (
                  <DateTimePicker
                    value={child.dateOfBirth ?? new Date(2015, 0, 1)}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    maximumDate={new Date()}
                    minimumDate={new Date(2000, 0, 1)}
                    onChange={(_, date) => {
                      setShowDatePicker(null);
                      if (date) updateChild(idx, 'dateOfBirth', date);
                    }}
                  />
                )}

                {age !== null && (
                  <Text style={styles.ageHint}>Age: {age} years old</Text>
                )}

                <Text style={styles.label}>Division</Text>
                <View style={styles.chipRow}>
                  {JUNIOR_DIVISIONS.map((d) => {
                    const selected = child.division === d.value;
                    const color = DIVISION_COLORS[d.value];
                    return (
                      <TouchableOpacity
                        key={d.value}
                        style={[styles.chip, selected && { backgroundColor: color, borderColor: color }]}
                        onPress={() => updateChild(idx, 'division', d.value)}
                      >
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                          {d.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {showChildLogin && (
                  <View style={styles.childLoginSection}>
                    <Text style={styles.childLoginNote}>
                      ℹ️ Since your child is 12+, you can set up a login so they can also access their own profile.
                    </Text>
                    <Text style={styles.label}>Child's Email (optional)</Text>
                    <TextInput style={styles.input} placeholder="child@example.com" placeholderTextColor="#9CA3AF"
                      value={child.childEmail} onChangeText={(v) => updateChild(idx, 'childEmail', v)}
                      autoCapitalize="none" keyboardType="email-address" />
                    {child.childEmail ? (
                      <>
                        <Text style={styles.label}>Child's Password</Text>
                        <TextInput style={styles.input} placeholder="Min. 6 characters" placeholderTextColor="#9CA3AF"
                          value={child.childPassword} onChangeText={(v) => updateChild(idx, 'childPassword', v)}
                          secureTextEntry />
                      </>
                    ) : null}
                  </View>
                )}
              </View>
            );
          })}

          {children.length < 3 && (
            <TouchableOpacity style={styles.addChildBtn} onPress={addChild}>
              <Text style={styles.addChildBtnText}>+ Add Another Child</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.submitBtnText}>
              {loading ? 'Creating accounts...' : 'Create Parent Account'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
            <Text style={styles.backLinkText}>
              Already have an account? <Text style={styles.backLinkBold}>Sign in</Text>
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Simple UUID generator for environments without crypto.randomUUID
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  inner: { flexGrow: 1, padding: 24 },
  header: { alignItems: 'center', marginBottom: 24, marginTop: 8 },
  logo: { marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', color: '#1a2744', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4, textAlign: 'center' },

  section: {
    backgroundColor: '#F9FAFB', borderRadius: 14, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sectionIcon: { fontSize: 18, marginRight: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a2744', flex: 1 },
  removeBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#FEE2E2', borderRadius: 8 },
  removeBtnText: { fontSize: 13, color: '#DC2626', fontWeight: '600' },

  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 13,
    fontSize: 15, color: '#111827', marginBottom: 12, backgroundColor: '#FFFFFF',
  },

  dateInput: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 13, marginBottom: 8,
    backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dateText: { fontSize: 15, color: '#111827' },
  placeholderText: { color: '#9CA3AF' },
  dateIcon: { fontSize: 16 },
  ageHint: { fontSize: 13, color: '#16A34A', fontWeight: '600', marginBottom: 12 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 9, backgroundColor: '#FFFFFF',
  },
  chipText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  chipTextSelected: { color: '#FFFFFF', fontWeight: '700' },

  childLoginSection: {
    backgroundColor: '#ECFDF5', borderRadius: 10, padding: 12, marginTop: 4,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  childLoginNote: { fontSize: 13, color: '#166534', marginBottom: 10, lineHeight: 19 },

  addChildBtn: {
    borderWidth: 2, borderColor: '#16A34A', borderStyle: 'dashed',
    borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 16,
  },
  addChildBtnText: { fontSize: 15, color: '#16A34A', fontWeight: '700' },

  submitBtn: { backgroundColor: '#16A34A', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  backLink: { alignItems: 'center', marginTop: 8 },
  backLinkText: { color: '#6B7280', fontSize: 14 },
  backLinkBold: { color: '#16A34A', fontWeight: '700' },
});
