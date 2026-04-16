import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Dimensions} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Division, DIVISION_LABELS, DIVISION_COLORS } from '../../types';
import ScreenHeader from '../../components/common/ScreenHeader';

const ALL_DIVISIONS: Division[] = ['amateur', 'semi_pro', 'pro', 'junior_9_11', 'junior_12_15', 'junior_15_18'];

export default function BulkMessageScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [selectedDivisions, setSelectedDivisions] = useState<Division[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [estimatedCount, setEstimatedCount] = useState<number | null>(null);

  const toggleDivision = async (div: Division) => {
    const next = selectedDivisions.includes(div)
      ? selectedDivisions.filter(d => d !== div)
      : [...selectedDivisions, div];
    setSelectedDivisions(next);

    if (next.length === 0) { setEstimatedCount(null); return; }
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .in('division', next)
      .eq('role', 'student');
    setEstimatedCount(count ?? 0);
  };

  const selectAll = async () => {
    setSelectedDivisions(ALL_DIVISIONS);
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'student');
    setEstimatedCount(count ?? 0);
  };

  const handleSend = async () => {
    if (!title.trim()) { Alert.alert('Error', 'Please add a title'); return; }
    if (selectedDivisions.length === 0) { Alert.alert('Error', 'Select at least one division'); return; }

    const divLabels = selectedDivisions.map(d => DIVISION_LABELS[d]).join(', ');
    Alert.alert(
      'Send Announcement',
      `Send to ${estimatedCount ?? '?'} students in: ${divLabels}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send 🔔',
          onPress: async () => {
            setSending(true);
            const { data: students } = await supabase
              .from('profiles')
              .select('id')
              .in('division', selectedDivisions)
              .eq('role', 'student');

            if (!students?.length) {
              Alert.alert('No recipients', 'No students found in selected divisions.');
              setSending(false);
              return;
            }

            const notifications = students.map((s: { id: string }) => ({
              recipient_id: s.id,
              title: title.trim(),
              body: body.trim() || null,
              type: 'announcement',
              data: { sender_id: profile!.id, divisions: selectedDivisions },
            }));

            const { error } = await supabase.from('notifications').insert(notifications);
            setSending(false);

            if (error) { Alert.alert('Error', error.message); return; }

            Alert.alert('Sent! 🎉', `Announcement sent to ${students.length} students.`);
            setTitle('');
            setBody('');
            setSelectedDivisions([]);
            setEstimatedCount(null);
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container}>
        <ScreenHeader title="Bulk Message" />

        <View style={styles.content}>
          {/* Division selector */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Select Divisions</Text>
              <TouchableOpacity onPress={selectAll}>
                <Text style={styles.selectAll}>Select All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.divGrid}>
              {ALL_DIVISIONS.map(div => {
                const selected = selectedDivisions.includes(div);
                const color = DIVISION_COLORS[div];
                return (
                  <TouchableOpacity
                    key={div}
                    style={[
                      styles.divChip,
                      selected && { backgroundColor: color, borderColor: color },
                    ]}
                    onPress={() => toggleDivision(div)}
                  >
                    <Text style={[styles.divChipText, selected && styles.divChipTextActive]}>
                      {DIVISION_LABELS[div]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {estimatedCount !== null && (
              <View style={styles.recipientBadge}>
                <Text style={styles.recipientText}>
                  📨 {estimatedCount} student{estimatedCount !== 1 ? 's' : ''} will receive this
                </Text>
              </View>
            )}
          </View>

          {/* Message form */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Message</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Title (required)"
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              style={[styles.input, styles.textarea]}
              value={body}
              onChangeText={setBody}
              placeholder="Message body (optional)"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={5}
            />
          </View>

          {/* Preview */}
          {title.trim() !== '' && (
            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>📱 PREVIEW</Text>
              <View style={styles.previewBubble}>
                <Text style={styles.previewTitle}>{title}</Text>
                {body.trim() !== '' && <Text style={styles.previewBody}>{body}</Text>}
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.sendBtn, (sending || !title.trim() || selectedDivisions.length === 0) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={sending || !title.trim() || selectedDivisions.length === 0}
          >
            {sending
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={styles.sendBtnText}>🔔 Send to Selected Divisions</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16 },
  section: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  selectAll: { fontSize: 14, color: '#16A34A', fontWeight: '600' },
  divGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  divChip: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#F9FAFB' },
  divChipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  divChipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  recipientBadge: { backgroundColor: '#ECFDF5', borderRadius: 10, padding: 10, marginTop: 12 },
  recipientText: { fontSize: 13, color: '#16A34A', fontWeight: '600', textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 14, fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB', marginBottom: 10 },
  textarea: { height: 120, textAlignVertical: 'top' },
  previewCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  previewLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, marginBottom: 10 },
  previewBubble: { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, borderLeftWidth: 3, borderLeftColor: '#16A34A' },
  previewTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  previewBody: { fontSize: 14, color: '#374151' },
  sendBtn: { backgroundColor: '#16A34A', borderRadius: 14, padding: 18, alignItems: 'center', marginBottom: 32 },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
