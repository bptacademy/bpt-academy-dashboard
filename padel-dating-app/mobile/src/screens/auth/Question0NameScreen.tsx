import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, fonts } from '../../lib/theme';
import OnboardingProgress from '../../components/common/OnboardingProgress';
import { ScreenBackground } from '../../components/ScreenBackground';

export default function Question0NameScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const canContinue = firstName.trim().length > 0 && lastName.trim().length > 0;

  const handleContinue = () => {
    if (!canContinue) return;
    navigation.navigate('Question0DOB', {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
    });
  };

  return (
    <ScreenBackground>
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: 'transparent' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        

        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>

        <View style={styles.inner}>
          <OnboardingProgress total={9} current={1} />

          <Text style={styles.question}>What's your name?</Text>
          <Text style={styles.subtitle}>This is how you'll appear to other players.</Text>

          <View style={styles.nameRow}>
            <View style={styles.nameInputWrapper}>
              <TextInput
                style={styles.nameInput}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                placeholderTextColor={theme.textDim}
                autoCapitalize="words"
                autoFocus
                returnKeyType="next"
              />
            </View>
            <View style={styles.nameInputWrapper}>
              <TextInput
                style={styles.nameInput}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                placeholderTextColor={theme.textDim}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleContinue}
              />
            </View>
          </View>
        </View>

        <View style={styles.bottom}>
          <TouchableOpacity
            style={[styles.nextBtn, !canContinue && styles.nextBtnDisabled]}
            onPress={handleContinue}
            disabled={!canContinue}
            activeOpacity={0.85}
          >
            <Text style={styles.nextBtnText}>Continue →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
    </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', paddingHorizontal: 24 },
  backBtn: {
    marginTop: 8, marginBottom: 4,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { color: theme.textPrimary, fontSize: 21.4, fontFamily: fonts.bodyBold },
  inner: { flex: 1, paddingTop: 8 },
  question: { fontSize: 26, fontFamily: fonts.headlineBold, color: theme.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 16.1, color: theme.textMuted, marginBottom: 28, lineHeight: 22, fontFamily: fonts.bodyLight },
  nameRow: { flexDirection: 'row', gap: 12 },
  nameInputWrapper: { flex: 1 },
  nameInput: {
    backgroundColor: theme.bgCard,
    color: theme.textPrimary,
    fontSize: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.bodyLight,
  },
  bottom: { paddingBottom: 12 },
  nextBtn: {
    backgroundColor: theme.primary, borderRadius: 16, padding: 18, alignItems: 'center',
    shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: theme.textPrimary, fontSize: 17, fontFamily: fonts.headlineBold },
});
