import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, fonts } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { syncPlatform } from '../../lib/platformSync';
import { ScreenBackground } from '../../components/ScreenBackground';

const SUPABASE_URL = 'https://qmdewocktouqoibbqurh.supabase.co';

const ALL_PLATFORMS = [
  { id: 'playtomic',    label: 'Playtomic',      emoji: '🎾' },
  { id: 'on_the_court', label: 'On the Court',   emoji: '🎯' },
  { id: 'matchi',       label: 'Matchi',         emoji: '🏸', comingSoon: true },
];

export default function PlatformSyncScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [syncing, setSyncing]       = useState<string | null>(null);
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => { loadConnections(); }, []);

  const loadConnections = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('platform_connections')
      .select('platform, platform_user_id, last_synced_at')
      .eq('user_id', user.id);
    setConnections(data ?? []);
    setLoading(false);
  };

  // ── Sync handlers ─────────────────────────────────────────────────────────

  const handlePlaytomicSync = async () => {
    setSyncing('playtomic');
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

  const handleOTCSync = async () => {
    // OTC has no API yet — "Sync" updates self-declared stats
    // Navigate to the level/style/availability questions with current values pre-filled
    setSyncing('on_the_court');
    try {
      // Fetch current self_reported stats to pre-fill
      const { data: stats } = await supabase
        .from('player_stats')
        .select('level_value, play_style, preferred_days, preferred_time_of_day')
        .eq('user_id', user!.id)
        .eq('platform', 'self_reported')
        .maybeSingle();

      navigation.navigate('Question5Level', {
        // Pass current values so screens can pre-select them
        prefill: {
          level_value:           stats?.level_value           ?? null,
          play_style:            stats?.play_style            ?? null,
          preferred_days:        stats?.preferred_days        ?? [],
          preferred_time_of_day: stats?.preferred_time_of_day ?? null,
        },
        // After Q7, come back to PlatformSync instead of PhotoUpload
        returnTo: 'PlatformSync',
      });
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not load stats.');
    } finally {
      setSyncing(null);
    }
  };

  const handleSync = (platformId: string) => {
    if (platformId === 'playtomic')    return handlePlaytomicSync();
    if (platformId === 'on_the_court') return handleOTCSync();
  };

  const handleConnect = (platformId: string) => {
    if (platformId === 'on_the_court') {
      navigation.navigate('OTCConnect');
    }
    // Future: Playtomic re-connect, Matchi connect
  };

  const handleDisconnect = (platformId: string, label: string) => {
    Alert.alert(
      `Disconnect ${label}?`,
      'Your imported data will remain, but new matches will no longer sync.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect', style: 'destructive',
          onPress: async () => {
            try {
              await supabase
                .from('platform_connections')
                .delete()
                .eq('user_id', user!.id)
                .eq('platform', platformId);
              await loadConnections();
            } catch {
              Alert.alert('Error', 'Could not disconnect. Please try again.');
            }
          },
        },
      ]
    );
  };

  const formatLastSynced = (ts: string | null) => {
    if (!ts) return 'Connected — tap to update stats';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `Last synced ${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Last synced ${hrs}h ago`;
    return `Last synced ${Math.floor(hrs / 24)}d ago`;
  };

  const getOTCStatus = (conn: any) => {
    if (!conn) return '○ Not connected';
    return '✅ Connected — manual mode';
  };

  return (
    <ScreenBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
      

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
            Connect your booking platforms to build a richer profile and improve your volpair Score. More platforms = better matches.
          </Text>

          {ALL_PLATFORMS.map(p => {
            const conn       = connections.find(c => c.platform === p.id);
            const connected  = !!conn;
            const isOTC      = p.id === 'on_the_court';
            const lastSynced = conn?.last_synced_at ?? null;
            const isSyncing  = syncing === p.id;

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
                        : isOTC
                          ? getOTCStatus(conn)
                          : connected
                            ? `✅ ${formatLastSynced(lastSynced)}`
                            : '○ Not connected'}
                    </Text>
                  </View>
                  {(p as any).comingSoon && (
                    <View style={styles.comingSoonBadge}>
                      <Text style={styles.comingSoonText}>Soon</Text>
                    </View>
                  )}
                  {isOTC && connected && (
                    <View style={styles.manualBadge}>
                      <Text style={styles.manualBadgeText}>Manual</Text>
                    </View>
                  )}
                </View>

                {!(p as any).comingSoon && (
                  <>
                    {isOTC && connected && (
                      <View style={styles.otcNote}>
                        <Text style={styles.otcNoteText}>
                          🔜 Full match history sync coming when OTC API integration launches.
                        </Text>
                      </View>
                    )}

                    <View style={styles.platformActions}>
                      {connected ? (
                        <>
                          <TouchableOpacity
                            style={[styles.syncBtn, isSyncing && styles.syncBtnDisabled]}
                            onPress={() => handleSync(p.id)}
                            disabled={isSyncing}
                          >
                            {isSyncing
                              ? <ActivityIndicator color={theme.bg} size="small" />
                              : <Text style={styles.syncBtnText}>
                                  {isOTC ? '✏️ Update stats' : '🔄 Sync now'}
                                </Text>
                            }
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.disconnectBtn}
                            onPress={() => handleDisconnect(p.id, p.label)}
                          >
                            <Text style={styles.disconnectBtnText}>Disconnect</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <TouchableOpacity
                          style={styles.connectBtn}
                          onPress={() => handleConnect(p.id)}
                        >
                          <Text style={styles.connectBtnText}>+ Connect</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
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
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header:                 {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: theme.bgCard,
  },
  headerTitle:            { fontSize: 17, fontFamily: fonts.bodyBold, color: theme.textPrimary },
  backText:               { fontSize: 16, color: theme.textSecondary, fontFamily: fonts.bodyLight },
  loadingBox:             { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll:                 { padding: 16 },
  intro:                  { fontSize: 14, color: theme.textMuted, lineHeight: 22, marginBottom: 20, fontFamily: fonts.bodyLight },
  platformCard:           {
    backgroundColor: theme.bgCard, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: theme.border,
  },
  platformHeader:         { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  platformIcon:           {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: theme.bgDeep, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: theme.border,
  },
  platformIconConnected:  { backgroundColor: theme.primaryDim, borderColor: theme.primaryBorder },
  platformEmoji:          { fontSize: 22 },
  platformInfo:           { flex: 1 },
  platformLabel:          { fontSize: 16, fontFamily: fonts.bodyBold, color: theme.textPrimary, marginBottom: 3 },
  platformStatus:         { fontSize: 12, color: theme.textMuted, fontFamily: fonts.bodyLight },
  comingSoonBadge:        {
    backgroundColor: theme.bgDeep, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: theme.border,
  },
  comingSoonText:         { fontSize: 11, color: theme.textMuted, fontFamily: fonts.bodyBold },
  manualBadge:            {
    backgroundColor: 'rgba(0,212,200,0.1)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: theme.primaryBorder,
  },
  manualBadgeText:        { fontSize: 11, color: theme.primary, fontFamily: fonts.bodyBold },
  otcNote:                {
    backgroundColor: 'rgba(0,212,200,0.05)', borderRadius: 10, padding: 10,
    marginBottom: 10, borderWidth: 1, borderColor: theme.primaryBorder,
  },
  otcNoteText:            { fontSize: 12, color: theme.textMuted, fontFamily: fonts.bodyLight },
  platformActions:        { flexDirection: 'row', gap: 10 },
  syncBtn:                {
    flex: 1, backgroundColor: theme.primary, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  syncBtnDisabled:        { opacity: 0.6 },
  syncBtnText:            { color: theme.bg, fontSize: 14, fontFamily: fonts.bodyBold },
  disconnectBtn:          {
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
    backgroundColor: theme.bgDeep, borderWidth: 1, borderColor: theme.border,
  },
  disconnectBtnText:      { color: theme.textMuted, fontSize: 14, fontFamily: fonts.bodyBold },
  connectBtn:             {
    flex: 1, backgroundColor: theme.bgDeep, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
    borderWidth: 1.5, borderColor: theme.primaryBorder,
  },
  connectBtnText:         { color: theme.primary, fontSize: 14, fontFamily: fonts.bodyBold },
  infoBox:                {
    flexDirection: 'row', gap: 10, backgroundColor: theme.bgCard,
    borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.border,
  },
  infoIcon:               { fontSize: 18 },
  infoText:               { flex: 1, fontSize: 13, color: theme.textMuted, lineHeight: 20, fontFamily: fonts.bodyLight },
});
