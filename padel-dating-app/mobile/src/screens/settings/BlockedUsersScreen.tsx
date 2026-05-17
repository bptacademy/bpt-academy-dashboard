import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, fonts } from '../../lib/theme';

const MOCK_BLOCKED: any[] = [];

export default function BlockedUsersScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [blocked, setBlocked] = useState(MOCK_BLOCKED);

  const handleUnblock = (id: string, name: string) => {
    Alert.alert(`Unblock ${name}?`, `${name} will be able to see your profile and send you Serves again.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unblock', onPress: () => setBlocked(prev => prev.filter(u => u.id !== id)),
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blocked Users</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {blocked.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🚫</Text>
            <Text style={styles.emptyTitle}>No blocked users</Text>
            <Text style={styles.emptySub}>
              Users you block will appear here. You can unblock them at any time.
            </Text>
          </View>
        ) : (
          blocked.map(u => (
            <View key={u.id} style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarEmoji}>{u.emoji}</Text>
              </View>
              <Text style={styles.name}>{u.name}</Text>
              <TouchableOpacity style={styles.unblockBtn} onPress={() => handleUnblock(u.id, u.name)}>
                <Text style={styles.unblockText}>Unblock</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: theme.bgCard,
  },
  headerTitle: { fontSize: 17, fontFamily: fonts.bodyBold, color: theme.textPrimary },
  backText: { fontSize: 16, color: theme.textSecondary, fontFamily: fonts.bodyLight },
  scroll: { padding: 16 },
  empty: { paddingTop: 60, alignItems: 'center' },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontFamily: fonts.bodyBold, color: theme.textPrimary, marginBottom: 8 },
  emptySub: { fontSize: 14, color: theme.textMuted, textAlign: 'center', lineHeight: 22, fontFamily: fonts.bodyLight },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.bgCard, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: theme.border,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.bgDeep, alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 18 },
  name: { flex: 1, fontSize: 15, fontFamily: fonts.bodyBold, color: theme.textPrimary },
  unblockBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10,
    backgroundColor: theme.bgDeep, borderWidth: 1, borderColor: theme.border,
  },
  unblockText: { fontSize: 13, color: theme.textSecondary, fontFamily: fonts.bodyBold },
});
