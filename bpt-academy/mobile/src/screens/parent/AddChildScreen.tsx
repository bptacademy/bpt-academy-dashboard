import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, ScrollView, Image, Dimensions} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import BackHeader from '../../components/common/BackHeader';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { DIVISION_COLORS } from '../../types';

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

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export default function AddChildScreen({ navigation }: any) {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  const [child, setChild] = useState<ChildForm>({
    fullName: '',
    dateOfBirth: null,
    division: 'junior_9_11',
    childEmail: '',
    childPassword: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (field: keyof ChildForm, value: any) => {
    setChild((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'dateOfBirth' && value instanceof Date) {
        next.division = calcAge(value) >= 12 ? 'junior_12_15' : 'junior_9_11';
      }
      return next;
    });
  };

  const age = child.dateOfBirth ? calcAge(child.dateOfBirth) : null;
  const showChildLogin = age !== null && age >= 12;

  const handleAdd = async () => {
    if (!profile) return;
    if (!child.fullName || !child.dateOfBirth) {
      Alert.alert('Missing fields', "Please fill in the child's name and date of birth.");
      return;
    }

    setLoading(true);
    try {
      // Check current child count
      const { count } = await supabase
        .from('parent_access')
        .select('*', { count: 'exact', head: true })
        .eq('parent_id', profile.id);

      if ((count ?? 0) >= 3) {
        Alert.alert('Maximum reached', 'You can have a maximum of 3 children linked to your account.');
        setLoading(false);
        return;
      }

      const dobStr = child.dateOfBirth.toISOString().split('T')[0];
      const hasChildLogin = showChildLogin && !!child.childEmail && !!child.childPassword;

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
          parent_name: profile.full_name,
          parent_email: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (childProfileError || !childProfile) {
        throw new Error(`Failed to create profile: ${childProfileError?.message}`);
      }

      const { error: accessError } = await supabase
        .from('parent_access')
        .insert({ parent_id: profile.id, student_id: childProfile.id });

      if (accessError) throw new Error(`Failed to link child: ${accessError.message}`);

      Alert.alert('Child added! 🎉', `${child.fullName} has been added to your account.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />

      <BackHeader title="Add Child" dark />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>🎾</Text>
              <Text style={styles.sectionTitle}>Child Details</Text>
            </View>

            <Text style={styles.label}>Full Name *</Text>
            <TextInput style={styles.input} placeholder="Child's full name" placeholderTextColor="#9CA3AF"
              value={child.fullName} onChangeText={(v) => update('fullName', v)} />

            <Text style={styles.label}>Date of Birth *</Text>
            <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
              <Text style={[styles.dateText, !child.dateOfBirth && styles.placeholderText]}>
                {child.dateOfBirth
                  ? child.dateOfBirth.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
                  : 'Select date of birth'}
              </Text>
              <Text style={styles.dateIcon}>📅</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={child.dateOfBirth ?? new Date(2015, 0, 1)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                minimumDate={new Date(2000, 0, 1)}
                onChange={(_, date) => {
                  setShowDatePicker(false);
                  if (date) update('dateOfBirth', date);
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
                    onPress={() => update('division', d.value)}
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
                  ℹ️ Since your child is 12+, you can set up a login so they can also access their profile.
                </Text>
                <Text style={styles.label}>Child's Email (optional)</Text>
                <TextInput style={styles.input} placeholder="child@example.com" placeholderTextColor="#9CA3AF"
                  value={child.childEmail} onChangeText={(v) => update('childEmail', v)}
                  autoCapitalize="none" keyboardType="email-address" />
                {child.childEmail ? (
                  <>
                    <Text style={styles.label}>Child's Password</Text>
                    <TextInput style={styles.input} placeholder="Min. 6 characters" placeholderTextColor="#9CA3AF"
                      value={child.childPassword} onChangeText={(v) => update('childPassword', v)}
                      secureTextEntry />
                  </>
                ) : null}
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleAdd}
            disabled={loading}
          >
            <Text style={styles.submitBtnText}>
              {loading ? 'Adding child...' : 'Add Child to Account'}
            </Text>
          </TouchableOpacity>

          <View style={{ height: insets.bottom + 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  flex: { flex: 1 },
  inner: { padding: 16 },

  section: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sectionIcon: { fontSize: 18, marginRight: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a2744' },

  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 13,
    fontSize: 15, color: '#111827', marginBottom: 12, backgroundColor: '#F9FAFB',
  },

  dateInput: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 13, marginBottom: 8,
    backgroundColor: '#F9FAFB', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dateText: { fontSize: 15, color: '#111827' },
  placeholderText: { color: '#9CA3AF' },
  dateIcon: { fontSize: 16 },
  ageHint: { fontSize: 13, color: '#16A34A', fontWeight: '600', marginBottom: 12 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 9, backgroundColor: '#F9FAFB',
  },
  chipText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  chipTextSelected: { color: '#FFFFFF', fontWeight: '700' },

  childLoginSection: {
    backgroundColor: '#ECFDF5', borderRadius: 10, padding: 12, marginTop: 4,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  childLoginNote: { fontSize: 13, color: '#166534', marginBottom: 10, lineHeight: 19 },

  submitBtn: { backgroundColor: '#16A34A', borderRadius: 12, padding: 16, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
