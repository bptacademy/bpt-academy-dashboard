import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OnboardingProgress from '../../components/common/OnboardingProgress';

const EXAMPLES = [
  '"Post-match coffee is non-negotiable."',
  '"Net player. Aggressive on court, relaxed off it."',
  '"Looking for someone who takes the sport seriously but doesn\'t take themselves too seriously."',
];

export default function Question4BioScreen({ route, navigation }: any) {
  const { city, looking_for, visible_to } = route.params ?? {};
  const insets = useSafeAreaInsets();
  const [bio, setBio] = useState('');
  const MAX = 120;

  const handleContinue = () => {
    navigation.navigate('PhotoUpload', { city, looking_for, visible_to, bio: bio.trim() });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="light-content" backgroundColor="#0D1B2A" />

        <View style={styles.inner}>
          <OnboardingProgress total={4} current={4} />

          <Text style={styles.question}>🗣️ One line about yourself</Text>
          <Text style={styles.subtitle}>Optional — but the best profiles always have one.</Text>

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={bio}
              onChangeText={(t) => setBio(t.slice(0, MAX))}
              placeholder="e.g. Post-match coffee is non-negotiable."
              placeholderTextColor="#2A3C52"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{bio.length}/{MAX}</Text>
          </View>

          <Text style={styles.examplesTitle}>Need inspiration?</Text>
          {EXAMPLES.map((ex, i) => (
            <TouchableOpacity key={i} onPress={() => setBio(ex.replace(/"/g, ''))}>
              <Text style={styles.example}>{ex}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.bottom}>
          <TouchableOpacity style={styles.nextBtn} onPress={handleContinue} activeOpacity={0.85}>
            <Text style={styles.nextBtnText}>Continue →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleContinue}>
            <Text style={styles.skipLink}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B2A', paddingHorizontal: 24 },
  inner: { flex: 1, paddingTop: 24 },
  question: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#4A6080', marginBottom: 24, lineHeight: 22 },
  inputWrapper: { position: 'relative', marginBottom: 28 },
  input: {
    backgroundColor: '#111E2E', borderRadius: 14, padding: 16,
    fontSize: 16, color: '#FFFFFF', borderWidth: 1.5, borderColor: '#1A2C42',
    minHeight: 100,
  },
  charCount: {
    position: 'absolute', bottom: 10, right: 14,
    fontSize: 11, color: '#2A3C52',
  },
  examplesTitle: { fontSize: 13, fontWeight: '600', color: '#4A6080', marginBottom: 10 },
  example: {
    fontSize: 13, color: '#7A9CC0', fontStyle: 'italic',
    marginBottom: 10, lineHeight: 20,
  },
  bottom: { paddingBottom: 12, gap: 10 },
  nextBtn: {
    backgroundColor: '#E63F6B', borderRadius: 16, padding: 18, alignItems: 'center',
    shadowColor: '#E63F6B', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  nextBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  skipLink: { color: '#2A3C52', fontSize: 14, textAlign: 'center', paddingVertical: 4 },
});
