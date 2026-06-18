import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Image, Dimensions, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { supabase } from '../../lib/supabase';
import BackHeader from '../../components/common/BackHeader';
import { WEEKDAYS, Availability, SkillLevel } from '../../types';

// Row shape returned by recommend_students_for_program()
interface Recommendation {
  waitlist_id: string;
  student_id: string;
  full_name: string;
  level: SkillLevel | null;
  availability: Availability;
  age: number | null;
  phone: string | null;
  joined_at: string;
  waitlist_position: number | null;
  match_type: 'full' | 'partial';
  matched_days: number;
  required_days: number;
}

function slotLabel(slot?: string): string {
  if (slot === 'morning') return 'AM';
  if (slot === 'afternoon') return 'PM';
  return '';
}

export default function RecommendedStudentsScreen({ route }: any) {
  const { programId, programTitle } = route.params;
  useSafeAreaInsets();
  const tabBarPadding = useTabBarPadding();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Recommendation[]>([]);

  const load = useCallback(async () => {
    setError(null);
    const { data, error } = await supabase.rpc('recommend_students_for_program', {
      p_program_id: programId,
    });
    if (error) setError(error.message);
    else setRows((data ?? []) as Recommendation[]);
    setLoading(false);
  }, [programId]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const fullCount = rows.filter((r) => r.match_type === 'full').length;

  return (
    <View style={styles.container}>
      <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />
      <BackHeader title="Recommended Students" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#FFFFFF" />}
      >
        <View style={styles.headerCard}>
          <Text style={styles.programTitle}>{programTitle}</Text>
          <Text style={styles.headerSub}>
            Waitlisted players ranked by how well their availability fits this group's days &amp; times.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>👀</Text>
          <Text style={styles.infoText}>
            Read-only for now — assigning players into the group arrives in the next step (M3).
          </Text>
        </View>

        {loading && rows.length === 0 ? (
          <ActivityIndicator color="#FFFFFF" style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Couldn't load recommendations.</Text>
            <Text style={styles.emptySub}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={load}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : rows.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No matching students yet.</Text>
            <Text style={styles.emptySub}>
              This needs a schedule on the group (set days &amp; times first) and waitlisters who have
              shared their availability for this level.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.countLine}>
              {rows.length} match{rows.length === 1 ? '' : 'es'} · {fullCount} full fit
            </Text>
            {rows.map((r) => (
              <View key={r.waitlist_id} style={styles.row}>
                <View style={styles.rowTop}>
                  <Text style={styles.name}>{r.full_name?.trim() || 'Unnamed'}</Text>
                  <View style={[styles.badge, r.match_type === 'full' ? styles.badgeFull : styles.badgePartial]}>
                    <Text style={styles.badgeText}>
                      {r.match_type === 'full' ? 'Full fit' : `Partial ${r.matched_days}/${r.required_days}`}
                    </Text>
                  </View>
                </View>

                <View style={styles.availRow}>
                  {WEEKDAYS.map((d) => {
                    const slot = r.availability?.[d.key];
                    if (!slot) return null;
                    return (
                      <View key={d.key} style={styles.availChip}>
                        <Text style={styles.availChipText}>{d.label} {slotLabel(slot)}</Text>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.metaRow}>
                  {r.level && <Text style={styles.metaText}>🎾 {r.level}</Text>}
                  {r.age != null && <Text style={styles.metaText}>🎂 {r.age}</Text>}
                  {r.phone && <Text style={styles.metaText}>📱 {r.phone}</Text>}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  container: { flex: 1, backgroundColor: '#0B1628' },
  content: { padding: 16 },
  headerCard: { backgroundColor: '#111827', borderRadius: 14, padding: 16, marginBottom: 12 },
  programTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 18 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(59,130,246,0.10)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(59,130,246,0.25)', marginBottom: 14 },
  infoIcon: { fontSize: 18 },
  infoText: { flex: 1, fontSize: 12, color: '#93C5FD', lineHeight: 17 },
  countLine: { fontSize: 12, color: '#7A8FA6', marginBottom: 10, fontWeight: '600' },
  row: { backgroundColor: 'rgba(17,30,51,0.85)', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  name: { fontSize: 16, fontWeight: '700', color: '#F0F6FC', flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeFull: { backgroundColor: '#16A34A' },
  badgePartial: { backgroundColor: 'rgba(251,191,36,0.25)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.5)' },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  availRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  availChip: { backgroundColor: 'rgba(59,130,246,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)' },
  availChipText: { fontSize: 12, fontWeight: '600', color: '#60A5FA' },
  metaRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  metaText: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  emptyCard: { backgroundColor: 'rgba(17,30,51,0.85)', borderRadius: 14, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  emptyText: { fontSize: 15, fontWeight: '700', color: '#F0F6FC', marginBottom: 6, textAlign: 'center' },
  emptySub: { fontSize: 13, color: '#7A8FA6', textAlign: 'center', lineHeight: 19 },
  retryBtn: { marginTop: 14, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#F0F6FC', fontWeight: '700' },
});
