import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PlatformLoginScreen({ route, navigation }: any) {
  const { platform, label } = route.params;
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConnect = () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    // Navigate to syncing — the actual Playtomic API call happens there
    navigation.navigate('SyncingProfile', {
      platform,
      platformEmail: email.trim().toLowerCase(),
      platformPassword: password,
    });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="light-content" backgroundColor="#0D1B2A" />
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.platformBadge}>
              <Text style={styles.platformBadgeText}>🎾 {label}</Text>
            </View>
            <Text style={styles.title}>Connect your account</Text>
            <Text style={styles.subtitle}>
              Enter your {label} credentials so we can import your match history.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.fieldLabel}>{label} email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor="#2A3C52"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.fieldLabel}>{label} password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#2A3C52"
              secureTextEntry
            />
            <View style={styles.securityNote}>
              <Text style={styles.securityIcon}>🔒</Text>
              <Text style={styles.securityText}>
                Used only to import your match data. Never stored in plain text.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.connectBtn, (!email.trim() || !password.trim() || loading) && styles.connectBtnDisabled]}
            onPress={handleConnect}
            disabled={!email.trim() || !password.trim() || loading}
          >
            {loading
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={styles.connectBtnText}>Connect & import matches</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B2A', paddingHorizontal: 24 },
  backBtn: { paddingVertical: 16 },
  backText: { color: '#7A9CC0', fontSize: 16 },
  header: { marginBottom: 32 },
  platformBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(230,63,107,0.1)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 16,
  },
  platformBadgeText: { color: '#E63F6B', fontWeight: '700', fontSize: 13 },
  title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#4A6080', lineHeight: 22 },
  form: { gap: 6, marginBottom: 28 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#7A9CC0', marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: '#111E2E', borderRadius: 14, padding: 16,
    fontSize: 16, color: '#FFFFFF', borderWidth: 1.5, borderColor: '#1A2C42',
  },
  securityNote: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#0A1520', borderRadius: 12, padding: 14, marginTop: 16,
    borderWidth: 1, borderColor: '#1A2C42',
  },
  securityIcon: { fontSize: 16 },
  securityText: { flex: 1, fontSize: 12, color: '#4A6080', lineHeight: 18 },
  connectBtn: {
    backgroundColor: '#E63F6B', borderRadius: 16, padding: 18,
    alignItems: 'center', marginBottom: 32,
    shadowColor: '#E63F6B', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  connectBtnDisabled: { opacity: 0.5 },
  connectBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
