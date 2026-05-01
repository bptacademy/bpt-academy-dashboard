import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView, Alert, ActivityIndicator, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { theme } from '../../lib/theme';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY!;

const INTENT_OPTIONS: { id: 'date' | 'partner' | 'both' | 'exploring'; label: string }[] = [
  { id: 'date', label: '💘 A date' },
  { id: 'partner', label: '🎾 A doubles partner' },
  { id: 'both', label: '✨ Both' },
  { id: 'exploring', label: '👀 Just exploring' },
];

const VISIBILITY_OPTIONS: { id: 'everyone' | 'women' | 'men' | 'no_preference'; label: string }[] = [
  { id: 'everyone', label: '🌍 Everyone' },
  { id: 'women', label: '👩 Women only' },
  { id: 'men', label: '👨 Men only' },
  { id: 'no_preference', label: '🤝 No preference' },
];

const MAX_PHOTOS = 3;
const MAX_BIO = 120;

export default function EditProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const [bio, setBio] = useState(user?.bio ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [lookingFor, setLookingFor] = useState<'date' | 'partner' | 'both' | 'exploring'>(
    user?.looking_for ?? 'exploring'
  );
  const [visibleTo, setVisibleTo] = useState<'everyone' | 'women' | 'men' | 'no_preference'>(
    user?.visible_to ?? 'everyone'
  );
  const [photos, setPhotos] = useState<string[]>(user?.photos ?? []);
  const [saving, setSaving] = useState(false);

  const pickPhoto = async () => {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert('Maximum photos', `You can upload up to ${MAX_PHOTOS} photos.`);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotos(prev => [...prev, result.assets[0].uri]);
    }
  };

  const removePhoto = (index: number) => {
    Alert.alert('Remove photo?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setPhotos(prev => prev.filter((_, i) => i !== index)) },
    ]);
  };

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
        .eq('id', user?.id ?? '');

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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {/* Photos */}
        <Text style={styles.fieldLabel}>📸 Photos ({photos.length}/{MAX_PHOTOS})</Text>
        <Text style={styles.fieldHint}>Your first photo is your main profile photo.</Text>
        <View style={styles.photoGrid}>
          {photos.map((uri, i) => (
            <TouchableOpacity key={i} style={styles.photoSlot} onPress={() => removePhoto(i)} activeOpacity={0.8}>
              <Image source={{ uri }} style={styles.photo} />
              <View style={styles.removeOverlay}>
                <Text style={styles.removeIcon}>✕</Text>
              </View>
              {i === 0 && (
                <View style={styles.mainBadge}>
                  <Text style={styles.mainBadgeText}>Main</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
          {photos.length < MAX_PHOTOS && (
            <TouchableOpacity style={styles.addSlot} onPress={pickPhoto} activeOpacity={0.7}>
              <Text style={styles.addIcon}>+</Text>
              <Text style={styles.addLabel}>Add photo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* City — Google Places */}
        <Text style={styles.fieldLabel}>📍 City</Text>
        <GooglePlacesAutocomplete
          placeholder={city || 'Search your city…'}
          fetchDetails
          onPress={(data, details) => {
            const comp = details?.address_components?.find((c: any) =>
              c.types.includes('locality') || c.types.includes('postal_town')
            );
            setCity(comp?.long_name ?? data.structured_formatting?.main_text ?? data.description);
          }}
          query={{ key: GOOGLE_KEY, language: 'en', types: '(cities)' }}
          styles={{
            container: { flex: 0, marginBottom: 4 },
            textInput: {
              backgroundColor: theme.bgCard, color: theme.textPrimary,
              fontSize: 15, borderRadius: 14, borderWidth: 1,
              borderColor: theme.border, paddingHorizontal: 16, height: 50,
            },
            textInputContainer: { backgroundColor: 'transparent' },
            listView: {
              backgroundColor: theme.bgCard, borderRadius: 14,
              borderWidth: 1, borderColor: theme.border, marginTop: 4,
            },
            row: {
              backgroundColor: theme.bgCard, paddingVertical: 13,
              paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: theme.border,
            },
            description: { color: theme.textPrimary, fontSize: 14 },
            poweredContainer: { display: 'none' },
          }}
          enablePoweredByContainer={false}
          textInputProps={{
            placeholderTextColor: theme.textDim,
            value: city,
            onChangeText: setCity,
          }}
          keyboardShouldPersistTaps="handled"
        />

        {/* Bio */}
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

        {/* Intent */}
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

        {/* Visibility */}
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
  fieldLabel: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 6, marginTop: 24 },
  fieldHint: { fontSize: 12, color: theme.textMuted, marginBottom: 12 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoSlot: { width: '30%', aspectRatio: 4 / 5, position: 'relative' },
  photo: { width: '100%', height: '100%', borderRadius: 14 },
  removeOverlay: {
    position: 'absolute', top: 6, right: 6,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center',
  },
  removeIcon: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  mainBadge: {
    position: 'absolute', bottom: 6, left: 6,
    backgroundColor: theme.primary, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  mainBadgeText: { color: theme.bg, fontSize: 10, fontWeight: '800' },
  addSlot: {
    width: '30%', aspectRatio: 4 / 5,
    backgroundColor: theme.bgCard, borderRadius: 14,
    borderWidth: 1.5, borderColor: theme.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  addIcon: { fontSize: 26, color: theme.textDim },
  addLabel: { fontSize: 11, color: theme.textDim, fontWeight: '600' },
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
