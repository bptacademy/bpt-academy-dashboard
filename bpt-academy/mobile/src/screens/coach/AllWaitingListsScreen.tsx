import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, Image, Dimensions,
} from 'react-native';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { supabase } from '../../lib/supabase';
import BackHeader from '../../components/common/BackHeader';

type WaitlistEntry = {
  id: string;
  position: number;
  joined_at: string;
  month: string;
  program_id: string;
  student: { id: string; full_name: string; phone?: string };
};

type ProgramGroup = {
  programId: string;
  programTitle: string;
  entries: WaitlistEntry[];
};

export default function AllWaitingListsScreen({ navigation }: any) {
  const tabBarPadding = useTabBarPadding();
  const [groups, setGroups] = useState<ProgramGroup[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from('program_waiting_list')
      .select('id, position, joined_at, month, program_id, student:profiles!student_id(id, full_name, phone), program:programs!program_id(id, title)')
      .order('joined_at', { ascending: true });

    if (!data) { setLoading(false); return; }

    // Group by program
    const map = new Map<string, ProgramGroup>();
    for (const row of data as any[]) {
      const pid = row.program_id;
      const title = row.program?.title ?? 'Unknown Program';
      if (!map.has(pid)) map.set(pid, { programId: pid, programTitle: title, entries: [] });
      map.get(pid)!.entries.push({
        id: row.id,
        position: row.position,
        joined_at: row.joined_at,
        month: row.month,
        program_id: pid,
        student: row.student,
      });
    }

    const result = [...map.values()].sort((a, b) => b.entries.length - a.entries.length);
    setGroups(result);
    setTotalCount(data.length);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleApprove = (entry: WaitlistEntry, programTitle: string) => {
    Alert.alert(
      'Approve Student',
      `Approve ${entry.student.full_name} for ${programTitle}?\n\nThey will be notified to complete payment and confirm their enrollment.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve', style: 'default',
          onPress: async () => {
            const { error } = await supabase.from('enrollments').upsert({
              student_id: entry.student.id,
              program_id: entry.program_id,
              status: 'pending_payment',
            }, { onConflict: 'student_id,program_id' });
            if (error) { Alert.alert('Error', error.message); return; }
            await supabase.from('program_waiting_list').delete().eq('id', entry.id);
            await supabase.from('notifications').insert({
              recipient_id: entry.student.id,
              title: 'Your spot has been approved! 🎉',
              body: `Great news! A coach has reviewed your level and approved your spot in ${programTitle}. Open the app to complete your payment and confirm your enrollment.`,
              type: 'waitlist_approved',
              read: false,
            });
            fetchData();
            Alert.alert('Done', `${entry.student.full_name} has been approved and notified to pay.`);
          },
        },
      ]
    );
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
            await supabase.from('program_waiting_list').delete().eq('id', entry.id);
            fetchData();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />
      <BackHeader title="Waiting Lists" dark />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: tabBarPadding }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {!loading && totalCount === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyTitle}>No one on any waiting list</Text>
            <Text style={styles.emptyNote}>Students waiting to join programs will appear here.</Text>
          </View>
        )}

        {!loading && totalCount > 0 && (
          <Text style={styles.summaryText}>
            {totalCount} student{totalCount !== 1 ? 's' : ''} waiting across {groups.length} program{groups.length !== 1 ? 's' : ''}
          </Text>
        )}

        {groups.map((group) => (
          <View key={group.programId} style={styles.programSection}>
            <View style={styles.programHeader}>
              <Text style={styles.programTitle}>{group.programTitle}</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{group.entries.length}</Text>
              </View>
            </View>

            {group.entries.map((entry) => (
              <View key={entry.id} style={styles.card}>
                <View style={styles.positionBadge}>
                  <Text style={styles.positionText}>#{entry.position}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{entry.student.full_name}</Text>
                  <Text style={styles.meta}>
                    Joined {new Date(entry.joined_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}{entry.month}
                  </Text>
                  {entry.student.phone ? (
                    <Text style={styles.phone}>📞 {entry.student.phone}</Text>
                  ) : null}
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(entry, group.programTitle)}>
                    <Text style={styles.approveBtnText}>Approve</Text>
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
  summaryText: { fontSize: 13, color: '#7A8FA6', marginBottom: 16, textAlign: 'center' },
  emptyCard: { alignItems: 'center', padding: 40, backgroundColor: 'rgba(17,30,51,0.85)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#F0F6FC', marginBottom: 6 },
  emptyNote: { fontSize: 13, color: '#7A8FA6', textAlign: 'center', lineHeight: 20 },
  programSection: { marginBottom: 24 },
  programHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  programTitle: { fontSize: 15, fontWeight: '700', color: '#F0F6FC', flex: 1 },
  countBadge: { backgroundColor: '#3B82F6', borderRadius: 12, minWidth: 24, height: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  countBadgeText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(17,30,51,0.85)', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 12 },
  positionBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  positionText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#F0F6FC', marginBottom: 2 },
  meta: { fontSize: 12, color: '#7A8FA6' },
  phone: { fontSize: 12, color: '#7A8FA6', marginTop: 2 },
  actions: { flexDirection: 'column', gap: 6 },
  approveBtn: { backgroundColor: '#16A34A', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center' },
  approveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  removeBtn: { backgroundColor: 'rgba(220,38,38,0.12)', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(220,38,38,0.25)' },
  removeBtnText: { color: '#EF4444', fontWeight: '600', fontSize: 12 },
});
