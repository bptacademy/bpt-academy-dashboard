import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { computeSkillsScore } from '../lib/skillDefinitions';

export type SkillsScore = ReturnType<typeof computeSkillsScore>;

// The student's current coach-assessed level score (1–7), recomputed on focus
// so it tracks the latest re-assessments. Shared by Profile + Home + (logic
// mirrors) the Progress Skills tab.
export function useSkillsScore() {
  const { profile } = useAuth();
  const [score, setScore] = useState<SkillsScore | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) { setLoading(false); return; }
    const { data } = await supabase
      .from('skill_assessments')
      .select('skill_key, score, assessed_at')
      .eq('student_id', profile.id)
      .order('assessed_at', { ascending: false });

    // Keep only the latest score per skill.
    const seen = new Set<string>();
    const latest: { skill_key: string; score: number }[] = [];
    for (const row of (data ?? []) as any[]) {
      if (!seen.has(row.skill_key)) { seen.add(row.skill_key); latest.push({ skill_key: row.skill_key, score: row.score }); }
    }
    setScore(computeSkillsScore((profile as any).division, (profile as any).skill_level, latest));
    setLoading(false);
  }, [profile?.id, (profile as any)?.division, (profile as any)?.skill_level]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return { score, loading, reload: load };
}
