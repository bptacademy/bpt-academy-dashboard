import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface ConvRow {
  id: string;
  is_group: boolean;
  title?: string;
  lastMessage?: string;
  lastAt?: string;
  otherName?: string;
}

export default function MessagesScreen({ navigation }: any) {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<ConvRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = async () => {
    if (!profile) return;

    const { data: memberOf } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('profile_id', profile.id);

    if (!memberOf?.length) { setConversations([]); return; }

    const ids = memberOf.map((m) => m.conversation_id);

    const { data: convs } = await supabase
      .from('conversations')
      .select('id, is_group, title')
      .in('id', ids)
      .order('created_at', { ascending: false });

    if (!convs) return;

    // For each conversation, get last message and other member's name
    const enriched: ConvRow[] = await Promise.all(
      convs.map(async (conv) => {
        const [{ data: lastMsg }, { data: members }] = await Promise.all([
          supabase
            .from('messages')
            .select('content, created_at')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single(),
          supabase
            .from('conversation_members')
            .select('profile_id')
            .eq('conversation_id', conv.id)
            .neq('profile_id', profile.id),
        ]);

        let otherName = conv.title ?? 'Chat';
        if (!conv.is_group && members?.length) {
          const { data: other } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', members[0].profile_id)
            .single();
          if (other) otherName = other.full_name;
        }

        return {
          id: conv.id,
          is_group: conv.is_group,
          title: conv.title,
          otherName,
          lastMessage: lastMsg?.content,
          lastAt: lastMsg?.created_at,
        };
      })
    );

    setConversations(enriched);
  };

  const onRefresh = async () => { setRefreshing(true); await fetchConversations(); setRefreshing(false); };
  useEffect(() => { fetchConversations(); }, [profile]);

  const formatTime = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Messages</Text>
        </View>

        <View style={styles.list}>
          {conversations.map((conv) => (
            <TouchableOpacity
              key={conv.id}
              style={styles.card}
              onPress={() => navigation.navigate('Chat', { conversationId: conv.id, title: conv.otherName })}
            >
              <View style={[styles.avatar, conv.is_group && styles.avatarGroup]}>
                <Text style={styles.avatarIcon}>{conv.is_group ? '👥' : '👤'}</Text>
              </View>
              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text style={styles.convName} numberOfLines={1}>{conv.otherName}</Text>
                  {conv.lastAt && <Text style={styles.time}>{formatTime(conv.lastAt)}</Text>}
                </View>
                {conv.lastMessage && (
                  <Text style={styles.lastMsg} numberOfLines={1}>{conv.lastMessage}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}

          {conversations.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptyText}>Tap the button below to start a conversation.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* New message FAB */}
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
  wrapper: { flex: 1 },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { padding: 24, paddingTop: 48, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 26, fontWeight: '700', color: '#111827' },
  list: { padding: 16 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  avatarGroup: { backgroundColor: '#ECFDF5' },
  avatarIcon: { fontSize: 22 },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convName: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1 },
  time: { fontSize: 12, color: '#9CA3AF', marginLeft: 8 },
  lastMsg: { fontSize: 13, color: '#6B7280', marginTop: 3 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#374151', marginBottom: 4 },
  emptyText: { color: '#9CA3AF', fontSize: 14, textAlign: 'center' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  fabIcon: { fontSize: 22 },
});
