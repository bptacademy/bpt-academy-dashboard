import { theme } from '../../lib/theme';
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OnboardingProgress from '../../components/common/OnboardingProgress';

const SUGGESTED_CITIES = [
  'London', 'Manchester', 'Birmingham', 'Barcelona', 'Madrid',
  'Stockholm', 'Dubai', 'New York', 'Milan', 'Paris',
];

export default function Question1LocationScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [city, setCity] = useState('');
  const filtered = city.length > 0
    ? SUGGESTED_CITIES.filter(c => c.toLowerCase().startsWith(city.toLowerCase()))
    : [];

  const handleContinue = () => {
    if (!city.trim()) return;
    navigation.navigate('Question2Intent', { city: city.trim() });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1B2A" />

      <View style={styles.inner}>
        <OnboardingProgress total={4} current={1} />

        <Text style={styles.question}>📍 Where are you based?</Text>
        <Text style={styles.subtitle}>We'll show you players in your area.</Text>

        <TextInput
          style={styles.input}
          value={city}
          onChangeText={setCity}
          placeholder="Search your city…"
          placeholderTextColor="#2A3C52"
          autoFocus
          autoCorrect={false}
        />

        {filtered.length > 0 && (
          <ScrollView style={styles.suggestions} keyboardShouldPersistTaps="handled">
            {filtered.map((c) => (
              <TouchableOpacity
                key={c}
                style={styles.suggestionRow}
                onPress={() => setCity(c)}
              >
                <Text style={styles.suggestionText}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={[styles.nextBtn, !city.trim() && styles.nextBtnDisabled]}
          onPress={handleContinue}
          disabled={!city.trim()}
        >
          <Text style={styles.nextBtnText}>Continue →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: 24 },
  inner: { flex: 1, paddingTop: 24 },
  question: { fontSize: 26, fontWeight: '800', color: theme.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 15, color: theme.textMuted, marginBottom: 28, lineHeight: 22 },
  input: {
    backgroundColor: theme.bgCard, borderRadius: 14, padding: 16,
    fontSize: 17, color: theme.textPrimary, borderWidth: 1.5, borderColor: theme.border,
  },
  suggestions: {
    backgroundColor: theme.bgCard, borderRadius: 14, marginTop: 4,
    borderWidth: 1, borderColor: theme.border, maxHeight: 200,
  },
  suggestionRow: { padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border },
  suggestionText: { color: theme.textPrimary, fontSize: 16 },
  bottom: { paddingBottom: 12 },
  nextBtn: {
    backgroundColor: theme.primary, borderRadius: 16, padding: 18, alignItems: 'center',
    shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: theme.textPrimary, fontSize: 17, fontWeight: '700' },
});
