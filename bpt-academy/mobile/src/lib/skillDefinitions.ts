// ─── Skill Definitions ────────────────────────────────────────────────────────
// Each skill has a title (what the coach scores) and goals (descriptive context).
// Score range is 1–7 for ALL levels, 0.5 increments.
// Min passing score per level is a reference indicator only.

export type SkillCategory = 'technique' | 'tactic' | 'others';
export type SkillDivision = 'beginner' | 'intermediate' | 'advanced' | 'semi_pro' | 'pro';

export interface SkillDef {
  key: string;
  label: string;       // Title shown on card e.g. "CONSISTENCY & CONTROL"
  goals: string[];     // Bullet points shown under the title
  category: SkillCategory;
  minLevel: SkillDivision;
}

// Score range 1–7 for ALL levels, 0.5 increments
export const SCORE_RANGE = { min: 1.0, max: 7.0, step: 0.5 };

// Minimum expected score per division (reference only)
export const MIN_PASSING_SCORE: Record<SkillDivision, number> = {
  beginner:     2.0,
  intermediate: 3.0,
  advanced:     4.0,
  semi_pro:     5.0,
  pro:          6.0,
};

export const SKILLS: SkillDef[] = [

  // ────────────────────────────────────────────────────────────────────────────
  // BEGINNER
  // ────────────────────────────────────────────────────────────────────────────

  // Technique
  {
    key: 'beg_forehand', label: 'FOREHAND', category: 'technique', minLevel: 'beginner',
    goals: ['Forehand'],
  },
  {
    key: 'beg_backhand', label: 'BACKHAND', category: 'technique', minLevel: 'beginner',
    goals: ['Backhand'],
  },
  {
    key: 'beg_forehand_off_glass', label: 'FOREHAND OFF THE GLASS', category: 'technique', minLevel: 'beginner',
    goals: ['Forehand off the glass'],
  },
  {
    key: 'beg_backhand_off_glass', label: 'BACKHAND OFF THE GLASS', category: 'technique', minLevel: 'beginner',
    goals: ['Backhand off the glass'],
  },
  {
    key: 'beg_lobs', label: 'LOBS', category: 'technique', minLevel: 'beginner',
    goals: ['Forehand Lob', 'Backhand Lob'],
  },
  {
    key: 'beg_volleys', label: 'VOLLEYS', category: 'technique', minLevel: 'beginner',
    goals: ['Forehand Volley', 'Backhand Volley'],
  },
  {
    key: 'beg_gancho', label: 'GANCHO', category: 'technique', minLevel: 'beginner',
    goals: ['Gancho'],
  },
  {
    key: 'beg_serve', label: 'SERVE', category: 'technique', minLevel: 'beginner',
    goals: ['Serve'],
  },
  {
    key: 'beg_return', label: 'RETURN', category: 'technique', minLevel: 'beginner',
    goals: ['Return'],
  },

  // Tactic
  {
    key: 'beg_consistency_control', label: 'CONSISTENCY & CONTROL', category: 'tactic', minLevel: 'beginner',
    goals: ['Keeping the ball in game'],
  },
  {
    key: 'beg_net_dominance', label: 'NET DOMINANCE', category: 'tactic', minLevel: 'beginner',
    goals: [
      'Transition (attack → defense) By a Lob',
      'Transition (defense → attack) By a Lob',
    ],
  },

  // Others
  {
    key: 'beg_positioning', label: 'POSITIONING', category: 'others', minLevel: 'beginner',
    goals: ['Positioning in the back', 'Positioning at the net'],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // INTERMEDIATE
  // ────────────────────────────────────────────────────────────────────────────

  // Technique
  {
    key: 'int_bandeja_vibora', label: 'BANDEJA / VÍBORA', category: 'technique', minLevel: 'intermediate',
    goals: ['Bandeja / Víbora'],
  },
  {
    key: 'int_double_glass', label: 'DOUBLE GLASS', category: 'technique', minLevel: 'intermediate',
    goals: ['Double glass'],
  },
  {
    key: 'int_bajada', label: 'BAJADA', category: 'technique', minLevel: 'intermediate',
    goals: ['Bajada'],
  },
  {
    key: 'int_defense_off_glass_cross', label: 'DEFENSE OFF THE GLASS', category: 'technique', minLevel: 'intermediate',
    goals: ['Defense off the glass when the ball comes cross court'],
  },

  // Tactic
  {
    key: 'int_consistency_control', label: 'CONSISTENCY & CONTROL', category: 'tactic', minLevel: 'intermediate',
    goals: ['Generate the play from the center (avoid unnecessary angle risks)'],
  },
  {
    key: 'int_net_dominance', label: 'NET DOMINANCE', category: 'tactic', minLevel: 'intermediate',
    goals: [
      'Maintain the net',
      'Shifting at the net (Coordinated movement at the net)',
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // ADVANCED
  // ────────────────────────────────────────────────────────────────────────────

  // Technique
  {
    key: 'adv_block', label: 'BLOCK', category: 'technique', minLevel: 'advanced',
    goals: ['Block'],
  },
  {
    key: 'adv_smash', label: 'SMASH', category: 'technique', minLevel: 'advanced',
    goals: ['Smash', 'Fake Smash', 'Smash Return'],
  },
  {
    key: 'adv_rulo', label: 'RULO', category: 'technique', minLevel: 'advanced',
    goals: ['Rulo'],
  },
  {
    key: 'adv_defensive_bandeja_vibora', label: 'DEFENSIVE BANDEJA / VÍBORA', category: 'technique', minLevel: 'advanced',
    goals: ['Defensive Bandeja / Víbora'],
  },
  {
    key: 'adv_chiquita', label: 'CHIQUITA', category: 'technique', minLevel: 'advanced',
    goals: ['Chiquita'],
  },

  // Tactic
  {
    key: 'adv_consistency_control', label: 'CONSISTENCY & CONTROL', category: 'tactic', minLevel: 'advanced',
    goals: [
      'Know when to keep attacking one player or switch',
      'Improving the pace of our basic game',
    ],
  },
  {
    key: 'adv_net_dominance', label: 'NET DOMINANCE', category: 'tactic', minLevel: 'advanced',
    goals: [
      'Transition (attack → defense) By a Passing shot',
      'Transition (defense → attack) Chiquita + Volley',
      'Maintain the net — Defensive Víbora',
    ],
  },
  {
    key: 'adv_creation', label: 'CREATION, DIRECTIONS, SPACE & TEMPO MANAGEMENT', category: 'tactic', minLevel: 'advanced',
    goals: ['Generate an easy ball from the back'],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // SEMI-PRO & PRO
  // ────────────────────────────────────────────────────────────────────────────

  // Technique
  {
    key: 'sp_topspin', label: 'TOP SPIN', category: 'technique', minLevel: 'semi_pro',
    goals: ['Forehand with top spin', 'Backhand with top spin'],
  },
  {
    key: 'sp_smash_x3', label: 'SMASH X3', category: 'technique', minLevel: 'semi_pro',
    goals: ['Smash X3'],
  },

  // Tactic
  {
    key: 'sp_consistency_control', label: 'CONSISTENCY & CONTROL', category: 'tactic', minLevel: 'semi_pro',
    goals: [
      'Consistency of defensive game patterns — Patient (All lobs, All down, One up one down)',
    ],
  },
  {
    key: 'sp_net_dominance', label: 'NET DOMINANCE', category: 'tactic', minLevel: 'semi_pro',
    goals: [
      'Transition (defense → attack) Fast Lob to the middle + Block',
      'Transition (defense → attack) High Lob to the corner + Chiquita + Volley',
    ],
  },
  {
    key: 'sp_creation', label: 'CREATION, DIRECTIONS, SPACE & TEMPO MANAGEMENT', category: 'tactic', minLevel: 'semi_pro',
    goals: [
      'Create spaces (angles, middle, deep lobs, chiquitas)',
      'Aim for the high backhand volley',
      'Cut time on rivals (reduce opponent\'s reaction window)',
      'Variation of speeds and directions (fast ball, slow under the net)',
      'Types and directions of the lob (Fast / High) (Middle / Corners)',
      'Directions of the víbora (Side, Feet, Middle, Down the line)',
      'Play to the player / Avoid the player',
    ],
  },
  {
    key: 'sp_game_intelligence', label: 'GAME INTELLIGENCE', category: 'tactic', minLevel: 'semi_pro',
    goals: [
      'Knowing when to break the pattern in defense (All down, All lob, One up one down)',
      'Hiding the shot — same preparation (Triple Threat, Rulo/Smash, Víbora vs Flat Smash, Gancho to the fence or Víbora)',
      'Adaptation of the game based on opponent\'s characteristics',
    ],
  },
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
