export type Division = 'amateur' | 'semi_pro' | 'pro' | 'junior_9_11' | 'junior_12_15' | 'junior_15_18'
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced'

export const DIVISIONS: Division[] = ['amateur', 'semi_pro', 'pro', 'junior_9_11', 'junior_12_15', 'junior_15_18']

export const DIVISION_LABELS: Record<Division, string> = {
  amateur: 'Amateur',
  semi_pro: 'Semi-Pro',
  pro: 'Pro',
  junior_9_11: 'Junior 9–11',
  junior_12_15: 'Junior 12–15',
  junior_15_18: 'Junior 15–18',
}

export const SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced']

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

// Full level label: shows "Amateur · Beginner" etc, or just "Semi-Pro"
export function getLevelLabel(division?: string | null, skillLevel?: string | null): string {
  if (!division) return '—'
  const divLabel = DIVISION_LABELS[division as Division] ?? division
  if (division === 'amateur' && skillLevel) {
    const lvlLabel = SKILL_LEVEL_LABELS[skillLevel as SkillLevel] ?? skillLevel
    return `${divLabel} · ${lvlLabel}`
  }
  return divLabel
}
