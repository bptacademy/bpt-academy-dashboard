import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function SendAnnouncementScreen({ navigation }: any) {
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title) { Alert.alert('Error', 'Please add a title'); return; }
    setSending(true);

    // Fetch all student IDs
    const { data: students } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'student');

    if (!students?.length) {
      Alert.alert('No students', 'There are no students to notify.');
      setSending(false);
      return;
    }

    // Create notifications for all students
    const notifications = students.map((s) => ({
      recipient_id: s.id,
      title,
      body,
      type: 'announcement',
      data: { sender_id: profile!.id },
    }));

    const { error } = await supabase.from('notifications').insert(notifications);
    setSending(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Sent! 🎉', `Announcement sent to ${students.length} student${students.length !== 1 ? 's' : ''}.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.title}>Send Announcement</Text>
          <Text style={styles.subtitle}>This will notify all students</Text>
        </View>

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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  inner: { padding: 24 },
  header: { marginTop: 20, marginBottom: 28 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
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
