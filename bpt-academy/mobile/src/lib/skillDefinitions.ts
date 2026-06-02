// ─── Skill Definitions ────────────────────────────────────────────────────────
// TECHNIQUE & OTHERS: every item is an individual skill scored separately (no title grouping).
// TACTIC: grouped under titled blocks — coach scores the block as a whole.
//         Titles: CONSISTENCY & CONTROL | NET DOMINANCE |
//                 CREATION, DIRECTIONS, SPACE & TEMPO MANAGEMENT | GAME INTELLIGENCE
// Score range: 1–7, 0.5 increments, same for ALL levels.

export type SkillCategory = 'technique' | 'tactic' | 'others';
export type SkillDivision = 'beginner' | 'intermediate' | 'advanced' | 'semi_pro' | 'pro';

export interface SkillDef {
  key: string;
  label: string;    // For technique/others: the skill name. For tactic: the block title.
  goals: string[];  // For technique/others: empty []. For tactic: the bullet-point objectives.
  category: SkillCategory;
  minLevel: SkillDivision;
}

export const SCORE_RANGE = { min: 1.0, max: 7.0, step: 0.5 };

export const MIN_PASSING_SCORE: Record<SkillDivision, number> = {
  beginner:     2.0,
  intermediate: 3.0,
  advanced:     4.0,
  semi_pro:     5.0,
  pro:          6.0,
};

export const SKILLS: SkillDef[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // BEGINNER
  // ══════════════════════════════════════════════════════════════════════════

  // ── Technique (individual skills, no grouping) ──────────────────────────
  { key: 'beg_forehand',              label: 'Forehand',                   goals: [], category: 'technique', minLevel: 'beginner' },
  { key: 'beg_backhand',              label: 'Backhand',                   goals: [], category: 'technique', minLevel: 'beginner' },
  { key: 'beg_forehand_off_glass',    label: 'Forehand off the Glass',     goals: [], category: 'technique', minLevel: 'beginner' },
  { key: 'beg_backhand_off_glass',    label: 'Backhand off the Glass',     goals: [], category: 'technique', minLevel: 'beginner' },
  { key: 'beg_forehand_lob',          label: 'Forehand Lob',               goals: [], category: 'technique', minLevel: 'beginner' },
  { key: 'beg_backhand_lob',          label: 'Backhand Lob',               goals: [], category: 'technique', minLevel: 'beginner' },
  { key: 'beg_forehand_volley',       label: 'Forehand Volley',            goals: [], category: 'technique', minLevel: 'beginner' },
  { key: 'beg_backhand_volley',       label: 'Backhand Volley',            goals: [], category: 'technique', minLevel: 'beginner' },
  { key: 'beg_gancho',                label: 'Gancho',                     goals: [], category: 'technique', minLevel: 'beginner' },
  { key: 'beg_serve',                 label: 'Serve',                      goals: [], category: 'technique', minLevel: 'beginner' },
  { key: 'beg_return',                label: 'Return',                     goals: [], category: 'technique', minLevel: 'beginner' },

  // ── Tactic (titled blocks with goals) ───────────────────────────────────
  {
    key: 'beg_tac_consistency',
    label: 'CONSISTENCY & CONTROL',
    goals: ['Keeping the ball in game'],
    category: 'tactic', minLevel: 'beginner',
  },
  {
    key: 'beg_tac_net_dominance',
    label: 'NET DOMINANCE',
    goals: [
      'Transition (attack → defense) By a Lob',
      'Transition (defense → attack) By a Lob',
    ],
    category: 'tactic', minLevel: 'beginner',
  },

  // ── Others (individual) ─────────────────────────────────────────────────
  { key: 'beg_positioning_back', label: 'Positioning in the Back', goals: [], category: 'others', minLevel: 'beginner' },
  { key: 'beg_positioning_net',  label: 'Positioning at the Net',  goals: [], category: 'others', minLevel: 'beginner' },

  // ══════════════════════════════════════════════════════════════════════════
  // INTERMEDIATE
  // ══════════════════════════════════════════════════════════════════════════

  // ── Technique ────────────────────────────────────────────────────────────
  { key: 'int_bandeja_vibora',          label: 'Bandeja / Víbora',                              goals: [], category: 'technique', minLevel: 'intermediate' },
  { key: 'int_double_glass',            label: 'Double Glass',                                  goals: [], category: 'technique', minLevel: 'intermediate' },
  { key: 'int_bajada',                  label: 'Bajada',                                        goals: [], category: 'technique', minLevel: 'intermediate' },
  { key: 'int_defense_off_glass_cross', label: 'Defense off the Glass (Cross Court)',           goals: [], category: 'technique', minLevel: 'intermediate' },

  // ── Tactic ───────────────────────────────────────────────────────────────
  {
    key: 'int_tac_consistency',
    label: 'CONSISTENCY & CONTROL',
    goals: ['Generate the play from the center (avoid unnecessary angle risks)'],
    category: 'tactic', minLevel: 'intermediate',
  },
  {
    key: 'int_tac_net_dominance',
    label: 'NET DOMINANCE',
    goals: [
      'Maintain the net',
      'Shifting at the net (Coordinated movement at the net)',
    ],
    category: 'tactic', minLevel: 'intermediate',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ADVANCED
  // ══════════════════════════════════════════════════════════════════════════

  // ── Technique ────────────────────────────────────────────────────────────
  { key: 'adv_block',                  label: 'Block',                    goals: [], category: 'technique', minLevel: 'advanced' },
  { key: 'adv_smash',                  label: 'Smash',                    goals: [], category: 'technique', minLevel: 'advanced' },
  { key: 'adv_rulo',                   label: 'Rulo',                     goals: [], category: 'technique', minLevel: 'advanced' },
  { key: 'adv_fake_smash',             label: 'Fake Smash',               goals: [], category: 'technique', minLevel: 'advanced' },
  { key: 'adv_smash_return',           label: 'Smash Return',             goals: [], category: 'technique', minLevel: 'advanced' },
  { key: 'adv_defensive_bandeja_vib',  label: 'Defensive Bandeja / Víbora', goals: [], category: 'technique', minLevel: 'advanced' },
  { key: 'adv_chiquita',               label: 'Chiquita',                 goals: [], category: 'technique', minLevel: 'advanced' },

  // ── Tactic ───────────────────────────────────────────────────────────────
  {
    key: 'adv_tac_consistency',
    label: 'CONSISTENCY & CONTROL',
    goals: [
      'Know when to keep attacking one player or switch',
      'Improving the pace of our basic game',
    ],
    category: 'tactic', minLevel: 'advanced',
  },
  {
    key: 'adv_tac_net_dominance',
    label: 'NET DOMINANCE',
    goals: [
      'Transition (attack → defense) By a Passing shot',
      'Transition (defense → attack) Chiquita + Volley',
      'Maintain the net — Defensive Víbora',
    ],
    category: 'tactic', minLevel: 'advanced',
  },
  {
    key: 'adv_tac_creation',
    label: 'CREATION, DIRECTIONS, SPACE & TEMPO MANAGEMENT',
    goals: ['Generate an easy ball from the back'],
    category: 'tactic', minLevel: 'advanced',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SEMI-PRO & PRO
  // ══════════════════════════════════════════════════════════════════════════

  // ── Technique ────────────────────────────────────────────────────────────
  { key: 'sp_forehand_topspin',  label: 'Forehand with Top Spin',  goals: [], category: 'technique', minLevel: 'semi_pro' },
  { key: 'sp_backhand_topspin',  label: 'Backhand with Top Spin',  goals: [], category: 'technique', minLevel: 'semi_pro' },
  { key: 'sp_smash_x3',         label: 'Smash X3',                goals: [], category: 'technique', minLevel: 'semi_pro' },

  // ── Tactic ───────────────────────────────────────────────────────────────
  {
    key: 'sp_tac_consistency',
    label: 'CONSISTENCY & CONTROL',
    goals: [
      'Consistency of defensive game patterns — Patient (All lobs, All down, One up one down)',
    ],
    category: 'tactic', minLevel: 'semi_pro',
  },
  {
    key: 'sp_tac_net_dominance',
    label: 'NET DOMINANCE',
    goals: [
      'Transition (defense → attack) Fast Lob to the middle + Block',
      'Transition (defense → attack) High Lob to the corner + Chiquita + Volley',
    ],
    category: 'tactic', minLevel: 'semi_pro',
  },
  {
    key: 'sp_tac_creation',
    label: 'CREATION, DIRECTIONS, SPACE & TEMPO MANAGEMENT',
    goals: [
      'Create spaces (angles, middle, deep lobs, chiquitas)',
      'Aim for the high backhand volley',
      'Cut time on rivals (reduce opponent\'s reaction window)',
      'Variation of speeds and directions (fast ball, slow under the net)',
      'Types and directions of the lob (Fast / High) (Middle / Corners)',
      'Directions of the víbora (Side, Feet, Middle, Down the line)',
      'Play to the player / Avoid the player',
    ],
    category: 'tactic', minLevel: 'semi_pro',
  },
  {
    key: 'sp_tac_game_intelligence',
    label: 'GAME INTELLIGENCE',
    goals: [
      'Knowing when to break the pattern in defense (All down, All lob, One up one down)',
      'Hiding the shot — same preparation (Triple Threat, Rulo/Smash, Víbora vs Flat Smash, Gancho to the fence or Víbora)',
      'Adaptation of the game based on opponent\'s characteristics',
    ],
    category: 'tactic', minLevel: 'semi_pro',
  },
];

const LEVEL_ORDER: SkillDivision[] = ['beginner', 'intermediate', 'advanced', 'semi_pro', 'pro'];

export function getSkillsForDivision(division: SkillDivision): SkillDef[] {
  const idx = LEVEL_ORDER.indexOf(division);
  return SKILLS.filter(s => LEVEL_ORDER.indexOf(s.minLevel) <= idx);
}

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
