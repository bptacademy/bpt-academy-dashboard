import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, Image, Dimensions} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import BackHeader from '../../components/common/BackHeader';
import BackButton from '../../components/common/BackButton';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: { full_name: string };
}

export default function ChatScreen({ route, navigation }: any) {
  const { conversationId, title, conversationType } = route.params;
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const tabBarPadding = useTabBarPadding();
  const [messages, setMessages]       = useState<Message[]>([]);
  const [text, setText]               = useState('');
  const [sending, setSending]         = useState(false);
  const [loading, setLoading]         = useState(true);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const flatListRef                   = useRef<FlatList>(null);
  const channelRef                    = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const isDivisionGroup = conversationType === 'division_group';
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'coach';

  // ── Fetch member count for division channels ───────────────────────────────
  useEffect(() => {
    if (!isDivisionGroup) return;
    supabase
      .from('conversation_members')
      .select('profile_id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .then(({ count }) => { if (count !== null) setMemberCount(count); });
  }, [conversationId, isDivisionGroup]);

  // ── Fetch all messages ─────────────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from('messages')
      .select('id, sender_id, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
    setLoading(false);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
  }, [conversationId]);

  // ── Real-time subscription ─────────────────────────────────────────────────
  const subscribeRealtime = useCallback(() => {
    if (channelRef.current) { channelRef.current.unsubscribe(); channelRef.current = null; }

    const channel = supabase
      .channel(`chat_${conversationId}_${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            const optimisticIdx = prev.findIndex(
              (m) => m.id.startsWith('optimistic_') && m.sender_id === newMsg.sender_id && m.content === newMsg.content
            );
            if (optimisticIdx !== -1) {
              const next = [...prev];
              next[optimisticIdx] = newMsg;
              return next;
            }
            return [...prev, newMsg];
          });
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const deleted = payload.old as { id: string };
          setMessages((prev) => prev.filter((m) => m.id !== deleted.id));
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') fetchMessages();
      });

    channelRef.current = channel;
  }, [conversationId, fetchMessages]);

  useEffect(() => {
    fetchMessages();
    subscribeRealtime();
    return () => { if (channelRef.current) { channelRef.current.unsubscribe(); channelRef.current = null; } };
  }, [conversationId]);

  useFocusEffect(useCallback(() => {
    fetchMessages();
    subscribeRealtime();
    return () => {};
  }, [fetchMessages, subscribeRealtime]));

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const content = text.trim();
    setText('');

    const optimisticMsg: Message = {
      id: `optimistic_${Date.now()}`,
      sender_id: profile!.id,
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    const { error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: profile!.id, content });

    if (error) { setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id)); setText(content); }
    setSending(false);
  };

  // ── Delete message (long-press) ────────────────────────────────────────────
  const handleLongPress = (item: Message) => {
    const isOwn = item.sender_id === profile?.id;
    if (!isOwn && !isAdmin) return; // only own messages or admin

    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('messages').delete().eq('id', item.id);
            setMessages((prev) => prev.filter((m) => m.id !== item.id));
          },
        },
      ]
    );
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.sender_id === profile?.id;
    const prevMsg = messages[index - 1];
    const showDate = !prevMsg ||
      new Date(item.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();

    return (
      <>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>
              {new Date(item.created_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
          </View>
        )}
        <TouchableOpacity
          onLongPress={() => handleLongPress(item)}
          delayLongPress={500}
          activeOpacity={0.85}
        >
          <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
            {!isMe && (
              <View style={styles.msgAvatar}>
                <Text style={styles.msgAvatarText}>
                  {(item.sender?.full_name ?? title ?? 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
              <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.content}</Text>
              <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
                {formatTime(item.created_at)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </>
    );
  };

  if (loading) return (
    <View style={styles.loading}>
      <BackButton />

      <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />
<ActivityIndicator size="large" color="#16A34A" /></View>
  );

  return (
    <View style={styles.container}>
      <BackHeader title={title ?? 'Chat'} />

      {isDivisionGroup && (
        <View style={styles.divisionBanner}>
          <Text style={styles.divisionBannerText}>
            🏆 Division Channel{memberCount !== null ? ` · ${memberCount} members` : ''}
          </Text>
        </View>
      )}

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
            </View>
          }
        />

        <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={1000}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!text.trim() || sending}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  divisionBanner: { backgroundColor: '#FFFBEB', borderBottomWidth: 1, borderBottomColor: '#FDE68A', paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center' },
  divisionBannerText: { fontSize: 13, color: '#92400E', fontWeight: '500' },
  messageList: { padding: 16, paddingBottom: 8 },
  dateSeparator: { alignItems: 'center', marginVertical: 16 },
  dateSeparatorText: { fontSize: 12, color: '#9CA3AF', backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8, gap: 8 },
  msgRowMe: { flexDirection: 'row-reverse' },
  msgAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#6B7280', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  msgAvatarText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  bubble: { maxWidth: '75%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe: { backgroundColor: '#16A34A', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E5E7EB' },
  bubbleText: { fontSize: 15, color: '#111827', lineHeight: 20 },
  bubbleTextMe: { color: '#FFFFFF' },
  bubbleTime: { fontSize: 11, color: '#9CA3AF', marginTop: 4, textAlign: 'right' },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.7)' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#9CA3AF', fontSize: 15 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 10, gap: 10, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  input: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#111827', maxHeight: 120, backgroundColor: '#F9FAFB' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendIcon: { color: '#FFFFFF', fontSize: 16 },
});
