import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { syncPlatform } from '../../lib/platformSync';

const ALL_PLATFORMS = [
  { id: 'playtomic', label: 'Playtomic', emoji: '🎾' },
  { id: 'matchi', label: 'Matchi', emoji: '🏸', comingSoon: true },
  { id: 'on_the_court', label: 'On the Court', emoji: '🎯', comingSoon: true },
];

export default function PlatformSyncScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [syncing, setSyncing] = useState<string | null>(null);
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('platform_connections')
      .select('platform, platform_user_id, last_synced_at')
      .eq('user_id', user.id);
    setConnections(data ?? []);
    setLoading(false);
  };

  const handleSync = async (platformId: string) => {
    setSyncing(platformId);
    try {
      const result = await syncPlatform();
      await loadConnections();
      Alert.alert(
        '✅ Sync complete',
        `${result.matches_imported} matches imported.\nLevel: ${result.level?.toFixed(2) ?? '—'}\nWin rate: ${result.wins}W / ${result.losses}L`,
      );
    } catch (err: any) {
      Alert.alert('Sync failed', err?.message ?? 'Could not sync. Please try again.');
    } finally {
      setSyncing(null);
    }
  };

  const handleDisconnect = (label: string) => {
    Alert.alert(
      `Disconnect ${label}?`,
      'Your imported match data will remain, but new matches will no longer sync.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  const formatLastSynced = (ts: string | null) => {
    if (!ts) return 'Never synced';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sync History</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Text style={styles.intro}>
            Your match history is imported from your booking platforms. Sync at any time to pull in new matches.
          </Text>

          {ALL_PLATFORMS.map(p => {
            const conn = connections.find(c => c.platform === p.id);
            const connected = !!conn;
            const lastSynced = conn?.last_synced_at ?? null;

            return (
              <View key={p.id} style={styles.platformCard}>
                <View style={styles.platformHeader}>
                  <View style={[styles.platformIcon, connected && styles.platformIconConnected]}>
                    <Text style={styles.platformEmoji}>{p.emoji}</Text>
                  </View>
                  <View style={styles.platformInfo}>
                    <Text style={styles.platformLabel}>{p.label}</Text>
                    <Text style={styles.platformStatus}>
                      {(p as any).comingSoon
                        ? '○ Coming soon'
                        : connected
                          ? lastSynced
                            ? `✅ Last synced ${formatLastSynced(lastSynced)}`
                            : '⚡ Connected — tap to sync'
                          : '○ Not connected'}
                    </Text>
                  </View>
                  {(p as any).comingSoon && (
                    <View style={styles.comingSoonBadge}>
                      <Text style={styles.comingSoonText}>Soon</Text>
                    </View>
                  )}
                </View>

                {connected && !( p as any).comingSoon && (
                  <View style={styles.platformActions}>
                    <TouchableOpacity
                      style={[styles.syncBtn, syncing === p.id && styles.syncBtnDisabled]}
                      onPress={() => handleSync(p.id)}
                      disabled={syncing === p.id}
                    >
                      {syncing === p.id
                        ? <ActivityIndicator color={theme.bg} size="small" />
                        : <Text style={styles.syncBtnText}>🔄 Sync now</Text>
                      }
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.disconnectBtn}
                      onPress={() => handleDisconnect(p.label)}
                    >
                      <Text style={styles.disconnectBtnText}>Disconnect</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}

          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>🔒</Text>
            <Text style={styles.infoText}>
              Platform credentials are processed server-side and never stored in plain text.
            </Text>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.textPrimary },
  backText: { fontSize: 16, color: theme.textSecondary },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16 },
  intro: { fontSize: 14, color: theme.textMuted, lineHeight: 22, marginBottom: 20 },
  platformCard: {
    backgroundColor: theme.bgCard, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: theme.border,
  },
  platformHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  platformIcon: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: theme.bgDeep, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: theme.border,
  },
  platformIconConnected: {
    backgroundColor: theme.primaryDim, borderColor: theme.primaryBorder,
  },
  platformEmoji: { fontSize: 22 },
  platformInfo: { flex: 1 },
  platformLabel: { fontSize: 16, fontWeight: '700', color: theme.textPrimary, marginBottom: 3 },
  platformStatus: { fontSize: 12, color: theme.textMuted },
  comingSoonBadge: {
    backgroundColor: theme.bgDeep, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: theme.border,
  },
  comingSoonText: { fontSize: 11, color: theme.textMuted, fontWeight: '600' },
  platformActions: { flexDirection: 'row', gap: 10 },
  syncBtn: {
    flex: 1, backgroundColor: theme.primary, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  syncBtnDisabled: { opacity: 0.6 },
  syncBtnText: { color: theme.bg, fontSize: 14, fontWeight: '700' },
  disconnectBtn: {
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
    backgroundColor: theme.bgDeep, borderWidth: 1, borderColor: theme.border,
  },
  disconnectBtnText: { color: theme.textMuted, fontSize: 14, fontWeight: '600' },
  infoBox: {
    flexDirection: 'row', gap: 10, backgroundColor: theme.bgCard,
    borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.border,
  },
  infoIcon: { fontSize: 18 },
  infoText: { flex: 1, fontSize: 13, color: theme.textMuted, lineHeight: 20 },
});
