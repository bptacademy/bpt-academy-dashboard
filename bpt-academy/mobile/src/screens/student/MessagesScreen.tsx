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
  otherName?: string;
  unread?: boolean;
}

export default function MessagesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [direct, setDirect]             = useState<ConvRow[]>([]);
  const [groups, setGroups]             = useState<ConvRow[]>([]);
  const [divisionGroup, setDivisionGroup] = useState<ConvRow[]>([]);
  const [refreshing, setRefreshing]     = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!profile) return;

    const { data: memberOf } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('profile_id', profile.id);

    if (!memberOf?.length) {
      setDirect([]);
      setGroups([]);
      setDivisionGroup([]);
      return;
    }

    const ids = memberOf.map((m: any) => m.conversation_id);

    const { data: convs } = await supabase
      .from('conversations')
      .select('id, is_group, title, conversation_type, division')
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

        let otherName = conv.title ?? 'Chat';
        if (conv.conversation_type === 'direct' && members?.length) {
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
          conversation_type: conv.conversation_type,
          title: conv.title,
          otherName,
          lastMessage: lastMsg?.content,
          lastAt: lastMsg?.created_at,
        };
      })
    );

    // Split into three buckets by conversation_type
    setDirect(enriched.filter((c) => c.conversation_type === 'direct'));
    setGroups(enriched.filter((c) => c.conversation_type === 'program_group'));
    setDivisionGroup(enriched.filter((c) => c.conversation_type === 'division_group'));
  }, [profile?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  };

  useEffect(() => { fetchConversations(); }, [fetchConversations]);
  useFocusEffect(useCallback(() => { fetchConversations(); }, [fetchConversations]));

  const formatTime = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const renderConv = (conv: ConvRow) => (
    <TouchableOpacity
      key={conv.id}
      style={styles.card}
      onPress={() =>
        navigation.navigate('Chat', {
          conversationId: conv.id,
          title: conv.otherName,
          conversationType: conv.conversation_type,
        })
      }
    >
      <View style={[styles.avatar, conv.is_group && styles.avatarGroup]}>
        <Text style={styles.avatarIcon}>{conv.is_group ? '👥' : '👤'}</Text>
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.convName} numberOfLines={1}>{conv.otherName}</Text>
          {conv.lastAt && <Text style={styles.time}>{formatTime(conv.lastAt)}</Text>}
        </View>
        {conv.lastMessage
          ? <Text style={styles.lastMsg} numberOfLines={1}>{conv.lastMessage}</Text>
          : <Text style={styles.lastMsgEmpty}>No messages yet</Text>
        }
      </View>
    </TouchableOpacity>
  );

  /** Renders the single division group card with a gold avatar */
  const renderDivisionConv = (conv: ConvRow) => (
    <TouchableOpacity
      key={conv.id}
      style={styles.card}
      onPress={() =>
        navigation.navigate('Chat', {
          conversationId: conv.id,
          title: conv.otherName,
          conversationType: conv.conversation_type,
        })
      }
    >
      <View style={styles.avatarDivision}>
        <Text style={styles.avatarIcon}>🏆</Text>
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.convName} numberOfLines={1}>{conv.otherName}</Text>
          {conv.lastAt && <Text style={styles.time}>{formatTime(conv.lastAt)}</Text>}
        </View>
        {conv.lastMessage
          ? <Text style={styles.lastMsg} numberOfLines={1}>{conv.lastMessage}</Text>
          : <Text style={styles.lastMsgEmpty}>No messages yet</Text>
        }
      </View>
    </TouchableOpacity>
  );

  const isCoachOrAdmin =
    profile?.role === 'coach' ||
    profile?.role === 'admin' ||
    profile?.role === 'super_admin';

  return (
    <View style={styles.wrapper}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ScreenHeader title="Messages" />

        {/* ── Direct Messages ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔒 Direct Messages</Text>
            <Text style={styles.sectionHint}>Private — only you and your coach</Text>
          </View>
          {direct.length > 0
            ? direct.map(renderConv)
            : (
              <View style={styles.emptySection}>
                <Text style={styles.emptySectionText}>
                  No direct messages yet. Your coach can message you directly from your profile.
                </Text>
              </View>
            )
          }
        </View>

        {/* ── Division Channel ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏆 Division Channel</Text>
            <Text style={styles.sectionHint}>Everyone in your division</Text>
          </View>
          {divisionGroup.length > 0
            ? divisionGroup.map(renderDivisionConv)
            : (
              <View style={styles.emptySection}>
                <Text style={styles.emptySectionText}>
                  You haven't been assigned to a division yet.
                </Text>
              </View>
            )
          }
        </View>

        {/* ── Program Group Channels ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>👥 Program Channels</Text>
            <Text style={styles.sectionHint}>All students + coaches in your program</Text>
          </View>
          {groups.length > 0
            ? groups.map(renderConv)
            : (
              <View style={styles.emptySection}>
                <Text style={styles.emptySectionText}>
                  Enroll in a program to join its group channel.
                </Text>
              </View>
            )
          }
        </View>
      </ScrollView>

      {/* FAB — coaches/admins can initiate DMs; students cannot */}
      {isCoachOrAdmin && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('NewConversation')}
        >
          <Text style={styles.fabIcon}>✏️</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { flex: 1 },
  section: { padding: 16, paddingBottom: 4 },
  sectionHeader: { marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  sectionHint: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
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
  /** Gold/trophy background for division group cards */
  avatarDivision: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center',
  },
  avatarIcon: { fontSize: 22 },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convName: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1 },
  time: { fontSize: 12, color: '#9CA3AF', marginLeft: 8 },
  lastMsg: { fontSize: 13, color: '#6B7280', marginTop: 3 },
  lastMsgEmpty: { fontSize: 13, color: '#D1D5DB', marginTop: 3, fontStyle: 'italic' },
  emptySection: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 10,
  },
  emptySectionText: { fontSize: 13, color: '#9CA3AF', lineHeight: 20 },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  fabIcon: { fontSize: 22 },
});
