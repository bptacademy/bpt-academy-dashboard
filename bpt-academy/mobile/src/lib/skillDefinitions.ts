// ─── Skill Definitions ────────────────────────────────────────────────────────
// Every single skill is scored individually (1–7, 0.5 increments).
// Tactic skills have a `group` label (e.g. "CONSISTENCY & CONTROL") used as
// a visual section header — not a scored item itself.
// Technique & Others have no group.

export type SkillCategory = 'technique' | 'tactic' | 'others';
export type SkillDivision = 'beginner' | 'intermediate' | 'advanced' | 'semi_pro' | 'pro';

export interface SkillDef {
  key: string;
  label: string;           // The individual skill name shown on its score card
  group?: string;          // Tactic only: visual section header (e.g. "NET DOMINANCE")
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

  // Technique — individual, no group
  { key: 'beg_forehand',           label: 'Forehand',                category: 'technique', minLevel: 'beginner' },
  { key: 'beg_backhand',           label: 'Backhand',                category: 'technique', minLevel: 'beginner' },
  { key: 'beg_fh_off_glass',       label: 'Forehand off the Glass',  category: 'technique', minLevel: 'beginner' },
  { key: 'beg_bh_off_glass',       label: 'Backhand off the Glass',  category: 'technique', minLevel: 'beginner' },
  { key: 'beg_fh_lob',             label: 'Forehand Lob',            category: 'technique', minLevel: 'beginner' },
  { key: 'beg_bh_lob',             label: 'Backhand Lob',            category: 'technique', minLevel: 'beginner' },
  { key: 'beg_fh_volley',          label: 'Forehand Volley',         category: 'technique', minLevel: 'beginner' },
  { key: 'beg_bh_volley',          label: 'Backhand Volley',         category: 'technique', minLevel: 'beginner' },
  { key: 'beg_gancho',             label: 'Gancho',                  category: 'technique', minLevel: 'beginner' },
  { key: 'beg_serve',              label: 'Serve',                   category: 'technique', minLevel: 'beginner' },
  { key: 'beg_return',             label: 'Return',                  category: 'technique', minLevel: 'beginner' },

  // Tactic — each bullet is its own skill, group = visual header
  { key: 'beg_keeping_ball',       label: 'Keeping the ball in game',                    group: 'CONSISTENCY & CONTROL', category: 'tactic', minLevel: 'beginner' },
  { key: 'beg_trans_atk_def_lob',  label: 'Transition (attack → defense) By a Lob',     group: 'NET DOMINANCE',         category: 'tactic', minLevel: 'beginner' },
  { key: 'beg_trans_def_atk_lob',  label: 'Transition (defense → attack) By a Lob',     group: 'NET DOMINANCE',         category: 'tactic', minLevel: 'beginner' },

  // Others — individual, no group
  { key: 'beg_pos_back',           label: 'Positioning in the Back', category: 'others', minLevel: 'beginner' },
  { key: 'beg_pos_net',            label: 'Positioning at the Net',  category: 'others', minLevel: 'beginner' },

  // ══════════════════════════════════════════════════════════════════════════
  // INTERMEDIATE
  // ══════════════════════════════════════════════════════════════════════════

  // Technique
  { key: 'int_bandeja_vibora',     label: 'Bandeja / Víbora',                              category: 'technique', minLevel: 'intermediate' },
  { key: 'int_double_glass',       label: 'Double Glass',                                  category: 'technique', minLevel: 'intermediate' },
  { key: 'int_bajada',             label: 'Bajada',                                        category: 'technique', minLevel: 'intermediate' },
  { key: 'int_def_glass_cross',    label: 'Defense off the Glass (Cross Court)',           category: 'technique', minLevel: 'intermediate' },

  // Tactic
  { key: 'int_generate_center',    label: 'Generate the play from the center (avoid unnecessary angle risks)', group: 'CONSISTENCY & CONTROL', category: 'tactic', minLevel: 'intermediate' },
  { key: 'int_maintain_net',       label: 'Maintain the net',                                                  group: 'NET DOMINANCE',         category: 'tactic', minLevel: 'intermediate' },
  { key: 'int_shifting_net',       label: 'Shifting at the net (Coordinated movement at the net)',             group: 'NET DOMINANCE',         category: 'tactic', minLevel: 'intermediate' },

  // ══════════════════════════════════════════════════════════════════════════
  // ADVANCED
  // ══════════════════════════════════════════════════════════════════════════

  // Technique
  { key: 'adv_block',              label: 'Block',                     category: 'technique', minLevel: 'advanced' },
  { key: 'adv_smash',              label: 'Smash',                     category: 'technique', minLevel: 'advanced' },
  { key: 'adv_rulo',               label: 'Rulo',                      category: 'technique', minLevel: 'advanced' },
  { key: 'adv_fake_smash',         label: 'Fake Smash',                category: 'technique', minLevel: 'advanced' },
  { key: 'adv_smash_return',       label: 'Smash Return',              category: 'technique', minLevel: 'advanced' },
  { key: 'adv_def_bandeja_vib',    label: 'Defensive Bandeja / Víbora',category: 'technique', minLevel: 'advanced' },
  { key: 'adv_chiquita',           label: 'Chiquita',                  category: 'technique', minLevel: 'advanced' },

  // Tactic
  { key: 'adv_know_switch',        label: 'Know when to keep attacking one player or switch',  group: 'CONSISTENCY & CONTROL',                        category: 'tactic', minLevel: 'advanced' },
  { key: 'adv_improve_pace',       label: 'Improving the pace of our basic game',              group: 'CONSISTENCY & CONTROL',                        category: 'tactic', minLevel: 'advanced' },
  { key: 'adv_trans_atk_def_pass', label: 'Transition (attack → defense) By a Passing shot',  group: 'NET DOMINANCE',                                category: 'tactic', minLevel: 'advanced' },
  { key: 'adv_trans_chiq_volley',  label: 'Transition (defense → attack) Chiquita + Volley',  group: 'NET DOMINANCE',                                category: 'tactic', minLevel: 'advanced' },
  { key: 'adv_maintain_def_vib',   label: 'Maintain the net — Defensive Víbora',              group: 'NET DOMINANCE',                                category: 'tactic', minLevel: 'advanced' },
  { key: 'adv_generate_easy_ball', label: 'Generate an easy ball from the back',              group: 'CREATION, DIRECTIONS, SPACE & TEMPO MANAGEMENT', category: 'tactic', minLevel: 'advanced' },

  // ══════════════════════════════════════════════════════════════════════════
  // SEMI-PRO & PRO
  // ══════════════════════════════════════════════════════════════════════════

  // Technique
  { key: 'sp_fh_topspin',          label: 'Forehand with Top Spin',  category: 'technique', minLevel: 'semi_pro' },
  { key: 'sp_bh_topspin',          label: 'Backhand with Top Spin',  category: 'technique', minLevel: 'semi_pro' },
  { key: 'sp_smash_x3',            label: 'Smash X3',                category: 'technique', minLevel: 'semi_pro' },

  // Tactic
  { key: 'sp_def_patterns',        label: 'Consistency of defensive game patterns — Patient (All lobs, All down, One up one down)',   group: 'CONSISTENCY & CONTROL',                        category: 'tactic', minLevel: 'semi_pro' },
  { key: 'sp_trans_fast_lob',      label: 'Transition (defense → attack) Fast Lob to the middle + Block',                           group: 'NET DOMINANCE',                                category: 'tactic', minLevel: 'semi_pro' },
  { key: 'sp_trans_high_lob',      label: 'Transition (defense → attack) High Lob to the corner + Chiquita + Volley',               group: 'NET DOMINANCE',                                category: 'tactic', minLevel: 'semi_pro' },
  { key: 'sp_create_spaces',       label: 'Create spaces (angles, middle, deep lobs, chiquitas)',                                    group: 'CREATION, DIRECTIONS, SPACE & TEMPO MANAGEMENT', category: 'tactic', minLevel: 'semi_pro' },
  { key: 'sp_high_bh_volley',      label: 'Aim for the high backhand volley',                                                        group: 'CREATION, DIRECTIONS, SPACE & TEMPO MANAGEMENT', category: 'tactic', minLevel: 'semi_pro' },
  { key: 'sp_cut_time',            label: "Cut time on rivals (reduce opponent's reaction window)",                                  group: 'CREATION, DIRECTIONS, SPACE & TEMPO MANAGEMENT', category: 'tactic', minLevel: 'semi_pro' },
  { key: 'sp_variation_speeds',    label: 'Variation of speeds and directions (fast ball, slow under the net)',                      group: 'CREATION, DIRECTIONS, SPACE & TEMPO MANAGEMENT', category: 'tactic', minLevel: 'semi_pro' },
  { key: 'sp_lob_types_dirs',      label: 'Types and directions of the lob (Fast / High) (Middle / Corners)',                       group: 'CREATION, DIRECTIONS, SPACE & TEMPO MANAGEMENT', category: 'tactic', minLevel: 'semi_pro' },
  { key: 'sp_vibora_dirs',         label: 'Directions of the víbora (Side, Feet, Middle, Down the line)',                           group: 'CREATION, DIRECTIONS, SPACE & TEMPO MANAGEMENT', category: 'tactic', minLevel: 'semi_pro' },
  { key: 'sp_play_avoid_player',   label: 'Play to the player / Avoid the player',                                                  group: 'CREATION, DIRECTIONS, SPACE & TEMPO MANAGEMENT', category: 'tactic', minLevel: 'semi_pro' },
  { key: 'sp_break_pattern',       label: 'Knowing when to break the pattern in defense (All down, All lob, One up one down)',       group: 'GAME INTELLIGENCE',                            category: 'tactic', minLevel: 'semi_pro' },
  { key: 'sp_hiding_shot',         label: 'Hiding the shot — same preparation (Triple Threat, Rulo/Smash, Víbora vs Flat Smash, Gancho to the fence or Víbora)', group: 'GAME INTELLIGENCE', category: 'tactic', minLevel: 'semi_pro' },
  { key: 'sp_adapt_opponent',      label: "Adaptation of the game based on opponent's characteristics",                             group: 'GAME INTELLIGENCE',                            category: 'tactic', minLevel: 'semi_pro' },
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
