import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform, Image, Dimensions} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import ScreenHeader from '../../components/common/ScreenHeader';

export default function SendAnnouncementScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const tabBarPadding = useTabBarPadding();
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title) { Alert.alert('Error', 'Please add a title'); return; }
    setSending(true);

    // Fetch all non-admin profiles to notify
    const { data: students } = await supabase
      .from('profiles')
      .select('id')
      .neq('id', profile!.id);

    if (!students?.length) {
      Alert.alert('No recipients', 'There are no users to notify yet.');
      setSending(false);
      return;
    }

    // 1. Create a conversation so the announcement is readable/archived
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({
        title,
        conversation_type: 'announcement',
        is_group: true,
        created_by: profile!.id,
      })
      .select()
      .single();

    if (convErr || !conv) {
      Alert.alert('Error', convErr?.message ?? 'Failed to create announcement');
      setSending(false);
      return;
    }

    const convId = (conv as any).id;

    // 2. Add all users as members so they can read the thread
    const members = [
      { conversation_id: convId, profile_id: profile!.id },
      ...students.map((s) => ({ conversation_id: convId, profile_id: s.id })),
    ];
    await supabase.from('conversation_members').insert(members);

    // 3. Post the announcement body as a message in the conversation
    if (body) {
      await supabase.from('messages').insert({
        conversation_id: convId,
        sender_id: profile!.id,
        content: body,
      });
    }

    // 4. Create notifications for all recipients (push/in-app)
    const notifications = students.map((s) => ({
      recipient_id: s.id,
      title,
      body,
      type: 'announcement',
      data: { sender_id: profile!.id, conversation_id: convId },
    }));
    await supabase.from('notifications').insert(notifications);

    setSending(false);
    Alert.alert('Sent! 🎉', `Announcement sent to ${students.length} student${students.length !== 1 ? 's' : ''}.`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner}>
        <ScreenHeader title="Announcement" />

        <View style={styles.form}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Court closed this weekend"
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.label}>Message</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={body}
            onChangeText={setBody}
            placeholder="Write your announcement here..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={6}
          />

          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>📱 Preview</Text>
            <Text style={styles.previewTitle}>{title || 'Announcement title'}</Text>
            {body ? <Text style={styles.previewBody}>{body}</Text> : null}
          </View>

          <TouchableOpacity
            style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={sending}
          >
            <Text style={styles.sendBtnText}>{sending ? 'Sending...' : '🔔 Send to All Students'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  inner: { padding: 24  paddingBottom: 80,},
  form: {},
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 14, fontSize: 16, color: '#111827', marginBottom: 20, backgroundColor: '#F9FAFB' },
  textarea: { height: 140, textAlignVertical: 'top' },
  previewCard: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#E5E7EB' },
  previewLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 8, fontWeight: '600', textTransform: 'uppercase' },
  previewTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  previewBody: { fontSize: 14, color: '#374151' },
  sendBtn: { backgroundColor: '#16A34A', borderRadius: 12, padding: 18, alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
