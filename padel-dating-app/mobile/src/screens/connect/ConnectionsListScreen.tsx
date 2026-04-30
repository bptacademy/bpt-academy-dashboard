import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../lib/theme';

const MOCK_CONNECTIONS = [
  {
    id: '1', name: 'Sofia', lastServe: 'Rematch Saturday? 🎾',
    time: '2m ago', unread: true, emoji: '🎾',
  },
  {
    id: '2', name: 'Elena', lastServe: 'Good game last week!',
    time: '1h ago', unread: true, emoji: '💫',
  },
  {
    id: '3', name: 'James', lastServe: 'In for Sunday at Carbon?',
    time: 'Yesterday', unread: false, emoji: '🎯',
  },
];

export default function ConnectionsListScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Text style={styles.headerSub}>Your serves and connections</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {MOCK_CONNECTIONS.map(c => (
          <TouchableOpacity
            key={c.id}
            style={styles.row}
            onPress={() => navigation.navigate('Conversation', { connectionId: c.id })}
            activeOpacity={0.75}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarEmoji}>{c.emoji}</Text>
            </View>
            <View style={styles.info}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{c.name}</Text>
                <Text style={styles.time}>{c.time}</Text>
              </View>
              <Text style={[styles.lastServe, c.unread && styles.lastServeUnread]} numberOfLines={1}>
                {c.lastServe}
              </Text>
            </View>
            {c.unread && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        ))}

        <View style={styles.emptyHint}>
          <Text style={styles.emptyHintIcon}>💘</Text>
          <Text style={styles.emptyHintText}>
            When you and someone both send a Volley, your conversation opens here.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: theme.bgCard,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: theme.textPrimary },
  headerSub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  scroll: { paddingTop: 8 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: theme.bgCard,
  },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: theme.primaryDim, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: theme.primaryBorder,
  },
  avatarEmoji: { fontSize: 22 },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '700', color: theme.textPrimary },
  time: { fontSize: 12, color: theme.textMuted },
  lastServe: { fontSize: 13, color: theme.textMuted },
  lastServeUnread: { color: theme.textSecondary, fontWeight: '500' },
  unreadDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: theme.primary,
  },

  emptyHint: {
    margin: 20, backgroundColor: theme.bgCard, borderRadius: 16, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: theme.border,
  },
  emptyHintIcon: { fontSize: 32, marginBottom: 10 },
  emptyHintText: { fontSize: 13, color: theme.textMuted, textAlign: 'center', lineHeight: 20 },
});
