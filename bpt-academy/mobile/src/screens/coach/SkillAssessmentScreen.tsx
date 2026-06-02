import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Image, Dimensions,
} from 'react-native';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import BackHeader from '../../components/common/BackHeader';
import {
  SKILLS, SCORE_RANGE, MIN_PASSING_SCORE, CATEGORY_LABELS,
  getSkillsForDivision, profileToSkillDivision,
  SkillDivision, SkillCategory, SkillDef,
} from '../../lib/skillDefinitions';
import { DIVISION_LABELS, DIVISION_COLORS } from '../../types';

const { width, height } = Dimensions.get('window');
const CATEGORIES: SkillCategory[] = ['technique', 'tactic', 'others'];

interface LatestScore { skill_key: string; score: number; assessed_at: string; }

export default function SkillAssessmentScreen({ navigation, route }: any) {
  const { studentId, studentName, studentDivision, studentSkillLevel } = route.params;
  const tabBarPadding = useTabBarPadding();
  const { profile } = useAuth();

  const skillDiv = profileToSkillDivision(studentDivision, studentSkillLevel);
  const range    = SCORE_RANGE;
  const skills   = getSkillsForDivision(skillDiv);
  const divColor = studentDivision ? DIVISION_COLORS[studentDivision as any] ?? '#3B82F6' : '#3B82F6';

  const [scores, setScores]     = useState<Record<string, number>>({});
  const [notes, setNotes]       = useState<Record<string, string>>({});
  const [latest, setLatest]     = useState<LatestScore[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState<Set<string>>(new Set());

  // Load latest scores for this student
  const loadLatest = useCallback(async () => {
    const { data } = await supabase
      .from('skill_assessments')
      .select('skill_key, score, assessed_at')
      .eq('student_id', studentId)
      .order('assessed_at', { ascending: false });

    if (data) {
      // Keep only most recent per skill
      const seen = new Set<string>();
      const latest: LatestScore[] = [];
      for (const row of data as any[]) {
        if (!seen.has(row.skill_key)) {
          seen.add(row.skill_key);
          latest.push(row);
        }
      }
      setLatest(latest);

      // Pre-fill score inputs with latest values
      const prefill: Record<string, number> = {};
      for (const l of latest) {
        prefill[l.skill_key] = l.score;
      }
      setScores(prefill);
    }
    setLoading(false);
  }, [studentId]);

  useEffect(() => { loadLatest(); }, [loadLatest]);

  const setScore = (key: string, val: number) => {
    const clamped = Math.min(range.max, Math.max(range.min, val));
    setScores(prev => ({ ...prev, [key]: clamped }));
  };

  const saveSkill = async (skill: SkillDef) => {
    const score = scores[skill.key];
    if (score === undefined) {
      Alert.alert('Score required', `Please set a score for ${skill.label}`);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('skill_assessments').insert({
      student_id: studentId,
      coach_id:   profile!.id,
      division:   skillDiv,
      skill_key:  skill.key,
      category:   skill.category,
      score,
      notes:      notes[skill.key] || null,
    });
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setSaved(prev => new Set(prev).add(skill.key));
      await loadLatest();
    }
    setSaving(false);
  };

  const saveAll = async () => {
    const toSave = skills.filter(s => scores[s.key] !== undefined);
    if (toSave.length === 0) {
      Alert.alert('No scores', 'Set at least one score before saving.');
      return;
    }
    Alert.alert(
      'Save All Scores',
      `Save ${toSave.length} skill assessment${toSave.length !== 1 ? 's' : ''} for ${studentName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save All', onPress: async () => {
          setSaving(true);
          const rows = toSave.map(s => ({
            student_id: studentId,
            coach_id:   profile!.id,
            division:   skillDiv,
            skill_key:  s.key,
            category:   s.category,
            score:      scores[s.key],
            notes:      notes[s.key] || null,
          }));
          const { error } = await supabase.from('skill_assessments').insert(rows);
          if (error) {
            Alert.alert('Error', error.message);
          } else {
            const newSaved = new Set(saved);
            toSave.forEach(s => newSaved.add(s.key));
            setSaved(newSaved);
            await loadLatest();
            Alert.alert('✅ Saved', `${toSave.length} skills assessed for ${studentName}`);
          }
          setSaving(false);
        }},
      ]
    );
  };

  const getLatestForSkill = (key: string) => latest.find(l => l.skill_key === key);

  const scoreColor = (score: number) => {
    const min = MIN_PASSING_SCORE[skillDiv];
    if (score >= min + 0.5) return '#16A34A';
    if (score >= min) return '#FBBF24';
    return '#EF4444';
  };

  // Score step buttons: show range.min to range.max in 0.5 increments
  const scoreSteps = () => {
    const steps = [];
    for (let v = range.min; v <= range.max; v += range.step) {
      steps.push(Math.round(v * 10) / 10);
    }
    return steps;
  };
  const steps = scoreSteps();

  if (loading) return (
    <View style={s.root}>
      <Image source={require('../../../assets/bg.png')} style={s.bg} resizeMode="cover" />
      <BackHeader title="Skill Assessment" />
      <ActivityIndicator color={divColor} style={{ marginTop: 60 }} />
    </View>
  );

  return (
    <View style={s.root}>
      <Image source={require('../../../assets/bg.png')} style={s.bg} resizeMode="cover" />
      <BackHeader title="Skill Assessment" />

      {/* Header */}
      <View style={[s.header, { borderBottomColor: divColor }]}>
        <View>
          <Text style={s.studentName}>{studentName}</Text>
          <Text style={[s.levelBadge, { color: divColor }]}>
            {skillDiv.replace('_', '-').toUpperCase()} · Score range: {range.min}–{range.max}
          </Text>
        </View>
        <TouchableOpacity
          style={[s.saveAllBtn, { backgroundColor: divColor }, saving && s.saveAllBtnDisabled]}
          onPress={saveAll}
          disabled={saving}
        >
          <Text style={s.saveAllBtnText}>{saving ? 'Saving…' : '💾 Save All'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: tabBarPadding + 20 }}>
        {CATEGORIES.map(cat => {
          const catSkills = skills.filter(s => s.category === cat);
          if (catSkills.length === 0) return null;
          return (
            <View key={cat} style={s.section}>
              <Text style={s.sectionTitle}>{CATEGORY_LABELS[cat]}</Text>
              {catSkills.map(skill => {
                const latestEntry = getLatestForSkill(skill.key);
                const currentScore = scores[skill.key];
                const isSaved = saved.has(skill.key);
                const min = MIN_PASSING_SCORE[skillDiv];

                return (
                  <View key={skill.key} style={s.skillCard}>
                    <View style={s.skillHeader}>
                      <Text style={s.skillLabel}>{skill.label}</Text>
                      {latestEntry && (
                        <View style={[s.latestBadge, { backgroundColor: `${scoreColor(latestEntry.score)}22` }]}>
                          <Text style={[s.latestBadgeText, { color: scoreColor(latestEntry.score) }]}>
                            Last: {latestEntry.score}
                          </Text>
                        </View>
                      )}
                      {isSaved && <Text style={s.savedMark}>✓ Saved</Text>}
                    </View>

                    {/* Score step selector */}
                    <View style={s.stepsRow}>
                      {steps.map(v => {
                        const active = currentScore === v;
                        const col = scoreColor(v);
                        return (
                          <TouchableOpacity
                            key={v}
                            style={[
                              s.stepBtn,
                              active && { backgroundColor: col, borderColor: col },
                            ]}
                            onPress={() => setScore(skill.key, v)}
                          >
                            <Text style={[s.stepBtnText, active && { color: '#fff', fontWeight: '800' }]}>
                              {v}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Min passing indicator */}
                    <Text style={s.minHint}>
                      Min for {skillDiv.replace('_', '-')}: <Text style={{ color: '#FBBF24' }}>{min}</Text>
                      {currentScore !== undefined && currentScore >= min
                        ? '  ✅'
                        : currentScore !== undefined
                        ? '  ❌ below level'
                        : ''}
                    </Text>

                    {/* Notes */}
                    <TextInput
                      style={s.notesInput}
                      placeholder="Add note (optional)…"
                      placeholderTextColor="#4B6070"
                      value={notes[skill.key] ?? ''}
                      onChangeText={v => setNotes(prev => ({ ...prev, [skill.key]: v }))}
                      multiline
                    />
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B1628' },
  bg: { position: 'absolute', top: 0, left: 0, width, height },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 2, backgroundColor: 'rgba(17,30,51,0.95)',
  },
  studentName: { fontSize: 18, fontWeight: '800', color: '#F0F6FC' },
  levelBadge: { fontSize: 12, fontWeight: '700', marginTop: 3 },
  saveAllBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  saveAllBtnDisabled: { opacity: 0.5 },
  saveAllBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#7A8FA6', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  skillCard: {
    backgroundColor: 'rgba(17,30,51,0.85)', borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  skillHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  skillLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: '#F0F6FC' },
  latestBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  latestBadgeText: { fontSize: 12, fontWeight: '700' },
  savedMark: { fontSize: 12, color: '#16A34A', fontWeight: '700' },
  stepsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  stepBtn: {
    width: 48, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.04)',
  },
  stepBtnText: { fontSize: 14, fontWeight: '600', color: '#F0F6FC' },
  minHint: { fontSize: 11, color: '#7A8FA6', marginBottom: 8 },
  notesInput: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 8,
    padding: 10, color: '#F0F6FC', fontSize: 13, minHeight: 36,
  },
});
