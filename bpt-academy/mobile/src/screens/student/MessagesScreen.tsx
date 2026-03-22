import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Conversation } from '../../types';

export default function MessagesScreen({ navigation }: any) {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = async () => {
    if (!profile) return;

    const { data: memberOf } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('profile_id', profile.id);

    if (!memberOf?.length) return;

    const ids = memberOf.map((m) => m.conversation_id);

    const { data } = await supabase
      .from('conversations')
      .select('*')
      .in('id', ids)
      .order('created_at', { ascending: false });

    if (data) setConversations(data);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  };

  useEffect(() => { fetchConversations(); }, [profile]);

  return (
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
            onPress={() => navigation.navigate('Chat', { conversationId: conv.id, title: conv.title ?? 'Chat' })}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarIcon}>{conv.is_group ? '👥' : '👤'}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.convTitle}>{conv.title ?? 'Direct Message'}</Text>
              <Text style={styles.convSub}>{conv.is_group ? 'Group' : 'Direct'}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}

        {conversations.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptyText}>Your coach will reach out here.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { padding: 24, paddingTop: 48, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 26, fontWeight: '700', color: '#111827' },
  list: { padding: 16 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarIcon: { fontSize: 22 },
  info: { flex: 1 },
  convTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  convSub: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  chevron: { fontSize: 22, color: '#D1D5DB' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#374151', marginBottom: 4 },
  emptyText: { color: '#9CA3AF', fontSize: 14 },
});
