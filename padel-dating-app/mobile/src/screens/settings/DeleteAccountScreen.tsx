import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, fonts } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function DeleteAccountScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

  const CONFIRM_WORD = 'DELETE';
  const confirmed = confirmation.trim() === CONFIRM_WORD;

  const handleDelete = () => {
    Alert.alert(
      'Delete your account?',
      'This is permanent. Your profile, matches, connections, and messages will all be deleted. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              // In production: call a delete-account Edge Function that wipes all user data
              await supabase.auth.signOut();
              await signOut();
            } catch (err: any) {
              setDeleting(false);
              Alert.alert('Error', err?.message ?? 'Could not delete account. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{flex:1, backgroundColor:'transparent'}}>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delete Account</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.warningEmoji}>⚠️</Text>
        <Text style={styles.title}>This cannot be undone</Text>
        <Text style={styles.body}>
          Deleting your account will permanently remove:
        </Text>

        <View style={styles.list}>
          {[
            'Your profile and photos',
            'All match connections and conversations',
            'Your Volpair score and history',
            'Your platform connections',
          ].map((item, i) => (
            <View key={i} style={styles.listRow}>
              <Text style={styles.listDot}>✕</Text>
              <Text style={styles.listItem}>{item}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.confirmLabel}>
          Type <Text style={styles.confirmWord}>DELETE</Text> to confirm
        </Text>
        <TextInput
          style={styles.confirmInput}
          value={confirmation}
          onChangeText={setConfirmation}
          placeholder="Type DELETE here"
          placeholderTextColor={theme.textDim}
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={[styles.deleteBtn, (!confirmed || deleting) && styles.deleteBtnDisabled]}
          onPress={handleDelete}
          disabled={!confirmed || deleting}
        >
          {deleting
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={styles.deleteBtnText}>Delete my account permanently</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: 24 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.bgCard,
    marginBottom: 32,
  },
  headerTitle: { fontSize: 18.2, fontFamily: fonts.bodyBold, color: theme.textPrimary },
  backText: { fontSize: 17.1, color: theme.textSecondary, fontFamily: fonts.bodyLight },
  content: { flex: 1 },
  warningEmoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 24, fontFamily: fonts.headlineBold, color: theme.textPrimary, marginBottom: 12 },
  body: { fontSize: 16.1, color: theme.textMuted, lineHeight: 22, marginBottom: 20, fontFamily: fonts.bodyLight },
  list: { gap: 10, marginBottom: 32 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  listDot: { fontSize: 13.9, color: '#F87171', fontFamily: fonts.bodyBold, width: 20 },
  listItem: { fontSize: 15, color: theme.textSecondary, fontFamily: fonts.bodyLight },
  confirmLabel: { fontSize: 15, color: theme.textMuted, marginBottom: 10, fontFamily: fonts.bodyLight },
  confirmWord: { color: '#F87171', fontFamily: fonts.headlineBold },
  confirmInput: {
    backgroundColor: theme.bgCard, borderRadius: 14, padding: 16,
    fontSize: 16, color: theme.textPrimary, borderWidth: 1.5, borderColor: '#F87171',
    letterSpacing: 2, fontFamily: fonts.bodyBold,
  },
  bottom: { paddingBottom: 12 },
  deleteBtn: {
    backgroundColor: '#EF4444', borderRadius: 16, padding: 18, alignItems: 'center',
  },
  deleteBtnDisabled: { opacity: 0.35 },
  deleteBtnText: { color: '#FFFFFF', fontSize: 16, fontFamily: fonts.headlineBold },
});
