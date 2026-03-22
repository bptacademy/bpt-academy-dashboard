import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Program } from '../../types';

export default function UploadVideoScreen({ navigation }: any) {
  const { profile } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    drill_type: '',
    skill_focus: '',
    program_id: '',
  });
  const [videoFile, setVideoFile] = useState<{ uri: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.from('programs').select('id, title').eq('is_active', true).then(({ data }) => {
      if (data) setPrograms(data as Program[]);
    });
  }, []);

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your media library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const name = asset.uri.split('/').pop() ?? 'video.mp4';
      setVideoFile({ uri: asset.uri, name });
    }
  };

  const handleUpload = async () => {
    if (!form.title) { Alert.alert('Error', 'Please add a title'); return; }
    if (!videoFile) { Alert.alert('Error', 'Please select a video file'); return; }

    setUploading(true);

    try {
      // Upload to Supabase Storage
      const fileExt = videoFile.name.split('.').pop() ?? 'mp4';
      const filePath = `videos/${Date.now()}.${fileExt}`;

      const response = await fetch(videoFile.uri);
      const blob = await response.blob();

      const { error: storageError } = await supabase.storage
        .from('training-videos')
        .upload(filePath, blob, { contentType: `video/${fileExt}` });

      if (storageError) throw storageError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('training-videos')
        .getPublicUrl(filePath);

      // Save metadata to DB
      const { error: dbError } = await supabase.from('videos').insert({
        title: form.title,
        description: form.description || null,
        drill_type: form.drill_type || null,
        skill_focus: form.skill_focus || null,
        program_id: form.program_id || null,
        uploaded_by: profile!.id,
        mux_playback_id: filePath, // using storage path as playback ref
        is_published: true,
      });

      if (dbError) throw dbError;

      Alert.alert('Uploaded! 🎬', 'Video is now live in the training library.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Upload failed', err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.title}>Upload Video</Text>
          <Text style={styles.subtitle}>Add a training clip to the library</Text>
        </View>

        {/* Video picker */}
        <TouchableOpacity style={styles.videoPicker} onPress={pickVideo}>
          {videoFile ? (
            <View style={styles.videoSelected}>
              <Text style={styles.videoIcon}>🎬</Text>
              <Text style={styles.videoName} numberOfLines={1}>{videoFile.name}</Text>
              <Text style={styles.videoChange}>Tap to change</Text>
            </View>
          ) : (
            <View style={styles.videoEmpty}>
              <Text style={styles.videoIcon}>📁</Text>
              <Text style={styles.videoPickerText}>Select video from library</Text>
              <Text style={styles.videoPickerSub}>MP4, MOV supported</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.form}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={form.title}
            onChangeText={(v) => setForm({ ...form, title: v })}
            placeholder="e.g. Forehand technique drill"
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={form.description}
            onChangeText={(v) => setForm({ ...form, description: v })}
            placeholder="What does this drill focus on?"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Drill Type</Text>
          <TextInput
            style={styles.input}
            value={form.drill_type}
            onChangeText={(v) => setForm({ ...form, drill_type: v })}
            placeholder="e.g. Warm-up, Rally, Footwork"
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.label}>Skill Focus</Text>
          <TextInput
            style={styles.input}
            value={form.skill_focus}
            onChangeText={(v) => setForm({ ...form, skill_focus: v })}
            placeholder="e.g. Forehand, Backhand, Serve, Volley"
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.label}>Program (optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.programScroll} contentContainerStyle={styles.programScrollContent}>
            <TouchableOpacity
              style={[styles.programChip, form.program_id === '' && styles.programChipActive]}
              onPress={() => setForm({ ...form, program_id: '' })}
            >
              <Text style={[styles.programChipText, form.program_id === '' && styles.programChipTextActive]}>None</Text>
            </TouchableOpacity>
            {programs.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.programChip, form.program_id === p.id && styles.programChipActive]}
                onPress={() => setForm({ ...form, program_id: p.id })}
              >
                <Text style={[styles.programChipText, form.program_id === p.id && styles.programChipTextActive]} numberOfLines={1}>
                  {p.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.uploadBtn, (uploading || !videoFile) && styles.uploadBtnDisabled]}
            onPress={handleUpload}
            disabled={uploading || !videoFile}
          >
            {uploading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.uploadBtnText}>🎬 Upload Video</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  inner: { padding: 24 },
  header: { marginTop: 20, marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  videoPicker: {
    borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed',
    borderRadius: 14, marginBottom: 24, overflow: 'hidden',
  },
  videoEmpty: { alignItems: 'center', padding: 32 },
  videoSelected: { alignItems: 'center', padding: 24, backgroundColor: '#F0FDF4' },
  videoIcon: { fontSize: 40, marginBottom: 8 },
  videoPickerText: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 4 },
  videoPickerSub: { fontSize: 13, color: '#9CA3AF' },
  videoName: { fontSize: 14, fontWeight: '600', color: '#16A34A', marginBottom: 4, maxWidth: 260 },
  videoChange: { fontSize: 13, color: '#6B7280' },
  form: {},
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    padding: 14, fontSize: 16, color: '#111827', marginBottom: 18, backgroundColor: '#F9FAFB',
  },
  textarea: { height: 90, textAlignVertical: 'top' },
  programScroll: { marginBottom: 24 },
  programScrollContent: { gap: 8, paddingRight: 8 },
  programChip: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#F9FAFB', maxWidth: 160 },
  programChipActive: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  programChipText: { fontSize: 13, color: '#374151' },
  programChipTextActive: { color: '#FFFFFF', fontWeight: '600' },
  uploadBtn: { backgroundColor: '#16A34A', borderRadius: 12, padding: 18, alignItems: 'center', marginBottom: 32 },
  uploadBtnDisabled: { opacity: 0.5 },
  uploadBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
