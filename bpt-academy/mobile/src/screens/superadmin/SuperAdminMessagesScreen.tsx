import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import ScreenHeader from '../../components/common/ScreenHeader';

interface ConvRow {
  id: string;
  is_group: boolean;
  conversation_type: string;
  title?: string;
  lastMessage?: string;
  lastAt?: string;
  displayName: string;
}

export default function SuperAdminMessagesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<ConvRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!profile) return;

    // Fetch all conversations this user is a member of
    const { data: memberOf } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('profile_id', profile.id);

    if (!memberOf?.length) {
      setConversations([]);
      return;
    }

    const ids = memberOf.map((m: any) => m.conversation_id);

    const { data: convs } = await supabase
      .from('conversations')
      .select('id, is_group, title, conversation_type')
      .in('id', ids)
      .order('created_at', { ascending: false });

    if (!convs) return;

    const enriched: ConvRow[] = await Promise.all(
      convs.map(async (conv: any) => {
        const [{ data: lastMsg }, { data: members }] = await Promise.all([
          supabase
            .from('messages')
            .select('content, created_at')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('conversation_members')
            .select('profile_id')
            .eq('conversation_id', conv.id)
            .neq('profile_id', profile.id),
        ]);

        let displayName = conv.title ?? 'Chat';
        if (conv.conversation_type === 'direct' && members?.length) {
          const { data: other } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', members[0].profile_id)
            .single();
          if (other) displayName = (other as any).full_name;
        }

        return {
          id: conv.id,
          is_group: conv.is_group,
          conversation_type: conv.conversation_type,
          title: conv.title,
          displayName,
          lastMessage: lastMsg?.content,
          lastAt: lastMsg?.created_at,
        };
      })
    );

    setConversations(enriched);
  }, [profile?.id]);

  const onRefresh = async () => { setRefreshing(true); await fetchAll(); setRefreshing(false); };
  useEffect(() => { fetchAll(); }, [fetchAll]);
  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  const formatTime = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const typeIcon = (type: string, isGroup: boolean) => {
    if (type === 'division_group') return '🏆';
    if (type === 'program_group') return '📋';
    if (isGroup) return '👥';
    return '👤';
  };

  const direct = conversations.filter(c => c.conversation_type === 'direct');
  const groups = conversations.filter(c => c.conversation_type !== 'direct');

  const renderConv = (conv: ConvRow) => (
    <TouchableOpacity
      key={conv.id}
      style={styles.card}
      onPress={() => navigation.navigate('Chat', {
        conversationId: conv.id,
        title: conv.displayName,
        conversationType: conv.conversation_type,
      })}
    >
      <View style={[styles.avatar, conv.is_group && styles.avatarGroup]}>
        <Text style={styles.avatarIcon}>{typeIcon(conv.conversation_type, conv.is_group)}</Text>
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.convName} numberOfLines={1}>{conv.displayName}</Text>
          {conv.lastAt && <Text style={styles.time}>{formatTime(conv.lastAt)}</Text>}
        </View>
        {conv.lastMessage
          ? <Text style={styles.lastMsg} numberOfLines={1}>{conv.lastMessage}</Text>
          : <Text style={styles.lastMsgEmpty}>No messages yet</Text>
        }
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.wrapper}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 80, 104) }}
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ScreenHeader title="Messages" />

        {/* ── Broadcast Tools ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📢 Broadcast</Text>
          <View style={styles.toolRow}>
            <TouchableOpacity
              style={styles.toolCard}
              onPress={() => navigation.navigate('BulkMsg')}
            >
              <Text style={styles.toolIcon}>📨</Text>
              <Text style={styles.toolLabel}>Bulk Message</Text>
              <Text style={styles.toolHint}>Message by division or role</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toolCard}
              onPress={() => navigation.navigate('Announce')}
            >
              <Text style={styles.toolIcon}>📣</Text>
              <Text style={styles.toolLabel}>Announcement</Text>
              <Text style={styles.toolHint}>Push to all users</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Direct Messages ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔒 Direct Messages</Text>
          {direct.length > 0
            ? direct.map(renderConv)
            : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No direct conversations yet.</Text>
              </View>
            )
          }
        </View>

        {/* ── Group Channels ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 Group Channels</Text>
          {groups.length > 0
            ? groups.map(renderConv)
            : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No group channels yet.</Text>
              </View>
            )
          }
        </View>
      </ScrollView>

      {/* FAB — new conversation */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NewConversation')}
      >
        <Text style={styles.fabIcon}>✏️</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { flex: 1 },
  section: { padding: 16, paddingBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },

  toolRow: { flexDirection: 'row', gap: 12 },
  toolCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: '#E5E7EB',
    alignItems: 'flex-start', gap: 4,
  },
  toolIcon: { fontSize: 26, marginBottom: 4 },
  toolLabel: { fontSize: 14, fontWeight: '700', color: '#111827' },
  toolHint: { fontSize: 12, color: '#9CA3AF' },

  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#E5E7EB', gap: 12,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  avatarGroup: { backgroundColor: '#ECFDF5' },
  avatarIcon: { fontSize: 22 },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convName: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1 },
  time: { fontSize: 12, color: '#9CA3AF', marginLeft: 8 },
  lastMsg: { fontSize: 13, color: '#6B7280', marginTop: 3 },
  lastMsgEmpty: { fontSize: 13, color: '#D1D5DB', marginTop: 3, fontStyle: 'italic' },
  chevron: { fontSize: 20, color: '#D1D5DB', marginLeft: 4 },

  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 10,
  },
  emptyText: { fontSize: 13, color: '#9CA3AF' },

  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  fabIcon: { fontSize: 22 },
});
