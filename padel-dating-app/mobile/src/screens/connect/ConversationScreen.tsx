import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, FlatList, KeyboardAvoidingView, Platform,
  ActivityIndicator, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, fonts } from '../../lib/theme';
import { useAuth } from '../../context/AuthContext';
import { useConversation } from '../../hooks/useConversation';

const SERVE_PROMPTS = [
  'Rematch Saturday? 🎾',
  'Good game — always looking for strong players at your level',
  'That win rate though 👀',
  'In for Sunday at Carbon?',
];

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-GB', { weekday: 'short' });
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function ConversationScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { connectionId } = route.params ?? {};

  const { messages, info, loading, error, sendServe } = useConversation(connectionId);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const flatRef = useRef<FlatList>(null);

  const serveSent = messages.some(m => m.senderId === user?.id);

  // ID of the last message I sent that has been read — show receipt only there
  const lastReadMessageId = useMemo(() => {
    const myReadMessages = messages.filter(
      m => m.senderId === user?.id && m.readAt !== null
    );
    return myReadMessages.length > 0
      ? myReadMessages[myReadMessages.length - 1].id
      : null;
  }, [messages, user?.id]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [messages.length]);

  const handleSend = async (body: string) => {
    if (!body.trim() || sending) return;
    setSending(true);
    setInput('');
    try {
      await sendServe(body);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      console.error('sendServe error:', e);
    } finally {
      setSending(false);
    }
  };

  const otherInitials = info?.otherUserName
    ? info.otherUserName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const renderMessage = ({ item }: any) => {
    const isMe = item.senderId === user?.id;
    const showReadReceipt = isMe && item.id === lastReadMessageId;

    return (
      <View style={[styles.bubbleWrap, isMe ? styles.bubbleWrapMe : styles.bubbleWrapThem]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
            {item.body}
          </Text>
          <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeThem]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
        {showReadReceipt && (
          <Text style={styles.readReceipt}>✓✓ Read</Text>
        )}
      </View>
    );
  };

  return (
    <View style={{flex:1, backgroundColor:'transparent'}}>
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: 'transparent' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <View style={styles.headerAvatarWrapper}>
              {info?.otherUserPhoto ? (
                <Image
                  source={{ uri: info.otherUserPhoto }}
                  style={styles.headerAvatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.headerAvatarText}>{otherInitials}</Text>
              )}
            </View>
            <View>
              <Text style={styles.headerName}>
                {info?.otherUserName ?? '…'}
              </Text>
              <Text style={styles.headerSub}>
                {info?.matchedAt ? `Matched ${formatTime(info.matchedAt)}` : 'Matched'}
              </Text>
            </View>
          </View>
        </View>

        {/* Body */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : error ? (
          <View style={styles.loadingBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : (
          <>
            <FlatList
              ref={flatRef}
              data={messages}
              keyExtractor={item => item.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.messageList}
              onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
              ListHeaderComponent={
                <View style={styles.systemMsg}>
                  <Text style={styles.systemMsgText}>
                    🎾 You matched with {info?.otherUserName?.split(' ')[0] ?? 'them'}!
                  </Text>
                  <Text style={styles.systemMsgSub}>
                    Send your first Serve — a challenge, a compliment, or a simple hello.
                  </Text>
                </View>
              }
            />

            {/* Serve prompt chips — before first message */}
            {!serveSent && (
              <View style={styles.prompts}>
                <Text style={styles.promptsLabel}>Serve ideas:</Text>
                <View style={styles.promptChips}>
                  {SERVE_PROMPTS.map((p, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.promptChip}
                      onPress={() => setInput(p)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.promptChipText}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Input */}
            <View style={[styles.inputRow, { paddingBottom: insets.bottom + 8 }]}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder={serveSent ? 'Continue the rally…' : 'Send your Serve…'}
                placeholderTextColor={theme.textDim}
                multiline
                maxLength={500}
                onSubmitEditing={() => handleSend(input)}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
                onPress={() => handleSend(input)}
                disabled={!input.trim() || sending}
              >
                {sending
                  ? <ActivityIndicator color={theme.bg} size="small" />
                  : <Text style={styles.sendBtnText}>↑</Text>
                }
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.bgCard,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 23.5, color: theme.textSecondary, fontFamily: fonts.bodyLight },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  headerAvatarWrapper: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.primaryDim, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: theme.primaryBorder, overflow: 'hidden',
  },
  headerAvatarImage: { width: 40, height: 40 },
  headerAvatarText: { fontSize: 16, fontFamily: fonts.headlineBold, color: theme.primary },
  headerName: { fontSize: 17.1, fontFamily: fonts.bodyBold, color: theme.textPrimary },
  headerSub: { fontSize: 12.8, color: theme.textMuted, fontFamily: fonts.bodyLight },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 15, color: '#EF4444', fontFamily: fonts.bodyLight },

  messageList: { paddingHorizontal: 16, paddingVertical: 16, gap: 10 },

  systemMsg: {
    backgroundColor: theme.bgCard, borderRadius: 14, padding: 16,
    alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: theme.border,
  },
  systemMsgText: { fontSize: 16.1, fontFamily: fonts.bodyBold, color: theme.primary, marginBottom: 6 },
  systemMsgSub: { fontSize: 13.9, color: theme.textMuted, textAlign: 'center', lineHeight: 20, fontFamily: fonts.bodyLight },

  bubbleWrap: { marginVertical: 3 },
  bubbleWrapMe: { alignItems: 'flex-end' },
  bubbleWrapThem: { alignItems: 'flex-start' },

  bubble: {
    maxWidth: '75%', borderRadius: 18,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: theme.primary, borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: theme.bgCard, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: theme.border,
  },
  bubbleText: { fontSize: 16.1, lineHeight: 22, fontFamily: fonts.bodyLight },
  bubbleTextMe: { color: '#05020E' },
  bubbleTextThem: { color: theme.textPrimary },
  bubbleTime: { fontSize: 10.7, marginTop: 4, fontFamily: fonts.bodyLight },
  bubbleTimeMe: { color: 'rgba(13,27,42,0.6)', textAlign: 'right' },
  bubbleTimeThem: { color: theme.textDim },

  readReceipt: {
    fontSize: 11, color: theme.primary,
    fontFamily: fonts.bodyLight, marginTop: 3, marginRight: 2,
  },

  prompts: { paddingHorizontal: 16, paddingBottom: 10 },
  promptsLabel: { fontSize: 12.8, color: theme.textMuted, marginBottom: 8, fontFamily: fonts.bodyLight },
  promptChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  promptChip: {
    backgroundColor: theme.bgCard, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: theme.border,
  },
  promptChipText: { fontSize: 13.9, color: theme.textSecondary, fontFamily: fonts.bodyLight },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: theme.bgCard,
    backgroundColor: theme.bg,
  },
  input: {
    flex: 1, backgroundColor: theme.bgCard, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: theme.textPrimary,
    borderWidth: 1, borderColor: theme.border,
    maxHeight: 100, fontFamily: fonts.bodyLight,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.35 },
  sendBtnText: { fontSize: 20, color: '#05020E', fontFamily: fonts.headlineBold },
});
