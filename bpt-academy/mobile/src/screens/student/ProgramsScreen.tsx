import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, Image, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ProgramTemplate, Division, DIVISION_LABELS, DIVISION_COLORS } from '../../types';
import ScreenHeader from '../../components/common/ScreenHeader';

const DIVISIONS: Division[] = ['amateur', 'semi_pro', 'pro'];

export default function ProgramsScreen({ navigation }: any) {
  useSafeAreaInsets();
  const tabBarPadding = useTabBarPadding();
  const { profile } = useAuth();

  const [templates, setTemplates] = useState<ProgramTemplate[]>([]);
  // template_id → a representative child-program id (for ProgramDetail navigation)
  const [repProgram, setRepProgram] = useState<Record<string, string>>({});
  const [enrolledTpl, setEnrolledTpl] = useState<string[]>([]);
  const [pendingTpl, setPendingTpl] = useState<string[]>([]);
  const [completedTpl, setCompletedTpl] = useState<string[]>([]);
  const [waitlistedTpl, setWaitlistedTpl] = useState<string[]>([]);
  // An incomplete (pre-capture) waitlist row needing the Option-A prompt.
  const [incompleteWaitlist, setIncompleteWaitlist] = useState<{ programId: string } | null>(null);
  const [activeEnrollmentExists, setActiveEnrollmentExists] = useState(false);
  const [filter, setFilter] = useState<Division | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const isCoachOrAdmin = ['coach', 'admin', 'super_admin'].includes(profile?.role ?? '');

  const isEligible = (t: ProgramTemplate): boolean => {
    if (isCoachOrAdmin) return true;
    const studentDiv = (profile as any)?.division ?? 'amateur';
    if (t.division !== studentDiv) return false;
    if (t.division === 'amateur') {
      const studentSkill = (profile as any)?.skill_level;
      if (t.skill_level && studentSkill && t.skill_level !== studentSkill) return false;
    }
    return true;
  };

  const fetchData = async () => {
    const [tplRes, progRes, enrollRes, pendingRes, completedRes, waitlistRes] = await Promise.all([
      supabase.from('program_templates').select('*').eq('is_active', true),
      supabase.from('programs').select('id, template_id, is_active').eq('is_active', true),
      supabase.from('enrollments').select('status, programs!inner(template_id)').eq('student_id', profile!.id).eq('status', 'active'),
      supabase.from('enrollments').select('programs!inner(template_id)').eq('student_id', profile!.id).in('status', ['pending_payment', 'pending_next_cycle']),
      supabase.from('enrollments').select('programs!inner(template_id)').eq('student_id', profile!.id).eq('status', 'completed'),
      supabase.from('program_waiting_list').select('template_id, program_id, availability').eq('student_id', profile!.id),
    ]);

    if (tplRes.data) setTemplates(tplRes.data as ProgramTemplate[]);

    // First child-program per template (used as the ProgramDetail representative).
    const rep: Record<string, string> = {};
    for (const p of (progRes.data ?? []) as any[]) {
      if (p.template_id && !rep[p.template_id]) rep[p.template_id] = p.id;
    }
    setRepProgram(rep);

    const tplIds = (rows: any[] | null) =>
      Array.from(new Set((rows ?? []).map((r: any) => r.programs?.template_id).filter(Boolean)));

    setEnrolledTpl(tplIds(enrollRes.data));
    setPendingTpl(tplIds(pendingRes.data));
    setCompletedTpl(tplIds(completedRes.data));
    setActiveEnrollmentExists((enrollRes.data?.length ?? 0) > 0);

    const wl = (waitlistRes.data ?? []) as any[];
    setWaitlistedTpl(Array.from(new Set(wl.map((r) => r.template_id).filter(Boolean))));
    const incomplete = wl.find((r) => r.availability == null && r.program_id);
    setIncompleteWaitlist(incomplete ? { programId: incomplete.program_id } : null);
  };

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };
  useEffect(() => { if (profile) fetchData(); }, [profile]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => { if (profile) fetchData(); });
    return unsub;
  }, [navigation, profile]);

  const openTemplate = (t: ProgramTemplate) => {
    const programId = repProgram[t.id];
    if (programId) navigation.navigate('ProgramDetail', { programId });
  };

  const eligible = templates.filter((t) =>
    isEligible(t) ||
    enrolledTpl.includes(t.id) || pendingTpl.includes(t.id) ||
    completedTpl.includes(t.id) || waitlistedTpl.includes(t.id)
  );
  // Only show templates that actually have a child-program to open.
  const visible = eligible.filter((t) => repProgram[t.id]);
  const filtered = filter === 'all' ? visible : visible.filter((t) => t.division === filter);

  return (
    <View style={styles.container}>
      <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: tabBarPadding }}
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ScreenHeader title="Programs" />

        {/* Option-A prompt for an existing waitlister who hasn't shared availability */}
        {incompleteWaitlist && (
          <TouchableOpacity
            style={styles.completeBanner}
            onPress={() => navigation.navigate('ProgramDetail', { programId: incompleteWaitlist.programId })}
          >
            <Text style={styles.completeBannerIcon}>📝</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.completeBannerTitle}>Complete your waiting-list details</Text>
              <Text style={styles.completeBannerBody}>
                Add your level, training days and contact so a coach can place you in a group.
              </Text>
            </View>
            <Text style={styles.completeBannerArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={styles.filtersContent}>
          <TouchableOpacity style={[styles.chip, filter === 'all' && styles.chipActive]} onPress={() => setFilter('all')}>
            <Text style={[styles.chipText, filter === 'all' && styles.chipTextActive]}>All</Text>
          </TouchableOpacity>
          {DIVISIONS.map((div) => (
            <TouchableOpacity
              key={div}
              style={[styles.chip, filter === div && { backgroundColor: DIVISION_COLORS[div], borderColor: DIVISION_COLORS[div] }]}
              onPress={() => setFilter(div)}
            >
              <Text style={[styles.chipText, filter === div && styles.chipTextActive]}>{DIVISION_LABELS[div]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.list}>
          {filtered.map((t) => {
            const enrolled = enrolledTpl.includes(t.id);
            const isPending = pendingTpl.includes(t.id);
            const isWaitlisted = waitlistedTpl.includes(t.id);
            const isCompleted = completedTpl.includes(t.id);
            const color = DIVISION_COLORS[t.division] ?? '#6B7280';
            const label = DIVISION_LABELS[t.division] ?? t.division;
            const sub = t.skill_level ? ` · ${t.skill_level.charAt(0).toUpperCase() + t.skill_level.slice(1)}` : '';

            return (
              <TouchableOpacity key={t.id} style={styles.card} onPress={() => openTemplate(t)}>
                <View style={styles.cardHeader}>
                  <View style={[styles.levelBadge, { backgroundColor: color + '20' }]}>
                    <Text style={[styles.levelText, { color }]}>{label}{sub}</Text>
                  </View>
                  {enrolled ? (
                    <View style={styles.enrolledBadge}><Text style={styles.enrolledText}>✓ Enrolled</Text></View>
                  ) : isPending ? (
                    <View style={styles.pendingBadge}><Text style={styles.pendingBadgeText}>⏳ Pending</Text></View>
                  ) : isWaitlisted ? (
                    <View style={styles.pendingBadge}><Text style={styles.pendingBadgeText}>📋 Waiting list</Text></View>
                  ) : isCompleted ? (
                    <View style={styles.completedBadge}><Text style={styles.completedBadgeText}>✓ Completed</Text></View>
                  ) : null}
                </View>

                <Text style={styles.cardTitle}>{t.title}</Text>
                {t.description ? <Text style={styles.cardDesc} numberOfLines={2}>{t.description}</Text> : null}

                <View style={styles.cardFooter}>
                  {t.price_gbp != null && Number(t.price_gbp) > 0
                    ? <Text style={styles.cardPrice}>£{Number(t.price_gbp).toFixed(2)}</Text>
                    : <Text style={styles.cardPriceFree}>Free</Text>}
                </View>

                {enrolled || isPending || isWaitlisted ? null : activeEnrollmentExists ? (
                  <View style={[styles.enrollButton, styles.enrollButtonLocked]}>
                    <Text style={styles.enrollButtonLockedText}>🔒 Already enrolled in a program</Text>
                  </View>
                ) : (
                  <View style={styles.enrollButton}>
                    <Text style={styles.enrollButtonText}>{isCompleted ? '🔄 Re-Join Waiting List' : 'Join Waiting List'}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {filtered.length === 0 && (
            <View style={styles.empty}><Text style={styles.emptyText}>No programs available for your level.</Text></View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1628' },
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  completeBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 4, backgroundColor: 'rgba(251,191,36,0.12)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(251,191,36,0.35)' },
  completeBannerIcon: { fontSize: 22 },
  completeBannerTitle: { fontSize: 14, fontWeight: '700', color: '#FBBF24', marginBottom: 2 },
  completeBannerBody: { fontSize: 12, color: '#D9C08A', lineHeight: 16 },
  completeBannerArrow: { fontSize: 24, color: '#FBBF24', fontWeight: '700' },
  filters: { backgroundColor: 'transparent' },
  filtersContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.08)' },
  chipActive: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  chipText: { fontSize: 13, color: '#A0B0C8', fontWeight: '500' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '600' },
  list: { padding: 16 },
  card: { backgroundColor: 'rgba(17,30,51,0.85)', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  levelText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  enrolledBadge: { backgroundColor: 'rgba(22,163,74,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  enrolledText: { fontSize: 12, fontWeight: '600', color: '#4ADE80' },
  pendingBadge: { backgroundColor: 'rgba(217,119,6,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pendingBadgeText: { fontSize: 12, fontWeight: '600', color: '#FBBF24' },
  completedBadge: { backgroundColor: 'rgba(99,102,241,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  completedBadgeText: { fontSize: 12, fontWeight: '600', color: '#A5B4FC' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#F0F6FC', marginBottom: 6 },
  cardDesc: { fontSize: 14, color: '#7A8FA6', lineHeight: 20, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  cardPrice: { fontSize: 15, fontWeight: '700', color: '#4ADE80' },
  cardPriceFree: { fontSize: 13, color: '#7A8FA6' },
  enrollButton: { backgroundColor: '#16A34A', borderRadius: 8, padding: 12, alignItems: 'center' },
  enrollButtonLocked: { backgroundColor: 'rgba(255,255,255,0.12)' },
  enrollButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  enrollButtonLockedText: { color: '#A0B0C8', fontWeight: '600', fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#7A8FA6', fontSize: 15 },
});
