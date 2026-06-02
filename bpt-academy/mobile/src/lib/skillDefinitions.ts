// ─── Skill Definitions ────────────────────────────────────────────────────────
// Cumulative: each level includes all skills from lower levels + its own.
// Score ranges are enforced per division in the UI.

export type SkillCategory = 'technique' | 'tactic' | 'others';
export type SkillDivision = 'beginner' | 'intermediate' | 'advanced' | 'semi_pro' | 'pro';

export interface SkillDef {
  key: string;
  label: string;
  category: SkillCategory;
  minLevel: SkillDivision; // first level this skill is assessed at
}

// Score range per division — coaches ONLY see sliders within this range
export const SCORE_RANGE: Record<SkillDivision, { min: number; max: number; step: number }> = {
  beginner:     { min: 1.0, max: 2.0, step: 0.5 },
  intermediate: { min: 2.0, max: 3.0, step: 0.5 },
  advanced:     { min: 3.0, max: 4.0, step: 0.5 },
  semi_pro:     { min: 4.0, max: 5.0, step: 0.5 },
  pro:          { min: 4.5, max: 5.0, step: 0.5 },
};

// Minimum passing score per division (to be considered "at level")
export const MIN_PASSING_SCORE: Record<SkillDivision, number> = {
  beginner:     1.0,
  intermediate: 2.0,
  advanced:     3.0,
  semi_pro:     4.0,
  pro:          5.0,
};

export const SKILLS: SkillDef[] = [
  // ── BEGINNER ──────────────────────────────────────────────────────────────
  // Technique
  { key: 'forehand_drive',         label: 'Forehand Drive',              category: 'technique', minLevel: 'beginner' },
  { key: 'backhand_drive',         label: 'Backhand Drive',              category: 'technique', minLevel: 'beginner' },
  { key: 'forehand_volley',        label: 'Forehand Volley',             category: 'technique', minLevel: 'beginner' },
  { key: 'backhand_volley',        label: 'Backhand Volley',             category: 'technique', minLevel: 'beginner' },
  { key: 'serve',                  label: 'Serve',                       category: 'technique', minLevel: 'beginner' },
  { key: 'return',                 label: 'Return',                      category: 'technique', minLevel: 'beginner' },
  // Tactic
  { key: 'court_positioning',      label: 'Court Positioning',           category: 'tactic',    minLevel: 'beginner' },
  { key: 'rally_consistency',      label: 'Rally Consistency',           category: 'tactic',    minLevel: 'beginner' },
  // Others
  { key: 'grip',                   label: 'Grip',                        category: 'others',    minLevel: 'beginner' },
  { key: 'footwork_basics',        label: 'Footwork Basics',             category: 'others',    minLevel: 'beginner' },
  { key: 'attitude_effort',        label: 'Attitude & Effort',           category: 'others',    minLevel: 'beginner' },

  // ── INTERMEDIATE ──────────────────────────────────────────────────────────
  // Technique
  { key: 'forehand_off_glass',     label: 'Forehand off the Glass',      category: 'technique', minLevel: 'intermediate' },
  { key: 'backhand_off_glass',     label: 'Backhand off the Glass',      category: 'technique', minLevel: 'intermediate' },
  { key: 'bandeja',                label: 'Bandeja',                     category: 'technique', minLevel: 'intermediate' },
  { key: 'vibora',                 label: 'Víbora',                      category: 'technique', minLevel: 'intermediate' },
  { key: 'lob',                    label: 'Lob',                         category: 'technique', minLevel: 'intermediate' },
  // Tactic
  { key: 'net_approach',           label: 'Net Approach',                category: 'tactic',    minLevel: 'intermediate' },
  { key: 'defensive_reset',        label: 'Defensive Reset',             category: 'tactic',    minLevel: 'intermediate' },
  { key: 'shot_selection',         label: 'Shot Selection',              category: 'tactic',    minLevel: 'intermediate' },
  // Others
  { key: 'movement_efficiency',    label: 'Movement Efficiency',         category: 'others',    minLevel: 'intermediate' },
  { key: 'match_temperament',      label: 'Match Temperament',           category: 'others',    minLevel: 'intermediate' },

  // ── ADVANCED ──────────────────────────────────────────────────────────────
  // Technique
  { key: 'backwall_shot',          label: 'Back Wall Shot',              category: 'technique', minLevel: 'advanced' },
  { key: 'smash_power',            label: 'Smash (Power)',               category: 'technique', minLevel: 'advanced' },
  { key: 'chiquita',               label: 'Chiquita',                    category: 'technique', minLevel: 'advanced' },
  { key: 'x3_off_glass',          label: 'X3 off the Glass',            category: 'technique', minLevel: 'advanced' },
  // Tactic
  { key: 'net_dominance',          label: 'Net Dominance',               category: 'tactic',    minLevel: 'advanced' },
  { key: 'lob_transition',         label: 'Lob & Transition',            category: 'tactic',    minLevel: 'advanced' },
  { key: 'pressure_patterns',      label: 'Pressure Patterns',           category: 'tactic',    minLevel: 'advanced' },
  // Others
  { key: 'physical_intensity',     label: 'Physical Intensity',          category: 'others',    minLevel: 'advanced' },
  { key: 'partner_communication',  label: 'Partner Communication',       category: 'others',    minLevel: 'advanced' },

  // ── SEMI-PRO ──────────────────────────────────────────────────────────────
  // Technique
  { key: 'bajada',                 label: 'Bajada',                      category: 'technique', minLevel: 'semi_pro' },
  { key: 'rulo',                   label: 'Rulo',                        category: 'technique', minLevel: 'semi_pro' },
  { key: 'serve_variations',       label: 'Serve Variations',            category: 'technique', minLevel: 'semi_pro' },
  // Tactic
  { key: 'third_ball_attack',      label: 'Third Ball Attack',           category: 'tactic',    minLevel: 'semi_pro' },
  { key: 'read_opponents',         label: 'Reading Opponents',           category: 'tactic',    minLevel: 'semi_pro' },
  { key: 'side_glass_exploitation',label: 'Side Glass Exploitation',     category: 'tactic',    minLevel: 'semi_pro' },
  // Others
  { key: 'tactical_awareness',     label: 'Tactical Awareness',          category: 'others',    minLevel: 'semi_pro' },
  { key: 'high_pressure_composure',label: 'Composure Under Pressure',    category: 'others',    minLevel: 'semi_pro' },

  // ── PRO ───────────────────────────────────────────────────────────────────
  // Technique
  { key: 'all_shots_consistency',  label: 'All Shots Consistency',       category: 'technique', minLevel: 'pro' },
  { key: 'shot_disguise',          label: 'Shot Disguise',               category: 'technique', minLevel: 'pro' },
  // Tactic
  { key: 'game_management',        label: 'Game Management',             category: 'tactic',    minLevel: 'pro' },
  { key: 'pattern_variation',      label: 'Pattern Variation',           category: 'tactic',    minLevel: 'pro' },
  // Others
  { key: 'competitive_mindset',    label: 'Competitive Mindset',         category: 'others',    minLevel: 'pro' },
  { key: 'leadership_on_court',    label: 'Leadership on Court',         category: 'others',    minLevel: 'pro' },
];

const LEVEL_ORDER: SkillDivision[] = ['beginner', 'intermediate', 'advanced', 'semi_pro', 'pro'];

// Get all skills applicable to a given division (cumulative)
export function getSkillsForDivision(division: SkillDivision): SkillDef[] {
  const idx = LEVEL_ORDER.indexOf(division);
  return SKILLS.filter(s => LEVEL_ORDER.indexOf(s.minLevel) <= idx);
}

// Map profile division + skill_level to SkillDivision
export function profileToSkillDivision(division?: string, skillLevel?: string): SkillDivision {
  if (division === 'semi_pro') return 'semi_pro';
  if (division === 'pro') return 'pro';
  if (division === 'amateur') {
    if (skillLevel === 'advanced') return 'advanced';
    if (skillLevel === 'intermediate') return 'intermediate';
    return 'beginner';
  }
  return 'beginner';
}

export const CATEGORY_LABELS: Record<SkillCategory, string> = {
  technique: '🎾 Technique',
  tactic:    '🧠 Tactic',
  others:    '⚙️ Others',
};
