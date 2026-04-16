import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, Modal,, Image, Dimensions} from 'react-native';
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

interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  created_at: string;
  isConversation: boolean;
  conversationId?: string;
}

export default function SuperAdminMessagesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [direct, setDirect]               = useState<ConvRow[]>([]);
  const [groups, setGroups]               = useState<ConvRow[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [refreshing, setRefreshing]       = useState(false);
  const [selectedAnn, setSelectedAnn]     = useState<AnnouncementRow | null>(null);

  const fetchAll = useCallback(async () => {
    if (!profile) return;

    // ── 1. Conversations this user is a member of (non-announcement) ─────────
    const { data: memberOf } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('profile_id', profile.id);

    const memberIds = (memberOf ?? []).map((m: any) => m.conversation_id);

    if (memberIds.length > 0) {
      const { data: convs } = await supabase
        .from('conversations')
        .select('id, is_group, title, conversation_type')
        .in('id', memberIds)
        .neq('conversation_type', 'announcement')
        .order('created_at', { ascending: false });

      if (convs) {
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

        setDirect(enriched.filter((c) => c.conversation_type === 'direct'));
        setGroups(enriched.filter((c) => c.conversation_type !== 'direct'));
      }
    } else {
      setDirect([]);
      setGroups([]);
    }

    // ── 2. ALL announcement conversations ────────────────────────────────────
    const { data: announcementConvs } = await supabase
      .from('conversations')
      .select('id, title, created_at')
      .eq('conversation_type', 'announcement')
      .order('created_at', { ascending: false });

    // ── 3. Past announcements from notifications table (deduplicated) ─────────
    const { data: notifAnnouncements } = await supabase
      .from('notifications')
      .select('title, body, created_at')
      .eq('type', 'announcement')
      .order('created_at', { ascending: false });

    const seen = new Set<string>();
    const dedupedNotifs: AnnouncementRow[] = [];
    for (const n of (notifAnnouncements ?? []) as any[]) {
      const minute = n.created_at?.slice(0, 16);
      const key = `${n.title}__${minute}`;
      if (!seen.has(key)) {
        seen.add(key);
        dedupedNotifs.push({
          id: key,
          title: n.title,
          body: n.body,
          created_at: n.created_at,
          isConversation: false,
        });
      }
    }

    // Conversation-based announcements
    const convAnnRows: AnnouncementRow[] = (announcementConvs ?? []).map((c: any) => ({
      id: c.id,
      title: c.title ?? 'Announcement',
      body: '',
      created_at: c.created_at,
      isConversation: true,
      conversationId: c.id,
    }));

    // Merge and sort — exclude notification-based ones that already have a conv equivalent
    const convTitles = new Set(convAnnRows.map((r) => r.title));
    const filteredNotifs = dedupedNotifs.filter((n) => !convTitles.has(n.title));

    const allRows = [...convAnnRows, ...filteredNotifs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setAnnouncements(allRows);
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

  const renderAnnouncement = (ann: AnnouncementRow) => (
    <TouchableOpacity
      key={ann.id}
      style={styles.card}
      onPress={() => {
        if (ann.isConversation && ann.conversationId) {
          navigation.navigate('Chat', {
            conversationId: ann.conversationId,
            title: ann.title,
            conversationType: 'announcement',
          });
        } else {
          // Legacy notification-based announcement — show in modal
          setSelectedAnn(ann);
        }
      }}
    >
      <View style={styles.avatarAnnouncement}>
        <Text style={styles.avatarIcon}>📢</Text>
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.convName} numberOfLines={1}>{ann.title}</Text>
          <Text style={styles.time}>{formatTime(ann.created_at)}</Text>
        </View>
        <Text style={styles.lastMsg} numberOfLines={1}>{ann.body || 'Tap to view'}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.wrapper}>
      <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />

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
            <TouchableOpacity style={styles.toolCard} onPress={() => navigation.navigate('BulkMsg')}>
              <Text style={styles.toolIcon}>📨</Text>
              <Text style={styles.toolLabel}>Bulk Message</Text>
              <Text style={styles.toolHint}>Message by division or role</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolCard} onPress={() => navigation.navigate('Announce')}>
              <Text style={styles.toolIcon}>📣</Text>
              <Text style={styles.toolLabel}>Announcement</Text>
              <Text style={styles.toolHint}>Push to all users</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Past Announcements ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📢 Announcements</Text>
          <Text style={styles.sectionHint}>All past announcements — tap to view</Text>
          {announcements.length > 0
            ? announcements.map(renderAnnouncement)
            : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No announcements sent yet.</Text>
              </View>
            )
          }
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

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NewConversation')}
      >
        <Text style={styles.fabIcon}>✏️</Text>
      </TouchableOpacity>

      {/* ── Announcement detail modal (legacy notifications) ── */}
      <Modal
        visible={!!selectedAnn}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedAnn(null)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHandle} />
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.modalMeta}>
              <Text style={styles.modalDate}>
                {selectedAnn ? formatTime(selectedAnn.created_at) : ''}
              </Text>
              <View style={styles.modalTypeBadge}>
                <Text style={styles.modalTypeBadgeText}>📢 Announcement</Text>
              </View>
            </View>
            <Text style={styles.modalTitle}>{selectedAnn?.title}</Text>
            {selectedAnn?.body ? (
              <Text style={styles.modalBodyText}>{selectedAnn.body}</Text>
            ) : (
              <Text style={styles.modalEmpty}>No message body.</Text>
            )}
          </ScrollView>
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={() => setSelectedAnn(null)}
          >
            <Text style={styles.modalCloseBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  wrapper: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { flex: 1 },
  section: { padding: 16, paddingBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  sectionHint: { fontSize: 12, color: '#9CA3AF', marginBottom: 10 },

  toolRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
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
  avatarAnnouncement: { backgroundColor: '#FFF7ED' },
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

  // Modal
  modal: {
    flex: 1, backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: '#E5E7EB',
    borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  modalBody: { flex: 1, padding: 24 },
  modalMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalDate: { fontSize: 13, color: '#9CA3AF' },
  modalTypeBadge: { backgroundColor: '#FFF7ED', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  modalTypeBadgeText: { fontSize: 12, color: '#EA580C', fontWeight: '600' },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 16 },
  modalBodyText: { fontSize: 16, color: '#374151', lineHeight: 26 },
  modalEmpty: { fontSize: 14, color: '#9CA3AF', fontStyle: 'italic' },
  modalCloseBtn: {
    margin: 20, backgroundColor: '#16A34A',
    borderRadius: 14, padding: 16, alignItems: 'center',
  },
  modalCloseBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
