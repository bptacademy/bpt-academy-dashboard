import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  StatusBar, Alert, ActivityIndicator, Image, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, fonts } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ScreenBackground } from '../../components/ScreenBackground';

interface BlockedUser {
  blockId: string;
  userId: string;
  fullName: string;
  photos: string[] | null;
  blockedAt: string;
}

export default function BlockedUsersScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('blocks')
        .select('id, blocked_id, created_at, blocked:users!blocked_id(id, full_name, photos)')
        .eq('blocker_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBlocked((data ?? []).map((row: any) => ({
        blockId: row.id,
        userId: row.blocked_id,
        fullName: row.blocked?.full_name ?? 'Unknown',
        photos: row.blocked?.photos ?? null,
        blockedAt: row.created_at,
      })));
    } catch (e) {
      console.error('BlockedUsersScreen load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const handleUnblock = (blockId: string, name: string) => {
    Alert.alert(
      `Unblock ${name}?`,
      `${name} will be able to see your profile and send you Serves again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            try {
              await supabase.from('blocks').delete().eq('id', blockId);
              setBlocked(prev => prev.filter(u => u.blockId !== blockId));
            } catch (e) {
              Alert.alert('Error', 'Could not unblock. Please try again.');
            }
          },
        },
      ]
    );
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const getPhotoUrl = (photos: string[] | null): string | null => {
    if (!photos || photos.length === 0) return null;
    const first = photos[0];
    if (first.startsWith('http')) return first;
    return `https://qmdewocktouqoibbqurh.supabase.co/storage/v1/object/public/photos/${first.replace(/^\/photos\//, '').replace(/^photos\//, '')}`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blocked Users</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={theme.primary}
            />
          }
        >
          {blocked.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🚫</Text>
              <Text style={styles.emptyTitle}>No blocked users</Text>
              <Text style={styles.emptySub}>
                Users you block will appear here. You can unblock them at any time.
              </Text>
            </View>
          ) : (
            blocked.map(u => {
              const photoUrl = getPhotoUrl(u.photos);
              return (
                <View key={u.blockId} style={styles.row}>
                  <View style={styles.avatarWrap}>
                    {photoUrl ? (
                      <Image source={{ uri: photoUrl }} style={styles.avatarImg} />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarInitials}>{getInitials(u.fullName)}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.name}>{u.fullName}</Text>
                  <TouchableOpacity
                    style={styles.unblockBtn}
                    onPress={() => handleUnblock(u.blockId, u.fullName)}
                  >
                    <Text style={styles.unblockText}>Unblock</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: theme.bgCard,
  },
  headerTitle: { fontSize: 17, fontFamily: fonts.bodyBold, color: theme.textPrimary },
  backText: { fontSize: 16, color: theme.textSecondary, fontFamily: fonts.bodyLight },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16 },
  empty: { paddingTop: 60, alignItems: 'center', gap: 10 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontFamily: fonts.bodyBold, color: theme.textPrimary },
  emptySub: { fontSize: 14, color: theme.textMuted, textAlign: 'center', lineHeight: 22, fontFamily: fonts.bodyLight, paddingHorizontal: 24 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.bgCard, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: theme.border,
  },
  avatarWrap: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  avatarImg: { width: 44, height: 44 },
  avatarFallback: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: theme.primaryDim, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: theme.primaryBorder,
  },
  avatarInitials: { fontSize: 16, fontFamily: fonts.bodyBold, color: theme.primary },
  name: { flex: 1, fontSize: 15, fontFamily: fonts.bodyBold, color: theme.textPrimary },
  unblockBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10,
    backgroundColor: theme.bgDeep, borderWidth: 1, borderColor: theme.border,
  },
  unblockText: { fontSize: 13, color: theme.textSecondary, fontFamily: fonts.bodyBold },
});
