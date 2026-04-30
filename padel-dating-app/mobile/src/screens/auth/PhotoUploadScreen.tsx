import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  Alert, ActivityIndicator, Image, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const MAX_PHOTOS = 3;

export default function PhotoUploadScreen({ route, navigation }: any) {
  const { city, looking_for, visible_to, bio } = route.params ?? {};
  const insets = useSafeAreaInsets();
  const { session, refreshUser } = useAuth();
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const pickPhoto = async () => {
    if (photos.length >= MAX_PHOTOS) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
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

      // Save user profile to DB
      const { error: dbError } = await supabase.from('users').upsert({
        auth_id: userId,
        email: session?.user?.email,
        full_name: session?.user?.user_metadata?.full_name ?? null,
        city: city ?? null,
        looking_for: looking_for ?? null,
        visible_to: visible_to ?? 'everyone',
        bio: bio || null,
        profile_complete: true,
        last_active_at: new Date().toISOString(),
      }, { onConflict: 'auth_id' });

      if (dbError) throw dbError;

      await refreshUser();
      setSaving(false);
      navigation.replace('OnboardingComplete');
    } catch (err: any) {
      setSaving(false);
      Alert.alert('Error', err?.message ?? 'Could not save your profile. Please try again.');
    }
  };

  return (
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
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={styles.finishBtnText}>Finish setup →</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B2A', paddingHorizontal: 24 },
  header: { paddingTop: 24, marginBottom: 28 },
  title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#4A6080', lineHeight: 22 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  photoSlot: { position: 'relative', width: '47%', aspectRatio: 4 / 5 },
  photo: { width: '100%', height: '100%', borderRadius: 16 },
  removeBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  removeBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  addSlot: {
    width: '47%', aspectRatio: 4 / 5,
    backgroundColor: '#111E2E', borderRadius: 16,
    borderWidth: 2, borderColor: '#1A2C42', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  addIcon: { fontSize: 32, color: '#2A3C52' },
  addLabel: { fontSize: 13, color: '#2A3C52', fontWeight: '600' },
  tipsBox: {
    backgroundColor: '#111E2E', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#1A2C42', marginBottom: 100, gap: 6,
  },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: '#4A6080', marginBottom: 6 },
  tipText: { fontSize: 13, color: '#2A3C52', lineHeight: 20 },
  bottom: { paddingBottom: 12 },
  finishBtn: {
    backgroundColor: '#E63F6B', borderRadius: 16, padding: 18, alignItems: 'center',
    shadowColor: '#E63F6B', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  finishBtnDisabled: { opacity: 0.4 },
  finishBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
