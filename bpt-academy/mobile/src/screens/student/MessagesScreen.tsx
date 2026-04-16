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
  otherName?: string;
}

interface StudentAnnouncement {
  id: string;
  title: string;
  body: string;
  created_at: string;
  read: boolean;
  isConversation: boolean;
  conversationId?: string;
}

export default function MessagesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [direct, setDirect]                         = useState<ConvRow[]>([]);
  const [groups, setGroups]                         = useState<ConvRow[]>([]);
  const [divisionGroup, setDivisionGroup]           = useState<ConvRow[]>([]);
  const [coachAnnouncements, setCoachAnnouncements] = useState<ConvRow[]>([]);
  const [studentAnnouncements, setStudentAnnouncements] = useState<StudentAnnouncement[]>([]);
  const [selectedAnn, setSelectedAnn]               = useState<StudentAnnouncement | null>(null);
  const [noteCount, setNoteCount]                   = useState(0);
  const [latestNote, setLatestNote]                 = useState<{ note: string; coach_name: string; created_at: string } | null>(null);
  const [refreshing, setRefreshing]                 = useState(false);

  const isStudent = profile?.role === 'student';
  const isCoachOrAdmin =
    profile?.role === 'coach' ||
    profile?.role === 'admin' ||
    profile?.role === 'super_admin';

  const fetchAll = useCallback(async () => {
    if (!profile) return;

    // ── Coach notes (students only) ──────────────────────────────────────────
    if (isStudent) {
      const { data: notesData } = await supabase
        .from('coach_notes')
        .select('note, created_at, coach:coach_id(full_name)')
        .eq('student_id', profile.id)
        .eq('is_private', false)
        .order('created_at', { ascending: false });

      if (notesData) {
        setNoteCount(notesData.length);
        if (notesData.length > 0) {
          const n = notesData[0] as any;
          setLatestNote({ note: n.note, coach_name: n.coach?.full_name ?? 'Coach', created_at: n.created_at });
        } else {
          setLatestNote(null);
        }
      }

      // ── Student announcements: from notifications table ──────────────────
      const { data: notifData } = await supabase
        .from('notifications')
        .select('id, title, body, read, created_at')
        .eq('recipient_id', profile.id)
        .eq('type', 'announcement')
        .order('created_at', { ascending: false });

      // Also check if any have a linked conversation
      const { data: annConvs } = await supabase
        .from('conversations')
        .select('id, title, created_at')
        .eq('conversation_type', 'announcement')
        .order('created_at', { ascending: false });

      const convTitleMap = new Map<string, string>();
      for (const c of (annConvs ?? []) as any[]) {
        convTitleMap.set(c.title, c.id);
      }

      // Deduplicate notifications by title + minute
      const seen = new Set<string>();
      const deduped: StudentAnnouncement[] = [];
      for (const n of (notifData ?? []) as any[]) {
        const minute = n.created_at?.slice(0, 16);
        const key = `${n.title}__${minute}`;
        if (!seen.has(key)) {
          seen.add(key);
          const convId = convTitleMap.get(n.title);
          deduped.push({
            id: n.id,
            title: n.title,
            body: n.body ?? '',
            created_at: n.created_at,
            read: n.read,
            isConversation: !!convId,
            conversationId: convId,
          });
        }
      }
      setStudentAnnouncements(deduped);
    }

    // ── Conversations the user is a member of ────────────────────────────────
    const { data: memberOf } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('profile_id', profile.id);

    const ids = (memberOf ?? []).map((m: any) => m.conversation_id);

    if (ids.length > 0) {
      const { data: convs } = await supabase
        .from('conversations')
        .select('id, is_group, title, conversation_type, division')
        .in('id', ids)
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

            let otherName = conv.title ?? 'Chat';
            if (conv.conversation_type === 'direct' && members?.length) {
              const { data: other } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', members[0].profile_id)
                .single();
              if (other) otherName = (other as any).full_name;
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

        setDirect(enriched.filter((c) => c.conversation_type === 'direct'));
        setGroups(enriched.filter((c) => c.conversation_type === 'program_group'));
        setDivisionGroup(enriched.filter((c) => c.conversation_type === 'division_group'));
      }
    } else {
      setDirect([]);
      setGroups([]);
      setDivisionGroup([]);
    }

    // ── Coach/admin: fetch ALL announcement conversations ────────────────────
    if (isCoachOrAdmin) {
      const { data: allAnn } = await supabase
        .from('conversations')
        .select('id, is_group, title, conversation_type')
        .eq('conversation_type', 'announcement')
        .order('created_at', { ascending: false });

      if (allAnn) {
        const enriched: ConvRow[] = await Promise.all(
          allAnn.map(async (conv: any) => {
            const { data: lastMsg } = await supabase
              .from('messages')
              .select('content, created_at')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            return {
              id: conv.id,
              is_group: true,
              conversation_type: 'announcement',
              title: conv.title,
              otherName: conv.title ?? 'Announcement',
              lastMessage: lastMsg?.content,
              lastAt: lastMsg?.created_at,
            };
          })
        );
        setCoachAnnouncements(enriched);
      }
    }
  }, [profile?.id]);

  // Mark announcement as read when opened
  const openAnnouncement = async (ann: StudentAnnouncement) => {
    if (!ann.read) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('recipient_id', profile!.id)
        .eq('type', 'announcement')
        .eq('title', ann.title);
      setStudentAnnouncements((prev) =>
        prev.map((a) => a.id === ann.id ? { ...a, read: true } : a)
      );
    }
    if (ann.isConversation && ann.conversationId) {
      navigation.navigate('Chat', {
        conversationId: ann.conversationId,
        title: ann.title,
        conversationType: 'announcement',
      });
    } else {
      setSelectedAnn(ann);
    }
  };

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

  const unreadCount = studentAnnouncements.filter((a) => !a.read).length;

  const renderConv = (conv: ConvRow) => (
    <TouchableOpacity key={conv.id} style={styles.card}
      onPress={() => navigation.navigate('Chat', { conversationId: conv.id, title: conv.otherName, conversationType: conv.conversation_type })}>
      <View style={[styles.avatar, conv.is_group && styles.avatarGroup]}>
        <Text style={styles.avatarIcon}>{conv.is_group ? '👥' : '👤'}</Text>
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.convName} numberOfLines={1}>{conv.otherName}</Text>
          {conv.lastAt && <Text style={styles.time}>{formatTime(conv.lastAt)}</Text>}
        </View>
        {conv.lastMessage ? <Text style={styles.lastMsg} numberOfLines={1}>{conv.lastMessage}</Text>
          : <Text style={styles.lastMsgEmpty}>No messages yet</Text>}
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  const renderDivisionConv = (conv: ConvRow) => (
    <TouchableOpacity key={conv.id} style={styles.card}
      onPress={() => navigation.navigate('Chat', { conversationId: conv.id, title: conv.otherName, conversationType: conv.conversation_type })}>
      <View style={styles.avatarDivision}><Text style={styles.avatarIcon}>🏆</Text></View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.convName} numberOfLines={1}>{conv.otherName}</Text>
          {conv.lastAt && <Text style={styles.time}>{formatTime(conv.lastAt)}</Text>}
        </View>
        {conv.lastMessage ? <Text style={styles.lastMsg} numberOfLines={1}>{conv.lastMessage}</Text>
          : <Text style={styles.lastMsgEmpty}>No messages yet</Text>}
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  const renderCoachAnnouncement = (conv: ConvRow) => (
    <TouchableOpacity key={conv.id} style={styles.card}
      onPress={() => navigation.navigate('Chat', { conversationId: conv.id, title: conv.otherName, conversationType: conv.conversation_type })}>
      <View style={styles.avatarAnnouncement}><Text style={styles.avatarIcon}>📢</Text></View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.convName} numberOfLines={1}>{conv.otherName}</Text>
          {conv.lastAt && <Text style={styles.time}>{formatTime(conv.lastAt)}</Text>}
        </View>
        {conv.lastMessage ? <Text style={styles.lastMsg} numberOfLines={1}>{conv.lastMessage}</Text>
          : <Text style={styles.lastMsgEmpty}>No messages yet</Text>}
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  const renderStudentAnnouncement = (ann: StudentAnnouncement) => (
    <TouchableOpacity key={ann.id} style={[styles.card, !ann.read && styles.cardUnread]}
      onPress={() => openAnnouncement(ann)}>
      <View style={styles.avatarAnnouncement}>
        <Text style={styles.avatarIcon}>📢</Text>
        {!ann.read && <View style={styles.unreadDot} />}
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.convName, !ann.read && styles.convNameUnread]} numberOfLines={1}>
            {ann.title}
          </Text>
          <Text style={styles.time}>{formatTime(ann.created_at)}</Text>
        </View>
        <Text style={styles.lastMsg} numberOfLines={1}>{ann.body || 'Tap to read'}</Text>
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

        {/* ── Coach Notes — students only ── */}
        {isStudent && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Coach Notes</Text>
            <TouchableOpacity style={styles.folderCard} onPress={() => navigation.navigate('MyCoachNotes')} activeOpacity={0.75}>
              <View style={styles.folderAvatar}>
                <Text style={styles.folderAvatarIcon}>📝</Text>
              </View>
              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text style={styles.convName}>Coach Notes</Text>
                  <View style={noteCount > 0 ? styles.badge : styles.badgeEmpty}>
                    <Text style={styles.badgeText}>{noteCount}</Text>
                  </View>
                </View>
                {latestNote
                  ? <Text style={styles.lastMsg} numberOfLines={1}>{latestNote.coach_name}: {latestNote.note}</Text>
                  : <Text style={styles.lastMsgEmpty}>No notes yet</Text>}
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Announcements — students see academy announcements ── */}
        {isStudent && (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>📢 Announcements</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount} new</Text>
                </View>
              )}
            </View>
            <Text style={styles.sectionHint}>Messages from your coaches and the academy</Text>
            {studentAnnouncements.length > 0
              ? studentAnnouncements.map(renderStudentAnnouncement)
              : (
                <View style={styles.emptySection}>
                  <Text style={styles.emptySectionText}>No announcements yet.</Text>
                </View>
              )
            }
          </View>
        )}

        {/* ── Announcements — coaches/admins see all sent ── */}
        {isCoachOrAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📢 Announcements</Text>
            <Text style={styles.sectionHint}>All announcements sent to students</Text>
            {coachAnnouncements.length > 0
              ? coachAnnouncements.map(renderCoachAnnouncement)
              : (
                <View style={styles.emptySection}>
                  <Text style={styles.emptySectionText}>No announcements sent yet.</Text>
                </View>
              )
            }
          </View>
        )}

        {/* ── Direct Messages ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔒 Direct Messages</Text>
          <Text style={styles.sectionHint}>Private — only you and your coach</Text>
          {direct.length > 0 ? direct.map(renderConv) : (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>No direct messages yet. Your coach can message you directly from your profile.</Text>
            </View>
          )}
        </View>

        {/* ── Division Channel ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏆 Division Channel</Text>
          <Text style={styles.sectionHint}>Everyone in your division</Text>
          {divisionGroup.length > 0 ? divisionGroup.map(renderDivisionConv) : (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>You haven't been assigned to a division yet.</Text>
            </View>
          )}
        </View>

        {/* ── Program Group Channels ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 Program Channels</Text>
          <Text style={styles.sectionHint}>All students + coaches in your program</Text>
          {groups.length > 0 ? groups.map(renderConv) : (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>Enroll in a program to join its group channel.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {isCoachOrAdmin && (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('NewConversation')}>
          <Text style={styles.fabIcon}>✏️</Text>
        </TouchableOpacity>
      )}

      {/* ── Announcement detail modal (legacy / notification-only) ── */}
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
              <Text style={styles.modalDate}>{selectedAnn ? formatTime(selectedAnn.created_at) : ''}</Text>
              <View style={styles.modalTypeBadge}>
                <Text style={styles.modalTypeBadgeText}>📢 Academy Announcement</Text>
              </View>
            </View>
            <Text style={styles.modalTitle}>{selectedAnn?.title}</Text>
            {selectedAnn?.body
              ? <Text style={styles.modalBodyText}>{selectedAnn.body}</Text>
              : <Text style={styles.modalEmpty}>No message body.</Text>
            }
          </ScrollView>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedAnn(null)}>
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
  section: { padding: 16, paddingBottom: 8 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  sectionHint: { fontSize: 12, color: '#9CA3AF', marginBottom: 10 },
  unreadBadge: { backgroundColor: '#EA580C', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  unreadBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },

  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#E5E7EB', gap: 12,
  },
  cardUnread: { borderColor: '#FED7AA', backgroundColor: '#FFFBF7' },

  folderCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 14, padding: 14, marginTop: 8,
    borderWidth: 1, borderColor: '#D1FAE5', gap: 12,
    shadowColor: '#16A34A', shadowOpacity: 0.06, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  folderAvatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  folderAvatarIcon: { fontSize: 24 },
  badge: { backgroundColor: '#16A34A', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, minWidth: 22, alignItems: 'center' },
  badgeEmpty: { backgroundColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, minWidth: 22, alignItems: 'center' },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  avatarGroup: { backgroundColor: '#ECFDF5' },
  avatarDivision: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  avatarAnnouncement: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' },
  avatarIcon: { fontSize: 22 },
  unreadDot: { position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#EA580C', borderWidth: 1.5, borderColor: '#FFFFFF' },

  info: { flex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convName: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1 },
  convNameUnread: { fontWeight: '700', color: '#111827' },
  time: { fontSize: 12, color: '#9CA3AF', marginLeft: 8 },
  lastMsg: { fontSize: 13, color: '#6B7280', marginTop: 3 },
  lastMsgEmpty: { fontSize: 13, color: '#D1D5DB', marginTop: 3, fontStyle: 'italic' },
  chevron: { fontSize: 20, color: '#D1D5DB', marginLeft: 4 },
  emptySection: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 10 },
  emptySectionText: { fontSize: 13, color: '#9CA3AF', lineHeight: 20 },
  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  fabIcon: { fontSize: 22 },

  // Modal
  modal: { flex: 1, backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  modalBody: { flex: 1, padding: 24 },
  modalMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalDate: { fontSize: 13, color: '#9CA3AF' },
  modalTypeBadge: { backgroundColor: '#FFF7ED', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  modalTypeBadgeText: { fontSize: 12, color: '#EA580C', fontWeight: '600' },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 16 },
  modalBodyText: { fontSize: 16, color: '#374151', lineHeight: 26 },
  modalEmpty: { fontSize: 14, color: '#9CA3AF', fontStyle: 'italic' },
  modalCloseBtn: { margin: 20, backgroundColor: '#16A34A', borderRadius: 14, padding: 16, alignItems: 'center' },
  modalCloseBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
