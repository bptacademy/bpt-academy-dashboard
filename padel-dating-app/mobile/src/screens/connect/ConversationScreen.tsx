import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, FlatList, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../lib/theme';

const SERVE_PROMPTS = [
  'Rematch Saturday? 🎾',
  'Good game last week — always looking for strong players at your level',
  'That win rate though 👀',
  'In for Sunday at Carbon?',
];

// Mock messages
const INITIAL_MESSAGES = [
  {
    id: '1', body: 'You matched with Sofia.',
    senderId: 'system', createdAt: '10:14',
  },
];

export default function ConversationScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [serveSent, setServeSent] = useState(false);
  const flatRef = useRef<FlatList>(null);

  const myId = 'me';

  const sendMessage = (body: string) => {
    if (!body.trim()) return;
    const newMsg = {
      id: Date.now().toString(),
      body: body.trim(),
      senderId: myId,
      createdAt: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setServeSent(true);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const renderMessage = ({ item }: any) => {
    if (item.senderId === 'system') {
      return (
        <View style={styles.systemMsg}>
          <Text style={styles.systemMsgText}>{item.body}</Text>
          <Text style={styles.systemMsgSub}>
            Send your first Serve — a challenge, a compliment, or a simple hello.
          </Text>
        </View>
      );
    }
    const isMe = item.senderId === myId;
    return (
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
        <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
          {item.body}
        </Text>
        <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeThem]}>
          {item.createdAt}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarEmoji}>🎾</Text>
            </View>
            <View>
              <Text style={styles.headerName}>Sofia</Text>
              <Text style={styles.headerSub}>Matched · Carbon Padel</Text>
            </View>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
        />

        {/* Serve prompt chips — shown before first message */}
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
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim()}
          >
            <Text style={styles.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
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
  backText: { fontSize: 22, color: theme.textSecondary },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  headerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.primaryDim, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: theme.primaryBorder,
  },
  headerAvatarEmoji: { fontSize: 18 },
  headerName: { fontSize: 16, fontWeight: '700', color: theme.textPrimary },
  headerSub: { fontSize: 12, color: theme.textMuted },

  messageList: { paddingHorizontal: 16, paddingVertical: 16, gap: 10 },

  systemMsg: {
    backgroundColor: theme.bgCard, borderRadius: 14, padding: 16,
    alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: theme.border,
  },
  systemMsgText: { fontSize: 15, fontWeight: '700', color: theme.primary, marginBottom: 6 },
  systemMsgSub: { fontSize: 13, color: theme.textMuted, textAlign: 'center', lineHeight: 20 },

  bubble: {
    maxWidth: '75%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, marginVertical: 3,
  },
  bubbleMe: { backgroundColor: theme.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: theme.bgCard, alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: theme.border },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextMe: { color: theme.bg, fontWeight: '500' },
  bubbleTextThem: { color: theme.textPrimary },
  bubbleTime: { fontSize: 10, marginTop: 4 },
  bubbleTimeMe: { color: 'rgba(13,27,42,0.6)', textAlign: 'right' },
  bubbleTimeThem: { color: theme.textDim },

  prompts: { paddingHorizontal: 16, paddingBottom: 10 },
  promptsLabel: { fontSize: 12, color: theme.textMuted, marginBottom: 8 },
  promptChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  promptChip: {
    backgroundColor: theme.bgCard, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: theme.border,
  },
  promptChipText: { fontSize: 13, color: theme.textSecondary },

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
    maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.35 },
  sendBtnText: { fontSize: 20, color: theme.bg, fontWeight: '800' },
});
