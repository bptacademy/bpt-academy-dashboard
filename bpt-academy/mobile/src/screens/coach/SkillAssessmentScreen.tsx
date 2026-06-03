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
  SCORE_RANGE, MIN_PASSING_SCORE, PROMOTION_TARGET_SCORE, CATEGORY_LABELS,
  getSkillsForDivision, profileToSkillDivision,
  SkillCategory, SkillDef,
} from '../../lib/skillDefinitions';
import { DIVISION_COLORS } from '../../types';

const { width, height } = Dimensions.get('window');
const CATEGORIES: SkillCategory[] = ['technique', 'tactic', 'others'];

const SCORE_STEPS: number[] = [];
for (let v = SCORE_RANGE.min; v <= SCORE_RANGE.max; v += SCORE_RANGE.step) {
  SCORE_STEPS.push(Math.round(v * 10) / 10);
}

interface LatestScore { skill_key: string; score: number; }

export default function SkillAssessmentScreen({ navigation, route }: any) {
  const { studentId, studentName, studentDivision, studentSkillLevel } = route.params;
  const tabBarPadding = useTabBarPadding();
  const { profile } = useAuth();

  const skillDiv = profileToSkillDivision(studentDivision, studentSkillLevel);
  const minPass  = MIN_PASSING_SCORE[skillDiv];
  const skills   = getSkillsForDivision(skillDiv);
  const divColor = studentDivision ? (DIVISION_COLORS[studentDivision as any] ?? '#3B82F6') : '#3B82F6';

  const [scores, setScores]   = useState<Record<string, number>>({});
  const [notes, setNotes]     = useState<Record<string, string>>({});
  const [latest, setLatest]   = useState<LatestScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState<Set<string>>(new Set());

  const loadLatest = useCallback(async () => {
    const { data } = await supabase
      .from('skill_assessments')
      .select('skill_key, score, assessed_at')
      .eq('student_id', studentId)
      .order('assessed_at', { ascending: false });
    if (data) {
      const seen = new Set<string>();
      const lst: LatestScore[] = [];
      for (const row of data as any[]) {
        if (!seen.has(row.skill_key)) { seen.add(row.skill_key); lst.push(row); }
      }
      setLatest(lst);
      const pre: Record<string, number> = {};
      lst.forEach(l => { pre[l.skill_key] = l.score; });
      setScores(pre);
    }
    setLoading(false);
  }, [studentId]);

  useEffect(() => { loadLatest(); }, [loadLatest]);

  const scoreColor = (score: number) => {
    if (score >= minPass + 1) return '#16A34A';
    if (score >= minPass) return '#FBBF24';
    return '#EF4444';
  };

  const saveAll = async () => {
    const toSave = skills.filter(s => scores[s.key] !== undefined);
    if (toSave.length === 0) { Alert.alert('No scores', 'Set at least one score before saving.'); return; }
    Alert.alert('Save All Scores', `Save ${toSave.length} assessment${toSave.length !== 1 ? 's' : ''} for ${studentName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Save All', onPress: async () => {
        setSaving(true);
        const rows = toSave.map(s => ({
          student_id: studentId, coach_id: profile!.id, division: skillDiv,
          skill_key: s.key, category: s.category, score: scores[s.key], notes: notes[s.key] || null,
        }));
        const { error } = await supabase.from('skill_assessments').insert(rows);
        if (error) { Alert.alert('Error', error.message); }
        else {
          const ns = new Set(saved); toSave.forEach(s => ns.add(s.key)); setSaved(ns);
          await loadLatest();
          Alert.alert('✅ Saved', `${toSave.length} skills assessed for ${studentName}`);
        }
        setSaving(false);
      }},
    ]);
  };

  const renderSkillCard = (skill: SkillDef) => {
    const currentScore = scores[skill.key];
    const latestEntry  = latest.find(l => l.skill_key === skill.key);
    const isSaved      = saved.has(skill.key);

    return (
      <View key={skill.key} style={s.skillCard}>
        {/* Skill name + badges */}
        <View style={s.skillHeaderRow}>
          <Text style={s.skillLabel} numberOfLines={2}>{skill.label}</Text>
          <View style={s.skillBadges}>
            {latestEntry && (
              <View style={[s.lastBadge, { backgroundColor: `${scoreColor(latestEntry.score)}22` }]}>
                <Text style={[s.lastBadgeText, { color: scoreColor(latestEntry.score) }]}>Last: {latestEntry.score}</Text>
              </View>
            )}
            {isSaved && <Text style={s.savedMark}>✓</Text>}
            {currentScore !== undefined && (
              <View style={[s.currentBadge, { backgroundColor: `${scoreColor(currentScore)}33`, borderColor: scoreColor(currentScore) }]}>
                <Text style={[s.currentBadgeText, { color: scoreColor(currentScore) }]}>
                  {currentScore % 1 === 0 ? currentScore.toFixed(0) : currentScore.toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Score buttons */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
          <View style={s.stepsRow}>
            {SCORE_STEPS.map(v => {
              const active = currentScore === v;
              const col    = scoreColor(v);
              return (
                <TouchableOpacity key={v}
                  style={[s.stepBtn, active && { backgroundColor: col, borderColor: col }]}
                  onPress={() => setScores(prev => ({ ...prev, [skill.key]: v }))}
                >
                  <Text style={[s.stepBtnText, active && { color: '#fff', fontWeight: '800' }]}>
                    {v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Min hint */}
        <Text style={s.minHint}>
          Min for {skillDiv.replace('_', '-')}: <Text style={{ color: '#FBBF24' }}>{minPass}</Text>
          {currentScore !== undefined ? (currentScore >= minPass ? '  ✅' : '  ❌') : ''}
        </Text>

        {/* Note */}
        <TextInput style={s.notesInput} placeholder="Note (optional)…" placeholderTextColor="#4B6070"
          value={notes[skill.key] ?? ''} onChangeText={v => setNotes(prev => ({ ...prev, [skill.key]: v }))} multiline />
      </View>
    );
  };

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

      {/* ── Summary bar ── */}
      {(() => {
        const targetScore = PROMOTION_TARGET_SCORE[skillDiv];
        const scoredEntries = latest.filter(l => scores[l.skill_key] !== undefined || l.score !== undefined);
        // Use current session scores where set, otherwise latest from DB
        const allScored = skills.map(sk => scores[sk.key] ?? latest.find(l => l.skill_key === sk.key)?.score).filter(v => v !== undefined) as number[];
        const avg = allScored.length > 0 ? parseFloat((allScored.reduce((a, b) => a + b, 0) / allScored.length).toFixed(1)) : null;
        const scoreCol = avg === null ? '#7A8FA6' : avg >= targetScore ? '#16A34A' : avg >= minPass ? '#FBBF24' : '#EF4444';
        return (
          <View style={[s.header, { borderBottomColor: divColor }]}>
            <View style={{ flex: 1 }}>
              <Text style={s.studentName}>{studentName}</Text>
              <Text style={[s.levelBadge, { color: divColor }]}>
                {skillDiv.replace('_', '-').toUpperCase()} · Min pass: {minPass} · Target: {targetScore}
              </Text>
              {avg !== null && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: scoreCol }}>{avg}</Text>
                  <Text style={{ fontSize: 12, color: '#7A8FA6' }}>avg / {allScored.length} skill{allScored.length !== 1 ? 's' : ''} · target {targetScore}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: scoreCol }}>{avg >= targetScore ? '✓' : avg >= minPass ? '~' : '✗'}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={[s.saveAllBtn, { backgroundColor: divColor }, saving && { opacity: 0.5 }]}
              onPress={saveAll} disabled={saving}>
              <Text style={s.saveAllBtnText}>{saving ? 'Saving…' : '💾 Save All'}</Text>
            </TouchableOpacity>
          </View>
        );
      })()}

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: tabBarPadding + 20 }}>
        {skills.length === 0 && (
          <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 24 }}>
            <Text style={{ fontSize: 40, marginBottom: 16 }}>⭐</Text>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#F0F6FC', marginBottom: 8, textAlign: 'center' }}>
              No skill definitions for this level
            </Text>
            <Text style={{ fontSize: 13, color: '#7A8FA6', textAlign: 'center', lineHeight: 20 }}>
              Level: {skillDiv.replace('_', '-').toUpperCase()}{"\n"}
              Make sure the student's division and skill level are set correctly on their profile.
            </Text>
          </View>
        )}
        {CATEGORIES.map(cat => {
          const catSkills = skills.filter(sk => sk.category === cat);
          if (catSkills.length === 0) return null;

          // For tactic: render skills grouped under their group header
          // For technique/others: render individually, no headers
          const rendered: React.ReactNode[] = [];

          if (cat === 'tactic') {
            let lastGroup: string | undefined = undefined;
            catSkills.forEach(skill => {
              if (skill.group && skill.group !== lastGroup) {
                lastGroup = skill.group;
                rendered.push(
                  <Text key={`group-${skill.group}-${skill.key}`} style={s.groupHeader}>
                    {skill.group}
                  </Text>
                );
              }
              rendered.push(renderSkillCard(skill));
            });
          } else {
            catSkills.forEach(skill => rendered.push(renderSkillCard(skill)));
          }

          return (
            <View key={cat} style={s.section}>
              <Text style={s.sectionTitle}>{CATEGORY_LABELS[cat]}</Text>
              {rendered}
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
  saveAllBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, marginLeft: 12 },
  saveAllBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#7A8FA6', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },

  groupHeader: {
    fontSize: 12, fontWeight: '900', color: '#3B82F6',
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginTop: 14, marginBottom: 6, paddingLeft: 2,
  },

  skillCard: {
    backgroundColor: 'rgba(17,30,51,0.85)', borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  skillHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 8 },
  skillLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#F0F6FC', lineHeight: 20 },
  skillBadges: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  lastBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  lastBadgeText: { fontSize: 11, fontWeight: '700' },
  savedMark: { fontSize: 12, color: '#16A34A', fontWeight: '800' },
  currentBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8, borderWidth: 1.5 },
  currentBadgeText: { fontSize: 13, fontWeight: '800' },

  stepsRow: { flexDirection: 'row', gap: 6, paddingBottom: 2 },
  stepBtn: {
    width: 44, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.04)',
  },
  stepBtnText: { fontSize: 13, fontWeight: '600', color: '#F0F6FC' },

  minHint: { fontSize: 11, color: '#7A8FA6', marginBottom: 8 },
  notesInput: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 8,
    padding: 10, color: '#F0F6FC', fontSize: 13, minHeight: 36,
  },
});
