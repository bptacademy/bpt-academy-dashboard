import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../lib/theme';

const MOCK_PLAYERS = [
  { id: '1', name: 'Sofia', club: 'Carbon Padel', emoji: '🎾' },
  { id: '2', name: 'James', club: 'Carbon Padel', emoji: '🎯' },
  { id: '3', name: 'Elena', club: 'Carbon Padel', emoji: '💫' },
];

type Response = 'yes' | 'maybe' | 'no';

export default function PostMatchPromptScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [responses, setResponses] = useState<Record<string, Response>>({});

  const allAnswered = MOCK_PLAYERS.every(p => responses[p.id]);

  const handleDone = () => navigation.goBack();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

      <View style={styles.header}>
        <Text style={styles.title}>You played with 3 people yesterday.</Text>
        <Text style={styles.subtitle}>Want to connect with any of them?</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {MOCK_PLAYERS.map(player => {
          const r = responses[player.id];
          return (
            <View key={player.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarEmoji}>{player.emoji}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.playerName}>{player.name}</Text>
                  <Text style={styles.playerClub}>🏟 {player.club}</Text>
                </View>
              </View>
              <View style={styles.btnRow}>
                {(['yes', 'maybe', 'no'] as Response[]).map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.responseBtn,
                      r === option && styles.responseBtnSelected,
                      r === option && option === 'yes' && styles.responseBtnYes,
                      r === option && option === 'maybe' && styles.responseBtnMaybe,
                      r === option && option === 'no' && styles.responseBtnNo,
                    ]}
                    onPress={() => setResponses(prev => ({ ...prev, [player.id]: option }))}
                    activeOpacity={0.75}
                  >
                    <Text style={[
                      styles.responseBtnText,
                      r === option && styles.responseBtnTextSelected,
                    ]}>
                      {option === 'yes' ? '✓ Yes' : option === 'maybe' ? '~ Maybe' : '✕ Not really'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={[styles.doneBtn, !allAnswered && styles.doneBtnDisabled]}
          onPress={handleDone}
          disabled={!allAnswered}
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDone}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: 20 },
  header: { paddingTop: 24, paddingBottom: 20 },
  title: { fontSize: 22, fontWeight: '800', color: theme.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 15, color: theme.textMuted },
  scroll: { gap: 12, paddingBottom: 20 },

  card: {
    backgroundColor: theme.bgCard, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: theme.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: theme.primaryDim, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: theme.primaryBorder,
  },
  avatarEmoji: { fontSize: 22 },
  cardInfo: { flex: 1 },
  playerName: { fontSize: 17, fontWeight: '700', color: theme.textPrimary, marginBottom: 3 },
  playerClub: { fontSize: 13, color: theme.textMuted },

  btnRow: { flexDirection: 'row', gap: 8 },
  responseBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
    backgroundColor: theme.bgDeep, borderWidth: 1, borderColor: theme.border,
  },
  responseBtnSelected: { borderWidth: 1.5 },
  responseBtnYes: { backgroundColor: theme.primaryDim, borderColor: theme.primaryBorder },
  responseBtnMaybe: { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)' },
  responseBtnNo: { backgroundColor: 'rgba(107,114,128,0.1)', borderColor: 'rgba(107,114,128,0.3)' },
  responseBtnText: { fontSize: 12, fontWeight: '600', color: theme.textMuted },
  responseBtnTextSelected: { color: theme.textPrimary },

  bottom: { paddingBottom: 12, gap: 10 },
  doneBtn: {
    backgroundColor: theme.primary, borderRadius: 16, padding: 18, alignItems: 'center',
    shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  doneBtnDisabled: { opacity: 0.4 },
  doneBtnText: { color: theme.bg, fontSize: 17, fontWeight: '800' },
  skipText: { color: theme.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 4 },
});
