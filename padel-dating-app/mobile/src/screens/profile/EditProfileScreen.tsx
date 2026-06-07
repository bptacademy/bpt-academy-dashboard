import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView, Alert, ActivityIndicator, Image, Dimensions, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { theme, fonts } from '../../lib/theme';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { uploadPhotos } from '../../lib/uploadPhoto';
import { Club } from '../../types';
import { ScreenBackground } from '../../components/ScreenBackground';

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY!;
const SCREEN_WIDTH = Dimensions.get('window').width;
const SLOT_WIDTH = Math.floor((SCREEN_WIDTH - 40 - 20) / 3);
const SLOT_HEIGHT = Math.floor(SLOT_WIDTH * (5 / 4));

const GENDER_OPTIONS: { id: 'male' | 'female' | 'other'; label: string }[] = [
  { id: 'male', label: '👨 Man' },
  { id: 'female', label: '👩 Woman' },
  { id: 'other', label: '🌈 Other' },
];

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
  const tabBarPadding = useTabBarPadding();
  const { user, session, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | null>(user?.gender ?? null);
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

  // Club search state
  const [clubQuery, setClubQuery] = useState(user?.home_club_name ?? '');
  const [clubResults, setClubResults] = useState<Club[]>([]);
  const [selectedClub, setSelectedClub] = useState<{ id: string; name: string } | null>(
    user?.home_club_id ? { id: user.home_club_id, name: user.home_club_name ?? '' } : null
  );
  const [clubSearching, setClubSearching] = useState(false);
  const [clubDropdownVisible, setClubDropdownVisible] = useState(false);

  const searchClubs = async (query: string) => {
    setClubQuery(query);
    if (query.length < 2) {
      setClubResults([]);
      setClubDropdownVisible(false);
      return;
    }
    setClubSearching(true);
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('id, name, city, country_code')
        .ilike('name', `%${query}%`)
        .limit(8);
      if (!error && data) {
        setClubResults(data as Club[]);
        setClubDropdownVisible(true);
      }
    } finally {
      setClubSearching(false);
    }
  };

  const selectClub = (club: Club) => {
    setSelectedClub({ id: club.id, name: club.name });
    setClubQuery(club.name);
    setClubDropdownVisible(false);
    setClubResults([]);
  };

  const clearClub = () => {
    setSelectedClub(null);
    setClubQuery('');
    setClubResults([]);
    setClubDropdownVisible(false);
  };

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
    if (!fullName.trim()) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }
    setSaving(true);
    try {
      const authUid = session?.user?.id ?? user?.id ?? '';
      const photoUrls = await uploadPhotos(photos, authUid);

      const { error } = await supabase
        .from('users')
        .update({
          full_name: fullName.trim(),
          gender: gender ?? null,
          bio: bio.trim() || null,
          city: city.trim() || null,
          looking_for: lookingFor,
          visible_to: visibleTo,
          photos: photoUrls,
          home_club_id: selectedClub?.id ?? null,
          home_club_name: selectedClub?.name ?? null,
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
    <ScreenBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
      

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
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name */}
        <Text style={styles.fieldLabel}>👤 Your name</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="First and last name"
          placeholderTextColor={theme.textDim}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
        />

        {/* Gender */}
        <Text style={styles.fieldLabel}>⚧️ I am a</Text>
        <View style={styles.genderRow}>
          {GENDER_OPTIONS.map(o => (
            <TouchableOpacity
              key={o.id}
              style={[styles.genderBtn, gender === o.id && styles.genderBtnActive]}
              onPress={() => setGender(o.id)}
              activeOpacity={0.75}
            >
              <Text style={[styles.genderText, gender === o.id && styles.genderTextActive]}>
                {o.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Photos */}
        <View style={{flexDirection:'row',alignItems:'center',gap:6}}><Image source={require('../../../assets/icons/6. Camera.png')} style={{width:24,height:24,tintColor:'#7A9CC0'}} /><Text style={styles.fieldLabel}>Photos ({photos.length}/{MAX_PHOTOS})</Text></View>
        <Text style={styles.fieldHint}>Your first photo is your main profile photo.</Text>
        <View style={styles.photoGrid}>
          {photos.map((uri, i) => (
            <TouchableOpacity key={i} onPress={() => removePhoto(i)} activeOpacity={0.8}>
              <View style={styles.photoSlot}>
                <Image
                  source={{ uri }}
                  style={{ width: SLOT_WIDTH, height: SLOT_HEIGHT, borderRadius: 14 }}
                  resizeMode="cover"
                />
                <View style={styles.removeOverlay}>
                  <Text style={styles.removeIcon}>✕</Text>
                </View>
                {i === 0 && (
                  <View style={styles.mainBadge}>
                    <Text style={styles.mainBadgeText}>Main</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
          {photos.length < MAX_PHOTOS && (
            <TouchableOpacity onPress={pickPhoto} activeOpacity={0.7}>
              <View style={[styles.photoSlot, styles.addSlot]}>
                <Text style={styles.addIcon}>+</Text>
                <Text style={styles.addLabel}>Add photo</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* City */}
        <View style={{flexDirection:'row',alignItems:'center',gap:6}}><Image source={require('../../../assets/icons/3. Location.png')} style={{width:24,height:24,tintColor:'#7A9CC0'}} /><Text style={styles.fieldLabel}>City</Text></View>
        <View style={styles.placesWrapper}>
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
              container: { flex: 0 },
              textInput: {
                backgroundColor: theme.bgCard, color: theme.textPrimary,
                fontSize: 15, borderRadius: 14, borderWidth: 1,
                borderColor: theme.border, paddingHorizontal: 16, height: 50,
                marginBottom: 0,
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
            listViewDisplayed="auto"
          />
        </View>

        {/* Home Club */}
        <Text style={styles.fieldLabel}>🏟️ Home club</Text>
        <Text style={styles.fieldHint}>The padel club where you play most.</Text>

        {selectedClub ? (
          <View style={styles.clubSelected}>
            <Text style={styles.clubSelectedIcon}>🏟️</Text>
            <Text style={styles.clubSelectedName}>{selectedClub.name}</Text>
            <TouchableOpacity onPress={clearClub} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.clubClearBtn}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.clubSearchWrapper}>
            <View style={styles.clubInputRow}>
              <TextInput
                style={styles.clubInput}
                value={clubQuery}
                onChangeText={searchClubs}
                placeholder="Search clubs…"
                placeholderTextColor={theme.textDim}
                autoCorrect={false}
                returnKeyType="search"
              />
              {clubSearching && (
                <ActivityIndicator size="small" color={theme.primary} style={styles.clubSpinner} />
              )}
            </View>

            {clubDropdownVisible && clubResults.length > 0 && (
              <View style={styles.clubDropdown}>
                {clubResults.map((club, idx) => (
                  <TouchableOpacity
                    key={club.id}
                    style={[styles.clubDropdownRow, idx < clubResults.length - 1 && styles.clubDropdownRowBorder]}
                    onPress={() => selectClub(club)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.clubDropdownName}>{club.name}</Text>
                    {(club.city || club.country_code) && (
                      <Text style={styles.clubDropdownCity}>
                        {[club.city, club.country_code].filter(Boolean).join(', ')}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {clubDropdownVisible && clubResults.length === 0 && !clubSearching && clubQuery.length >= 2 && (
              <View style={styles.clubNoResults}>
                <Text style={styles.clubNoResultsText}>No clubs found. It may not be listed yet.</Text>
              </View>
            )}
          </View>
        )}

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
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: theme.bgCard,
  },
  headerTitle: { fontSize: 17, fontFamily: fonts.bodyBold, color: theme.textPrimary },
  cancelText: { fontSize: 16, color: theme.textMuted, fontFamily: fonts.bodyLight },
  saveText: { fontSize: 16, color: theme.primary, fontFamily: fonts.bodyBold },
  scroll: { padding: 20 },
  fieldLabel: { fontSize: 13, fontFamily: fonts.bodyBold, color: theme.textSecondary, marginBottom: 6, marginTop: 24 },
  fieldHint: { fontSize: 12, color: theme.textMuted, marginBottom: 12, fontFamily: fonts.bodyLight },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 14,
    alignItems: 'center', borderWidth: 1.5, borderColor: theme.border,
    backgroundColor: theme.bgCard,
  },
  genderBtnActive: { borderColor: theme.primaryBorder, backgroundColor: theme.primaryDim },
  genderText: { fontSize: 14, color: theme.textMuted, fontFamily: fonts.bodyBold },
  genderTextActive: { color: theme.primary },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoSlot: { width: SLOT_WIDTH, height: SLOT_HEIGHT, position: 'relative', borderRadius: 14, overflow: 'hidden' },
  removeOverlay: {
    position: 'absolute', top: 6, right: 6,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center',
  },
  removeIcon: { color: '#FFFFFF', fontSize: 12, fontFamily: fonts.bodyBold },
  mainBadge: {
    position: 'absolute', bottom: 6, left: 6,
    backgroundColor: theme.primary, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
  },
  mainBadgeText: { color: theme.bg, fontSize: 10, fontFamily: fonts.headlineBold },
  addSlot: {
    backgroundColor: theme.bgCard, borderWidth: 1.5, borderColor: theme.border,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  addIcon: { fontSize: 26, color: theme.textDim },
  addLabel: { fontSize: 11, color: theme.textDim, fontFamily: fonts.bodyBold },
  placesWrapper: { zIndex: 10 },
  input: {
    backgroundColor: theme.bgCard, borderRadius: 14, padding: 16,
    fontSize: 15, color: theme.textPrimary, borderWidth: 1, borderColor: theme.border,
    fontFamily: fonts.bodyLight,
  },
  bioWrapper: { position: 'relative' },
  bioInput: { minHeight: 90, textAlignVertical: 'top' },
  charCount: { position: 'absolute', bottom: 10, right: 14, fontSize: 11, color: theme.textDim, fontFamily: fonts.bodyLight },
  optionGrid: { gap: 8 },
  optionBtn: {
    padding: 14, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bgCard,
  },
  optionBtnActive: { borderColor: theme.primaryBorder, backgroundColor: theme.primaryDim },
  optionText: { fontSize: 15, color: theme.textMuted, fontFamily: fonts.bodyLight },
  optionTextActive: { color: theme.primary, fontFamily: fonts.bodyBold },

  // Club search
  clubSearchWrapper: { zIndex: 5 },
  clubInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.bgCard, borderRadius: 14,
    borderWidth: 1, borderColor: theme.border,
    paddingHorizontal: 16,
  },
  clubInput: {
    flex: 1, height: 50, fontSize: 15, color: theme.textPrimary, fontFamily: fonts.bodyLight,
  },
  clubSpinner: { marginLeft: 8 },
  clubDropdown: {
    backgroundColor: theme.bgCard, borderRadius: 14,
    borderWidth: 1, borderColor: theme.border, marginTop: 4,
    overflow: 'hidden',
  },
  clubDropdownRow: { paddingVertical: 13, paddingHorizontal: 16 },
  clubDropdownRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  clubDropdownName: { fontSize: 14, color: theme.textPrimary, fontFamily: fonts.bodyBold },
  clubDropdownCity: { fontSize: 12, color: theme.textMuted, marginTop: 2, fontFamily: fonts.bodyLight },
  clubNoResults: {
    backgroundColor: theme.bgCard, borderRadius: 14,
    borderWidth: 1, borderColor: theme.border, marginTop: 4,
    padding: 16,
  },
  clubNoResultsText: { fontSize: 13, color: theme.textMuted, fontFamily: fonts.bodyLight },
  clubSelected: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.primaryDim, borderRadius: 14,
    borderWidth: 1.5, borderColor: theme.primaryBorder,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  clubSelectedIcon: { fontSize: 20 },
  clubSelectedName: { flex: 1, fontSize: 15, color: theme.primary, fontFamily: fonts.bodyBold },
  clubClearBtn: { fontSize: 16, color: theme.textMuted, fontFamily: fonts.bodyBold },
});
