import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { theme } from '../../lib/theme';
import OnboardingProgress from '../../components/common/OnboardingProgress';

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY!;

export default function Question1LocationScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const ref = useRef<any>(null);

  const handleSelect = (data: any, details: any) => {
    // Extract city name — prefer locality, fallback to the main description text
    const cityComponent = details?.address_components?.find((c: any) =>
      c.types.includes('locality') || c.types.includes('postal_town')
    );
    const city = cityComponent?.long_name ?? data.structured_formatting?.main_text ?? data.description;
    navigation.navigate('Question2Intent', { city });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

        <View style={styles.inner}>
          <OnboardingProgress total={4} current={1} />
          <Text style={styles.question}>📍 Where are you based?</Text>
          <Text style={styles.subtitle}>{"We'll show you players in your area."}</Text>

          <GooglePlacesAutocomplete
            ref={ref}
            placeholder="Search your city…"
            fetchDetails
            onPress={handleSelect}
            query={{
              key: GOOGLE_KEY,
              language: 'en',
              types: '(cities)',
            }}
            styles={{
              container: { flex: 0 },
              textInput: {
                backgroundColor: theme.bgCard,
                color: theme.textPrimary,
                fontSize: 17,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: theme.border,
                paddingHorizontal: 16,
                height: 52,
              },
              textInputContainer: {
                backgroundColor: 'transparent',
              },
              listView: {
                backgroundColor: theme.bgCard,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.border,
                marginTop: 4,
                overflow: 'hidden',
              },
              row: {
                backgroundColor: theme.bgCard,
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
              },
              description: {
                color: theme.textPrimary,
                fontSize: 15,
              },
              predefinedPlacesDescription: {
                color: theme.primary,
              },
              poweredContainer: {
                backgroundColor: theme.bgDeep,
                borderTopWidth: 1,
                borderTopColor: theme.border,
                paddingVertical: 6,
              },
              powered: {
                opacity: 0.3,
              },
            }}
            enablePoweredByContainer={false}
            textInputProps={{
              placeholderTextColor: theme.textDim,
              autoFocus: true,
            }}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: 24 },
  inner: { flex: 1, paddingTop: 24 },
  question: { fontSize: 26, fontWeight: '800', color: theme.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 15, color: theme.textMuted, marginBottom: 28, lineHeight: 22 },
});
