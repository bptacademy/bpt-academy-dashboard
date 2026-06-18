import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Image, Dimensions, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import BackHeader from '../../components/common/BackHeader';
import { WEEKDAYS, Availability, SkillLevel } from '../../types';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Row shape returned by recommend_students_for_program()
interface Recommendation {
  waitlist_id: string;
  student_id: string;
  full_name: string;
  level: SkillLevel | null;
  availability: Availability;
  age: number | null;
  phone: string | null;
  ranking_score: number | null;
  joined_at: string;
  waitlist_position: number | null;
  match_type: 'full' | 'partial';
  matched_days: number;
  required_days: number;
  score_in_band: boolean;
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
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Recommendation[]>([]);
  const [program, setProgram] = useState<{ price_gbp: number | null; current_cycle_start_date: string | null } | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const [rpc, progRes] = await Promise.all([
      supabase.rpc('recommend_students_for_program', { p_program_id: programId }),
      supabase.from('programs').select('price_gbp, current_cycle_start_date').eq('id', programId).single(),
    ]);
    if (rpc.error) setError(rpc.error.message);
    else setRows((rpc.data ?? []) as Recommendation[]);
    if (progRes.data) setProgram(progRes.data as any);
    setLoading(false);
  }, [programId]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  // Place a matched student into this group. Mirrors WaitingListScreen.handleEnrol:
  // enrollment (status by cycle date) + pending payment row (if priced) + notify,
  // then remove their waiting-list row. Actual session start is driven by the
  // existing promotion/cycle engine — untouched.
  const assign = (r: Recommendation) => {
    const cycleStart = program?.current_cycle_start_date ?? null;
    const startsNextCycle = !!cycleStart && todayStr() > cycleStart;
    const price = program?.price_gbp != null ? Number(program.price_gbp) : 0;
    const status = startsNextCycle ? 'pending_next_cycle' : 'pending_payment';

    Alert.alert(
      'Place in group',
      `Assign ${r.full_name?.trim() || 'this student'} to ${programTitle}?` +
        (startsNextCycle ? '\n\nThe cycle has already started — they’ll be enrolled for the next cycle.' : ''),
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Assign',
          onPress: async () => {
            setAssigningId(r.waitlist_id);
            try {
              const { data: enrollData, error: enrollErr } = await supabase
                .from('enrollments')
                .upsert({ student_id: r.student_id, program_id: programId, status }, { onConflict: 'student_id,program_id' })
                .select('id')
                .single();
              if (enrollErr) throw enrollErr;

              if (price > 0 && enrollData?.id) {
                const { data: existingPayment } = await supabase
                  .from('payments').select('id').eq('enrollment_id', enrollData.id).maybeSingle();
                if (!existingPayment) {
                  await supabase.from('payments').insert({
                    student_id: r.student_id,
                    program_id: programId,
                    enrollment_id: enrollData.id,
                    amount_gbp: price,
                    method: 'bank_transfer',
                    status: 'pending',
                  });
                }
              }

              await supabase.from('notifications').insert({
                recipient_id: r.student_id,
                title: 'Your spot has been approved! 🎉',
                body: `A coach has placed you in ${programTitle}.` +
                  (price > 0 ? ' Open the app to complete payment and confirm your enrollment.' : ''),
                type: 'waitlist_approved',
                read: false,
              });

              // Remove from the waiting list now that they're placed.
              await supabase.from('program_waiting_list').delete().eq('id', r.waitlist_id);

              setRows((prev) => prev.filter((x) => x.waitlist_id !== r.waitlist_id));
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Could not assign student.');
            } finally {
              setAssigningId(null);
            }
          },
        },
      ]
    );
  };

  const canAssign = ['coach', 'admin', 'super_admin'].includes(profile?.role ?? '');
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
          <Text style={styles.infoIcon}>🎯</Text>
          <Text style={styles.infoText}>
            Full fit = the player's days &amp; AM/PM match this group's exactly. Tap Assign to place them;
            they'll be removed from the waiting list and asked to confirm/pay.
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
                  <View style={styles.badgeGroup}>
                    {r.ranking_score != null && (
                      <View style={[styles.scoreBadge, !r.score_in_band && styles.scoreBadgeOut]}>
                        <Text style={[styles.scoreBadgeText, !r.score_in_band && styles.scoreBadgeTextOut]}>
                          {r.score_in_band ? '🏅' : '⚠️'} {Number(r.ranking_score)}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.badge, r.match_type === 'full' ? styles.badgeFull : styles.badgePartial]}>
                      <Text style={styles.badgeText}>
                        {r.match_type === 'full' ? 'Full fit' : `Partial ${r.matched_days}/${r.required_days}`}
                      </Text>
                    </View>
                  </View>
                </View>
                {!r.score_in_band && (
                  <Text style={styles.outOfBandNote}>Score outside this group's level band — shown lower.</Text>
                )}

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

                {canAssign && (
                  <TouchableOpacity
                    style={[styles.assignBtn, assigningId === r.waitlist_id && styles.assignBtnDisabled]}
                    onPress={() => assign(r)}
                    disabled={assigningId === r.waitlist_id}
                  >
                    {assigningId === r.waitlist_id
                      ? <ActivityIndicator color="#FFFFFF" size="small" />
                      : <Text style={styles.assignBtnText}>＋ Assign to group</Text>}
                  </TouchableOpacity>
                )}
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
  badgeGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeFull: { backgroundColor: '#16A34A' },
  badgePartial: { backgroundColor: 'rgba(251,191,36,0.25)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.5)' },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  scoreBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(59,130,246,0.2)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.45)' },
  scoreBadgeOut: { backgroundColor: 'rgba(239,68,68,0.18)', borderColor: 'rgba(239,68,68,0.5)' },
  scoreBadgeText: { fontSize: 11, fontWeight: '800', color: '#93C5FD' },
  scoreBadgeTextOut: { color: '#FCA5A5' },
  outOfBandNote: { fontSize: 11, color: '#FCA5A5', marginTop: -4, marginBottom: 8 },
  availRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  availChip: { backgroundColor: 'rgba(59,130,246,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)' },
  availChipText: { fontSize: 12, fontWeight: '600', color: '#60A5FA' },
  metaRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  metaText: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  assignBtn: { marginTop: 12, backgroundColor: '#16A34A', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  assignBtnDisabled: { opacity: 0.6 },
  assignBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  emptyCard: { backgroundColor: 'rgba(17,30,51,0.85)', borderRadius: 14, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  emptyText: { fontSize: 15, fontWeight: '700', color: '#F0F6FC', marginBottom: 6, textAlign: 'center' },
  emptySub: { fontSize: 13, color: '#7A8FA6', textAlign: 'center', lineHeight: 19 },
  retryBtn: { marginTop: 14, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#F0F6FC', fontWeight: '700' },
});
