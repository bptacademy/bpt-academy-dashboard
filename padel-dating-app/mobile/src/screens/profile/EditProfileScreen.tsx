import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../lib/theme';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const INTENT_OPTIONS = [
  { id: 'date', label: '💘 A date' },
  { id: 'partner', label: '🎾 A doubles partner' },
  { id: 'both', label: '✨ Both' },
  { id: 'exploring', label: '👀 Just exploring' },
];

const VISIBILITY_OPTIONS = [
  { id: 'everyone', label: '🌍 Everyone' },
  { id: 'women', label: '👩 Women only' },
  { id: 'men', label: '👨 Men only' },
  { id: 'no_preference', label: '🤝 No preference' },
];

export default function EditProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const [bio, setBio] = useState(user?.bio ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [lookingFor, setLookingFor] = useState(user?.looking_for ?? 'exploring');
  const [visibleTo, setVisibleTo] = useState(user?.visible_to ?? 'everyone');
  const [saving, setSaving] = useState(false);
  const MAX_BIO = 120;

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          bio: bio.trim() || null,
          city: city.trim() || null,
          looking_for: lookingFor,
          visible_to: visibleTo,
        })
        .eq('auth_id', user?.auth_id ?? '');

      if (error) throw error;
      await refreshUser();
      navigation.goBack();
    } catch (err: any) {
      setSaving(false);
      Alert.alert('Error', err?.message ?? 'Could not save changes.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color={theme.primary} size="small" />
            : <Text style={styles.saveText}>Save</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <Text style={styles.fieldLabel}>📍 City</Text>
        <TextInput
          style={styles.input}
          value={city}
          onChangeText={setCity}
          placeholder="e.g. London"
          placeholderTextColor={theme.textDim}
          autoCorrect={false}
        />

        <Text style={styles.fieldLabel}>🗣️ One line about yourself</Text>
        <View style={styles.bioWrapper}>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={t => setBio(t.slice(0, MAX_BIO))}
            placeholder="e.g. Post-match coffee is non-negotiable."
            placeholderTextColor={theme.textDim}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{bio.length}/{MAX_BIO}</Text>
        </View>

        <Text style={styles.fieldLabel}>🎯 What are you looking for?</Text>
        <View style={styles.optionGrid}>
          {INTENT_OPTIONS.map(o => (
            <TouchableOpacity
              key={o.id}
              style={[styles.optionBtn, lookingFor === o.id && styles.optionBtnActive]}
              onPress={() => setLookingFor(o.id)}
            >
              <Text style={[styles.optionText, lookingFor === o.id && styles.optionTextActive]}>
                {o.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>👀 Who can see you?</Text>
        <View style={styles.optionGrid}>
          {VISIBILITY_OPTIONS.map(o => (
            <TouchableOpacity
              key={o.id}
              style={[styles.optionBtn, visibleTo === o.id && styles.optionBtnActive]}
              onPress={() => setVisibleTo(o.id)}
            >
              <Text style={[styles.optionText, visibleTo === o.id && styles.optionTextActive]}>
                {o.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: theme.bgCard,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.textPrimary },
  cancelText: { fontSize: 16, color: theme.textMuted },
  saveText: { fontSize: 16, color: theme.primary, fontWeight: '700' },
  scroll: { padding: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 8, marginTop: 20 },
  input: {
    backgroundColor: theme.bgCard, borderRadius: 14, padding: 16,
    fontSize: 15, color: theme.textPrimary, borderWidth: 1, borderColor: theme.border,
  },
  bioWrapper: { position: 'relative' },
  bioInput: { minHeight: 90, textAlignVertical: 'top' },
  charCount: { position: 'absolute', bottom: 10, right: 14, fontSize: 11, color: theme.textDim },
  optionGrid: { gap: 8 },
  optionBtn: {
    padding: 14, borderRadius: 14, borderWidth: 1, borderColor: theme.border,
    backgroundColor: theme.bgCard,
  },
  optionBtnActive: { borderColor: theme.primaryBorder, backgroundColor: theme.primaryDim },
  optionText: { fontSize: 15, color: theme.textMuted, fontWeight: '500' },
  optionTextActive: { color: theme.primary, fontWeight: '700' },
});
