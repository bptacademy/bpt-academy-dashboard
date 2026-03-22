import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Program, Module, StudentProgress, ProgramSession, Division, DIVISION_LABELS, DIVISION_COLORS } from '../../types';
import BackHeader from '../../components/common/BackHeader';

// Program price (you can move this to the DB later)
const PROGRAM_PRICE_GBP = 49.99;

export default function ProgramDetailScreen({ route, navigation }: any) {
  const { programId } = route.params;
  const { profile } = useAuth();
  const [program, setProgram] = useState<Program | null>(null);
  const [modules, setModules] = useState<(Module & { progress?: StudentProgress })[]>([]);
  const [sessions, setSessions] = useState<ProgramSession[]>([]);
  const [enrolled, setEnrolled] = useState(false);
  const [hasActiveEnrollment, setHasActiveEnrollment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    const [progRes, modulesRes, sessionsRes, enrollRes, activeEnrollRes] = await Promise.all([
      supabase.from('programs').select('*').eq('id', programId).single(),
      supabase.from('modules').select('*').eq('program_id', programId).order('order_index'),
      supabase.from('program_sessions').select('*').eq('program_id', programId).order('scheduled_at'),
      // Is this student enrolled in THIS program?
      supabase.from('enrollments').select('id').eq('student_id', profile!.id).eq('program_id', programId).single(),
      // Does this student have ANY active enrollment (in any program)?
      supabase.from('enrollments').select('id').eq('student_id', profile!.id).eq('status', 'active'),
    ]);

    if (progRes.data) setProgram(progRes.data);
    setEnrolled(!!enrollRes.data);
    setHasActiveEnrollment((activeEnrollRes.data?.length ?? 0) > 0);

    if (modulesRes.data) {
      const { data: progressData } = await supabase
        .from('student_progress')
        .select('*')
        .eq('student_id', profile!.id)
        .in('module_id', modulesRes.data.map((m) => m.id));

      const progressMap = new Map(progressData?.map((p) => [p.module_id, p]) ?? []);
      setModules(modulesRes.data.map((m) => ({ ...m, progress: progressMap.get(m.id) })));
    }

    if (sessionsRes.data) setSessions(sessionsRes.data);
    setLoading(false);
  };

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };
  useEffect(() => { fetchData(); }, [programId]);

  // Called by PaymentScreen after successful payment submission
  const handleEnrollAfterPayment = async () => {
    const { error } = await supabase.from('enrollments').insert({
      student_id: profile!.id,
      program_id: programId,
      status: 'active',
    });
    if (error) { Alert.alert('Error', error.message); return; }
    setEnrolled(true);
    Alert.alert('🎾 Enrolled!', 'You are now enrolled. Your payment is being confirmed by our team.');
    fetchData();
  };

  const handleEnrollPress = () => {
    // Block if already enrolled in another program
    if (hasActiveEnrollment && !enrolled) {
      Alert.alert(
        'Active Program Running',
        'You are already enrolled in an active program. You can only join a new one once your current program is complete.',
        [{ text: 'OK' }],
      );
      return;
    }

    // Navigate to payment; pass a callback-style flag via params
    navigation.navigate('Payment', {
      programId,
      amount: PROGRAM_PRICE_GBP,
      programDivision: divisionKey, // e.g. 'amateur' | 'semi_pro' | 'pro'
      onPaymentComplete: handleEnrollAfterPayment,
    });
  };

  const toggleModule = async (module: Module & { progress?: StudentProgress }) => {
    if (!enrolled) { Alert.alert('Not enrolled', 'Enroll in this program to track progress.'); return; }
    const isCompleted = module.progress?.completed ?? false;

    if (module.progress) {
      await supabase.from('student_progress')
        .update({ completed: !isCompleted, completed_at: !isCompleted ? new Date().toISOString() : null })
        .eq('id', module.progress.id);
    } else {
      await supabase.from('student_progress').insert({
        student_id: profile!.id,
        module_id: module.id,
        completed: true,
        completed_at: new Date().toISOString(),
      });
    }
    fetchData();
  };

  const completedCount = modules.filter((m) => m.progress?.completed).length;
  const pct = modules.length > 0 ? Math.round((completedCount / modules.length) * 100) : 0;

  // Build division badge label
  const divisionKey = ((program as any)?.division ?? 'amateur') as Division;
  const divisionColor = DIVISION_COLORS[divisionKey] ?? '#6B7280';
  const divisionLabel = DIVISION_LABELS[divisionKey] ?? divisionKey;
  const skillSub = program?.skill_level
    ? ` · ${program.skill_level.charAt(0).toUpperCase() + program.skill_level.slice(1)}`
    : '';

  if (loading) return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#16A34A" />
    </View>
  );

  if (!program) return (
    <View style={styles.loading}>
      <Text style={{ color: '#6B7280' }}>Program not found.</Text>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <BackHeader title={program?.title ?? 'Program'} />

      {/* Hero */}
      <View style={styles.hero}>
        <View style={[styles.levelBadge, { backgroundColor: divisionColor + '30' }]}>
          <Text style={[styles.levelText, { color: divisionColor }]}>
            {divisionLabel}{skillSub}
          </Text>
        </View>
        <Text style={styles.title}>{program.title}</Text>
        {program.description && <Text style={styles.description}>{program.description}</Text>}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaValue}>{program.duration_weeks ?? '—'}</Text>
            <Text style={styles.metaLabel}>Weeks</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaValue}>{modules.length}</Text>
            <Text style={styles.metaLabel}>Modules</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaValue}>{sessions.length}</Text>
            <Text style={styles.metaLabel}>Sessions</Text>
          </View>
        </View>
      </View>

      {/* Enroll / Progress */}
      {enrolled ? (
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Your Progress</Text>
            <Text style={styles.progressPct}>{pct}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.progressSub}>{completedCount} of {modules.length} modules complete</Text>
        </View>
      ) : hasActiveEnrollment ? (
        // Already in another program
        <View style={styles.blockedCard}>
          <Text style={styles.blockedIcon}>🔒</Text>
          <Text style={styles.blockedTitle}>Program Slot Unavailable</Text>
          <Text style={styles.blockedText}>
            You're already enrolled in an active program. Complete it before joining a new one.
          </Text>
        </View>
      ) : (
        // Available to enroll — must pay first
        <View style={styles.enrollCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Program Fee</Text>
            <Text style={styles.priceValue}>£{PROGRAM_PRICE_GBP.toFixed(2)}</Text>
          </View>
          <Text style={styles.enrollText}>
            Payment is required to confirm your enrollment. You'll be guided through the payment process first.
          </Text>
          <TouchableOpacity style={styles.enrollBtn} onPress={handleEnrollPress}>
            <Text style={styles.enrollBtnText}>Pay & Enroll — £{PROGRAM_PRICE_GBP.toFixed(2)}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modules */}
      {modules.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📚 Modules</Text>
          {modules.map((m, i) => (
            <TouchableOpacity
              key={m.id}
              style={styles.moduleCard}
              onPress={() => toggleModule(m)}
            >
              <View style={[styles.moduleCheck, m.progress?.completed && styles.moduleCheckDone]}>
                {m.progress?.completed
                  ? <Text style={styles.checkMark}>✓</Text>
                  : <Text style={styles.moduleNumber}>{i + 1}</Text>
                }
              </View>
              <View style={styles.moduleInfo}>
                <Text style={[styles.moduleName, m.progress?.completed && styles.moduleNameDone]}>
                  {m.title}
                </Text>
                {m.description && (
                  <Text style={styles.moduleDesc} numberOfLines={2}>{m.description}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Upcoming sessions */}
      {sessions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Upcoming Sessions</Text>
          {sessions.map((s) => (
            <View key={s.id} style={styles.sessionCard}>
              <View style={styles.sessionDate}>
                {s.scheduled_at ? (
                  <>
                    <Text style={styles.sessionDay}>
                      {new Date(s.scheduled_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </Text>
                    <Text style={styles.sessionTime}>
                      {new Date(s.scheduled_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.sessionDay}>TBA</Text>
                )}
              </View>
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionTitle}>{s.title}</Text>
                {s.location && <Text style={styles.sessionLocation}>📍 {s.location}</Text>}
                <Text style={styles.sessionDuration}>⏱ {s.duration_minutes} min</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  hero: { backgroundColor: '#FFFFFF', padding: 24, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  levelBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, marginBottom: 10 },
  levelText: { fontSize: 13, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8 },
  description: { fontSize: 15, color: '#6B7280', lineHeight: 22, marginBottom: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaItem: { flex: 1, alignItems: 'center' },
  metaValue: { fontSize: 20, fontWeight: '700', color: '#111827' },
  metaLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  metaDivider: { width: 1, height: 32, backgroundColor: '#E5E7EB' },

  // Enrolled — progress
  progressCard: { margin: 16, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  progressPct: { fontSize: 15, fontWeight: '700', color: '#16A34A' },
  progressBar: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: '#16A34A', borderRadius: 4 },
  progressSub: { fontSize: 13, color: '#6B7280' },

  // Blocked (already in another program)
  blockedCard: { margin: 16, backgroundColor: '#FFF7ED', borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#FED7AA' },
  blockedIcon: { fontSize: 36, marginBottom: 10 },
  blockedTitle: { fontSize: 16, fontWeight: '700', color: '#92400E', marginBottom: 6 },
  blockedText: { fontSize: 13, color: '#78350F', textAlign: 'center', lineHeight: 20 },

  // Enroll (payment required)
  enrollCard: { margin: 16, backgroundColor: '#ECFDF5', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: '#BBF7D0' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  priceLabel: { fontSize: 14, color: '#374151', fontWeight: '600' },
  priceValue: { fontSize: 22, fontWeight: '800', color: '#111827' },
  enrollText: { fontSize: 13, color: '#374151', marginBottom: 16, lineHeight: 20 },
  enrollBtn: { backgroundColor: '#16A34A', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 14, alignItems: 'center' },
  enrollBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

  section: { padding: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 12 },
  moduleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB', gap: 14 },
  moduleCheck: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  moduleCheckDone: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  checkMark: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  moduleNumber: { color: '#9CA3AF', fontSize: 13, fontWeight: '600' },
  moduleInfo: { flex: 1 },
  moduleName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  moduleNameDone: { color: '#9CA3AF', textDecorationLine: 'line-through' },
  moduleDesc: { fontSize: 13, color: '#6B7280', marginTop: 3 },
  sessionCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  sessionDate: { width: 70, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center', padding: 12 },
  sessionDay: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, textAlign: 'center' },
  sessionTime: { color: '#DCFCE7', fontSize: 12, marginTop: 2 },
  sessionInfo: { flex: 1, padding: 14 },
  sessionTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  sessionLocation: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  sessionDuration: { fontSize: 13, color: '#6B7280' },
});
