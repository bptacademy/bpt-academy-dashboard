import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  Alert, ActivityIndicator, Image, ScrollView,
  ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, fonts } from '../../lib/theme';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { uploadPhotos } from '../../lib/uploadPhoto';
const _BG = require('../../../assets/volpair-bg-v2.png');

const MAX_PHOTOS = 3;

export default function PhotoUploadScreen({ route, navigation }: any) {
  const { city, looking_for, visible_to, bio, first_name, last_name, date_of_birth } = route.params ?? {};
  const insets = useSafeAreaInsets();
  const { session, refreshUser } = useAuth();
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const pickPhoto = async () => {
    if (photos.length >= MAX_PHOTOS) return;
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
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleFinish = async () => {
    if (photos.length === 0) {
      Alert.alert('Add a photo', 'You need at least one photo to continue.');
      return;
    }

    setSaving(true);
    try {
      const userId = session?.user?.id;
      if (!userId) throw new Error('Not logged in');

      // Upload all photos to Supabase Storage
      setUploadProgress('Uploading photos…');
      const photoUrls = await uploadPhotos(photos, userId);

      // Resolve full_name: prefer params, fall back to auth metadata
      const paramName = [first_name, last_name].filter(Boolean).join(' ') || null;
      const metaName = (() => {
        const meta = session?.user?.user_metadata ?? {};
        if (meta.full_name) return meta.full_name;
        const first = meta.first_name ?? '';
        const last = meta.last_name ?? '';
        const combined = [first.trim(), last.trim()].filter(Boolean).join(' ');
        return combined || null;
      })();
      const fullName = paramName || metaName;

      // Save profile to DB including photo URLs
      setUploadProgress('Saving profile…');
      const { error: dbError } = await supabase.from('users').upsert({
        auth_id: userId,
        email: session?.user?.email,
        full_name: fullName,
        date_of_birth: date_of_birth ?? null,
        city: city ?? null,
        looking_for: looking_for ?? null,
        visible_to: visible_to ?? 'everyone',
        bio: bio || null,
        photos: photoUrls,
        profile_complete: true,
        last_active_at: new Date().toISOString(),
      }, { onConflict: 'auth_id' });

      if (dbError) throw dbError;

      await refreshUser();
      navigation.replace('PermissionNotifications');
    } catch (err: any) {
      setSaving(false);
      setUploadProgress('');
      Alert.alert('Error', err?.message ?? 'Could not save your profile. Please try again.');
    }
  };

  return (
      <ImageBackground source={_BG} style={{ flex: 1 }} resizeMode="cover">
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1B2A" />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>📸 Add your photos</Text>
          <Text style={styles.subtitle}>
            At least one photo is required. Add up to {MAX_PHOTOS}.
          </Text>
        </View>

        <View style={styles.photoGrid}>
          {photos.map((uri, i) => (
            <View key={i} style={styles.photoSlot}>
              <Image source={{ uri }} style={styles.photo} />
              {i === 0 && (
                <View style={styles.mainBadge}>
                  <Text style={styles.mainBadgeText}>Main</Text>
                </View>
              )}
              <TouchableOpacity style={styles.removeBtn} onPress={() => removePhoto(i)}>
                <Text style={styles.removeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          {photos.length < MAX_PHOTOS && (
            <TouchableOpacity style={styles.addSlot} onPress={pickPhoto} activeOpacity={0.7}>
              <Text style={styles.addIcon}>+</Text>
              <Text style={styles.addLabel}>Add photo</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tipsBox}>
          <Text style={styles.tipsTitle}>📷 Photo tips</Text>
          <Text style={styles.tipText}>• Show your face clearly in the first photo</Text>
          <Text style={styles.tipText}>• Action shots on court work really well</Text>
          <Text style={styles.tipText}>• Natural lighting always beats flash</Text>
        </View>
      </ScrollView>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={[styles.finishBtn, (saving || photos.length === 0) && styles.finishBtnDisabled]}
          onPress={handleFinish}
          disabled={saving || photos.length === 0}
        >
          {saving
            ? (
              <View style={styles.savingRow}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.finishBtnText}>{uploadProgress || 'Saving…'}</Text>
              </View>
            )
            : <Text style={styles.finishBtnText}>Finish setup →</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', paddingHorizontal: 24 },
  header: { paddingTop: 24, marginBottom: 28 },
  title: { fontSize: 28, fontFamily: fonts.headlineBold, color: theme.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 16.1, color: theme.textMuted, lineHeight: 22, fontFamily: fonts.bodyLight },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  photoSlot: { position: 'relative', width: '47%', aspectRatio: 4 / 5 },
  photo: { width: '100%', height: '100%', borderRadius: 16 },
  mainBadge: {
    position: 'absolute', bottom: 8, left: 8,
    backgroundColor: theme.primary, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  mainBadgeText: { color: '#05020E', fontSize: 10, fontFamily: fonts.headlineBold },
  removeBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  removeBtnText: { color: theme.textPrimary, fontSize: 13.9, fontFamily: fonts.bodyBold },
  addSlot: {
    width: '47%', aspectRatio: 4 / 5,
    backgroundColor: theme.bgCard, borderRadius: 16,
    borderWidth: 2, borderColor: theme.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  addIcon: { fontSize: 32, color: theme.textDim },
  addLabel: { fontSize: 13.9, color: theme.textDim, fontFamily: fonts.bodyBold },
  tipsBox: {
    backgroundColor: theme.bgCard, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: theme.border, marginBottom: 100, gap: 6,
  },
  tipsTitle: { fontSize: 13.9, fontFamily: fonts.bodyBold, color: theme.textMuted, marginBottom: 6 },
  tipText: { fontSize: 13.9, color: theme.textDim, lineHeight: 20, fontFamily: fonts.bodyLight },
  bottom: { paddingBottom: 12 },
  finishBtn: {
    backgroundColor: theme.primary, borderRadius: 16, padding: 18, alignItems: 'center',
    shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  finishBtnDisabled: { opacity: 0.4 },
  finishBtnText: { color: theme.textPrimary, fontSize: 17, fontFamily: fonts.headlineBold },
  savingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
