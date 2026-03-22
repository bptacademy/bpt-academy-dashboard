import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
  Animated, Easing,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Program } from '../../types';

type UploadStage = 'idle' | 'preparing' | 'uploading' | 'saving' | 'done' | 'error';

const STAGES: { key: UploadStage; label: string; icon: string }[] = [
  { key: 'preparing', label: 'Preparing video', icon: '📦' },
  { key: 'uploading', label: 'Uploading to server', icon: '☁️' },
  { key: 'saving',   label: 'Saving details',      icon: '💾' },
  { key: 'done',     label: 'Upload complete!',     icon: '✅' },
];

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
  const [stage, setStage] = useState<UploadStage>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const progressAnim = React.useRef(new Animated.Value(0)).current;

  const animateTo = (toValue: number, duration = 600) =>
    new Promise<void>((resolve) =>
      Animated.timing(progressAnim, { toValue, duration, easing: Easing.out(Easing.ease), useNativeDriver: false }).start(() => resolve())
    );

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
      mediaTypes: 'videos',
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

    setErrorMsg('');
    progressAnim.setValue(0);

    try {
      // Stage 1: Preparing
      setStage('preparing');
      await animateTo(0.15);
      const fileExt = videoFile.name.split('.').pop() ?? 'mp4';
      const filePath = `videos/${Date.now()}.${fileExt}`;

      // Stage 2: Uploading — use FormData for reliable iOS file upload
      setStage('uploading');
      await animateTo(0.25, 300);

      const formData = new FormData();
      formData.append('file', {
        uri: videoFile.uri,
        name: videoFile.name,
        type: `video/${fileExt}`,
      } as any);

      const { data: { session } } = await supabase.auth.getSession();
      const uploadRes = await fetch(
        `https://nobxhhnhakawhbimrate.supabase.co/storage/v1/object/training-videos/${filePath}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': 'sb_publishable_vnFb-ACqDwBiYt4PcKXC5Q_Ty8LRYoR',
            'x-upsert': 'true',
          },
          body: formData,
        }
      );
      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(`Storage error: ${errText}`);
      }
      await animateTo(0.75, 800);

      // Stage 3: Saving
      setStage('saving');
      await animateTo(0.85, 400);
      const { error: dbError } = await supabase.from('videos').insert({
        title: form.title,
        description: form.description || null,
        drill_type: form.drill_type || null,
        skill_focus: form.skill_focus || null,
        program_id: form.program_id || null,
        uploaded_by: profile!.id,
        mux_playback_id: filePath,
        is_published: true,
      });
      if (dbError) throw dbError;

      // Stage 4: Done
      setStage('done');
      await animateTo(1, 400);

      setTimeout(() => navigation.goBack(), 1500);
    } catch (err: any) {
      setStage('error');
      setErrorMsg(err.message);
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

          {/* Upload progress UI */}
          {stage !== 'idle' && stage !== 'error' && (
            <View style={styles.progressContainer}>
              {/* Progress bar */}
              <View style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    stage === 'done' && styles.progressFillDone,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>

              {/* Stage steps */}
              <View style={styles.stages}>
                {STAGES.map((s, i) => {
                  const stageIndex = STAGES.findIndex((x) => x.key === stage);
                  const isDone = i < stageIndex || stage === 'done';
                  const isActive = s.key === stage;
                  return (
                    <View key={s.key} style={styles.stageRow}>
                      <View style={[styles.stageIcon, isDone && styles.stageIconDone, isActive && styles.stageIconActive]}>
                        <Text style={styles.stageIconText}>{isDone ? '✓' : s.icon}</Text>
                      </View>
                      <Text style={[styles.stageLabel, isDone && styles.stageLabelDone, isActive && styles.stageLabelActive]}>
                        {s.label}
                      </Text>
                      {isActive && stage !== 'done' && (
                        <Text style={styles.stagePulse}>•••</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Error state */}
          {stage === 'error' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorIcon}>❌</Text>
              <Text style={styles.errorTitle}>Upload failed</Text>
              <Text style={styles.errorMsg}>{errorMsg}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => setStage('idle')}>
                <Text style={styles.retryBtnText}>Try again</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Upload button — hidden while uploading */}
          {(stage === 'idle' || stage === 'error') && (
            <TouchableOpacity
              style={[styles.uploadBtn, !videoFile && styles.uploadBtnDisabled]}
              onPress={handleUpload}
              disabled={!videoFile}
            >
              <Text style={styles.uploadBtnText}>🎬 Upload Video</Text>
            </TouchableOpacity>
          )}
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

  // Progress UI
  progressContainer: { backgroundColor: '#F9FAFB', borderRadius: 14, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#E5E7EB' },
  progressTrack: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, marginBottom: 20, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#16A34A', borderRadius: 4 },
  progressFillDone: { backgroundColor: '#16A34A' },
  stages: { gap: 14 },
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stageIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#E5E7EB' },
  stageIconActive: { borderColor: '#16A34A', backgroundColor: '#ECFDF5' },
  stageIconDone: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  stageIconText: { fontSize: 14 },
  stageLabel: { fontSize: 14, color: '#9CA3AF', flex: 1 },
  stageLabelActive: { color: '#111827', fontWeight: '600' },
  stageLabelDone: { color: '#16A34A', fontWeight: '500' },
  stagePulse: { fontSize: 14, color: '#16A34A', letterSpacing: 2 },

  // Error UI
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 14, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#FECACA', alignItems: 'center' },
  errorIcon: { fontSize: 32, marginBottom: 8 },
  errorTitle: { fontSize: 16, fontWeight: '700', color: '#DC2626', marginBottom: 4 },
  errorMsg: { fontSize: 13, color: '#991B1B', textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: '#DC2626', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  retryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
