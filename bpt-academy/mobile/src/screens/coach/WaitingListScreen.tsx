import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, Image, Dimensions,
} from 'react-native';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { supabase } from '../../lib/supabase';
import BackHeader from '../../components/common/BackHeader';

// Module-level set — survives screen unmount/remount within the same app session.
// Tracks waitlist entry IDs that have been approved or removed, so they're filtered
// out even if the DB delete hasn't completed yet when the screen remounts.
const actionedIds = new Set<string>();

type WaitlistEntry = {
  id: string;
  position: number;
  joined_at: string;
  month: string;
  student: { id: string; full_name: string; phone?: string };
};

export default function WaitingListScreen({ route, navigation }: any) {
  const { programId, programTitle } = route.params;
  const tabBarPadding = useTabBarPadding();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from('program_waiting_list')
      .select('id, position, joined_at, month, student:profiles!student_id(id, full_name, phone)')
      .eq('program_id', programId)
      .order('joined_at', { ascending: true });

    const filtered = ((data as any) ?? [])
      .filter((e: any) => !actionedIds.has(e.id))
      .map((e: any, i: number) => ({ ...e, position: i + 1 }));

    setEntries(filtered);
    setLoading(false);
  }, [programId]);

  // Re-fetch every time this screen comes into focus
  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleRemove = (entry: WaitlistEntry) => {
    Alert.alert(
      'Remove from Waiting List',
      `Remove ${entry.student.full_name} from the waiting list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            // Mark as actioned immediately — survives remount
            actionedIds.add(entry.id);
            setEntries(prev => prev.filter(e => e.id !== entry.id));
            const { error } = await supabase
              .from('program_waiting_list').delete().eq('id', entry.id);
            if (error) {
              // Revert if DB call failed
              actionedIds.delete(entry.id);
              Alert.alert('Error', error.message);
              fetchData();
            }
          },
        },
      ]
    );
  };

  const handleEnrol = (entry: WaitlistEntry) => {
    Alert.alert(
      'Enrol Student',
      `Enrol ${entry.student.full_name} directly into the program?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve', style: 'default',
          onPress: async () => {
            // Mark as actioned immediately — survives remount
            actionedIds.add(entry.id);
            setEntries(prev => prev.filter(e => e.id !== entry.id));

            const { error: deleteError } = await supabase
              .from('program_waiting_list').delete().eq('id', entry.id);
            if (deleteError) {
              actionedIds.delete(entry.id);
              Alert.alert('Error', deleteError.message);
              fetchData();
              return;
            }

            const { data: enrollData, error } = await supabase.from('enrollments').upsert({
              student_id: entry.student.id,
              program_id: programId,
              status: 'pending_payment',
            }, { onConflict: 'student_id,program_id' }).select('id').single();
            if (error) { Alert.alert('Error', error.message); return; }

            // Insert a pending payment row so it shows up in the Payments screen
            const { data: progData } = await supabase
              .from('programs').select('price_gbp').eq('id', programId).single();
            if (progData?.price_gbp && enrollData?.id) {
              const { data: existingPayment } = await supabase
                .from('payments').select('id').eq('enrollment_id', enrollData.id).maybeSingle();
              if (!existingPayment) {
                await supabase.from('payments').insert({
                  student_id: entry.student.id,
                  program_id: programId,
                  enrollment_id: enrollData.id,
                  amount_gbp: progData.price_gbp,
                  method: 'bank_transfer',
                  status: 'pending',
                });
              }
            }

            await supabase.from('notifications').insert({
              recipient_id: entry.student.id,
              title: 'Your spot has been approved! 🎉',
              body: `Great news! A coach has reviewed your level and approved your spot in ${programTitle}. Open the app to complete your payment and confirm your enrollment.`,
              type: 'waitlist_approved',
              read: false,
            });
          },
        },
      ]
    );
  };

  // Group entries by month
  const byMonth = entries.reduce<Record<string, WaitlistEntry[]>>((acc, e) => {
    if (!acc[e.month]) acc[e.month] = [];
    acc[e.month].push(e);
    return acc;
  }, {});

  const months = Object.keys(byMonth).sort().reverse();

  return (
    <View style={styles.container}>
      <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />
      <BackHeader title={`${programTitle ?? 'Program'} — Waiting List`} dark />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: tabBarPadding }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {!loading && entries.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyTitle}>No one on the waiting list</Text>
            <Text style={styles.emptyNote}>Students will appear here when they join the waiting list for this program.</Text>
          </View>
        )}

        {months.map((month) => (
          <View key={month} style={styles.monthSection}>
            <Text style={styles.monthLabel}>
              {new Date(month + '-01T12:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              <Text style={styles.monthCount}> · {byMonth[month].length} student{byMonth[month].length !== 1 ? 's' : ''}</Text>
            </Text>
            {byMonth[month].map((entry) => (
              <View key={entry.id} style={styles.card}>
                <View style={styles.positionBadge}>
                  <Text style={styles.positionText}>#{entry.position}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{entry.student.full_name}</Text>
                  <Text style={styles.meta}>
                    Joined {new Date(entry.joined_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                  {entry.student.phone ? (
                    <Text style={styles.phone}>📞 {entry.student.phone}</Text>
                  ) : null}
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.enrolBtn} onPress={() => handleEnrol(entry)}>
                    <Text style={styles.enrolBtnText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(entry)}>
                    <Text style={styles.removeBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  container: { flex: 1, backgroundColor: '#0B1628' },
  emptyCard: { alignItems: 'center', padding: 40, backgroundColor: 'rgba(17,30,51,0.85)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#F0F6FC', marginBottom: 6 },
  emptyNote: { fontSize: 13, color: '#7A8FA6', textAlign: 'center', lineHeight: 20 },
  monthSection: { marginBottom: 20 },
  monthLabel: { fontSize: 13, fontWeight: '700', color: '#7A8FA6', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  monthCount: { fontWeight: '400', color: '#7A8FA6' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(17,30,51,0.85)', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 12 },
  positionBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  positionText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#F0F6FC', marginBottom: 2 },
  meta: { fontSize: 12, color: '#7A8FA6' },
  phone: { fontSize: 12, color: '#7A8FA6', marginTop: 2 },
  actions: { flexDirection: 'column', gap: 6 },
  enrolBtn: { backgroundColor: '#16A34A', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center' },
  enrolBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  removeBtn: { backgroundColor: 'rgba(220,38,38,0.12)', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(220,38,38,0.25)' },
  removeBtnText: { color: '#EF4444', fontWeight: '600', fontSize: 12 },
});
