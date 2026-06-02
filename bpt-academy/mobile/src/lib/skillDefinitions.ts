// ─── Skill Definitions ────────────────────────────────────────────────────────
// Cumulative: each level includes all skills from lower levels + its own.
// Score range is 1–5 for ALL levels (0.5 increments).
// Min passing score per level is a reference indicator only — not a hard cap.

export type SkillCategory = 'technique' | 'tactic' | 'others';
export type SkillDivision = 'beginner' | 'intermediate' | 'advanced' | 'semi_pro' | 'pro';

export interface SkillDef {
  key: string;
  label: string;
  category: SkillCategory;
  minLevel: SkillDivision;
}

// Score range is 1–5 for ALL levels, 0.5 increments
export const SCORE_RANGE = { min: 1.0, max: 5.0, step: 0.5 };

// Minimum expected score per division (reference only — not a hard cap)
export const MIN_PASSING_SCORE: Record<SkillDivision, number> = {
  beginner:     1.0,
  intermediate: 2.0,
  advanced:     3.0,
  semi_pro:     4.0,
  pro:          4.5,
};

export const SKILLS: SkillDef[] = [

  // ────────────────────────────────────────────────────────────────────────────
  // BEGINNER
  // ────────────────────────────────────────────────────────────────────────────

  // Technique
  { key: 'beg_forehand',               label: 'Forehand',                      category: 'technique', minLevel: 'beginner' },
  { key: 'beg_backhand',               label: 'Backhand',                      category: 'technique', minLevel: 'beginner' },
  { key: 'beg_forehand_off_glass',     label: 'Forehand off the Glass',        category: 'technique', minLevel: 'beginner' },
  { key: 'beg_backhand_off_glass',     label: 'Backhand off the Glass',        category: 'technique', minLevel: 'beginner' },
  { key: 'beg_forehand_lob',           label: 'Forehand Lob',                  category: 'technique', minLevel: 'beginner' },
  { key: 'beg_backhand_lob',           label: 'Backhand Lob',                  category: 'technique', minLevel: 'beginner' },
  { key: 'beg_forehand_volley',        label: 'Forehand Volley',               category: 'technique', minLevel: 'beginner' },
  { key: 'beg_backhand_volley',        label: 'Backhand Volley',               category: 'technique', minLevel: 'beginner' },
  { key: 'beg_gancho',                 label: 'Gancho',                        category: 'technique', minLevel: 'beginner' },
  { key: 'beg_serve',                  label: 'Serve',                         category: 'technique', minLevel: 'beginner' },
  { key: 'beg_return',                 label: 'Return',                        category: 'technique', minLevel: 'beginner' },

  // Tactic
  { key: 'beg_consistency_control',    label: 'Consistency & Control',         category: 'tactic',    minLevel: 'beginner' },
  { key: 'beg_keeping_ball_in_game',   label: 'Keeping the Ball in Game',      category: 'tactic',    minLevel: 'beginner' },
  { key: 'beg_net_dominance',          label: 'Net Dominance',                 category: 'tactic',    minLevel: 'beginner' },
  { key: 'beg_transition_atk_def_lob', label: 'Transition (Attack → Defense) by a Lob', category: 'tactic', minLevel: 'beginner' },
  { key: 'beg_transition_def_atk_lob', label: 'Transition (Defense → Attack) by a Lob', category: 'tactic', minLevel: 'beginner' },

  // Others
  { key: 'beg_positioning_back',       label: 'Positioning in the Back',       category: 'others',    minLevel: 'beginner' },
  { key: 'beg_positioning_net',        label: 'Positioning at the Net',        category: 'others',    minLevel: 'beginner' },

  // ────────────────────────────────────────────────────────────────────────────
  // INTERMEDIATE (adds on top of beginner)
  // ────────────────────────────────────────────────────────────────────────────

  // Technique
  { key: 'int_bandeja_vibora',         label: 'Bandeja / Víbora',              category: 'technique', minLevel: 'intermediate' },
  { key: 'int_double_glass',           label: 'Double Glass',                  category: 'technique', minLevel: 'intermediate' },
  { key: 'int_bajada',                 label: 'Bajada',                        category: 'technique', minLevel: 'intermediate' },
  { key: 'int_defense_off_glass_cross',label: 'Defense off the Glass (Cross Court)', category: 'technique', minLevel: 'intermediate' },

  // Tactic
  { key: 'int_consistency_control',    label: 'Consistency & Control',         category: 'tactic',    minLevel: 'intermediate' },
  { key: 'int_generate_from_center',   label: 'Generate Play from the Center (Avoid Unnecessary Angle Risks)', category: 'tactic', minLevel: 'intermediate' },
  { key: 'int_net_dominance',          label: 'Net Dominance — Maintain the Net', category: 'tactic', minLevel: 'intermediate' },
  { key: 'int_shifting_at_net',        label: 'Shifting at the Net (Coordinated Movement)', category: 'tactic', minLevel: 'intermediate' },

  // ────────────────────────────────────────────────────────────────────────────
  // ADVANCED (adds on top of beginner + intermediate)
  // ────────────────────────────────────────────────────────────────────────────

  // Technique
  { key: 'adv_block',                  label: 'Block',                         category: 'technique', minLevel: 'advanced' },
  { key: 'adv_smash',                  label: 'Smash',                         category: 'technique', minLevel: 'advanced' },
  { key: 'adv_rulo',                   label: 'Rulo',                          category: 'technique', minLevel: 'advanced' },
  { key: 'adv_fake_smash',             label: 'Fake Smash',                    category: 'technique', minLevel: 'advanced' },
  { key: 'adv_smash_return',           label: 'Smash Return',                  category: 'technique', minLevel: 'advanced' },
  { key: 'adv_defensive_bandeja_vib',  label: 'Defensive Bandeja / Víbora',    category: 'technique', minLevel: 'advanced' },
  { key: 'adv_chiquita',               label: 'Chiquita',                      category: 'technique', minLevel: 'advanced' },

  // Tactic
  { key: 'adv_consistency_control',    label: 'Consistency & Control',         category: 'tactic',    minLevel: 'advanced' },
  { key: 'adv_know_when_switch',       label: 'Know When to Keep Attacking One Player or Switch', category: 'tactic', minLevel: 'advanced' },
  { key: 'adv_improve_pace',           label: 'Improving the Pace of Basic Game', category: 'tactic', minLevel: 'advanced' },
  { key: 'adv_net_dom_transition_pass',label: 'Net Dominance — Transition (Attack → Defense) by a Passing Shot', category: 'tactic', minLevel: 'advanced' },
  { key: 'adv_transition_chiquita_vol',label: 'Transition (Defense → Attack) Chiquita + Volley', category: 'tactic', minLevel: 'advanced' },
  { key: 'adv_maintain_net_def_vib',   label: 'Maintain the Net — Defensive Víbora', category: 'tactic', minLevel: 'advanced' },
  { key: 'adv_generate_easy_ball',     label: 'Creation — Generate an Easy Ball from the Back', category: 'tactic', minLevel: 'advanced' },

  // ────────────────────────────────────────────────────────────────────────────
  // SEMI-PRO & PRO (adds on top of all previous)
  // ────────────────────────────────────────────────────────────────────────────

  // Technique
  { key: 'sp_forehand_topspin',        label: 'Forehand with Top Spin',        category: 'technique', minLevel: 'semi_pro' },
  { key: 'sp_backhand_topspin',        label: 'Backhand with Top Spin',        category: 'technique', minLevel: 'semi_pro' },
  { key: 'sp_smash_x3',               label: 'Smash X3',                      category: 'technique', minLevel: 'semi_pro' },

  // Tactic
  { key: 'sp_consistency_defense',     label: 'Consistency & Control — Defensive Patterns (All Lobs, All Down, One Up One Down)', category: 'tactic', minLevel: 'semi_pro' },
  { key: 'sp_trans_fast_lob_block',    label: 'Transition (Defense → Attack) Fast Lob to the Middle + Block', category: 'tactic', minLevel: 'semi_pro' },
  { key: 'sp_trans_high_lob_chiq_vol', label: 'Transition (Defense → Attack) High Lob to Corner + Chiquita + Volley', category: 'tactic', minLevel: 'semi_pro' },
  { key: 'sp_create_spaces',           label: 'Creation — Create Spaces (Angles, Middle, Deep Lobs, Chiquitas)', category: 'tactic', minLevel: 'semi_pro' },
  { key: 'sp_aim_high_bh_volley',      label: 'Aim for the High Backhand Volley', category: 'tactic', minLevel: 'semi_pro' },
  { key: 'sp_cut_time_rivals',         label: 'Cut Time on Rivals (Reduce Opponent\'s Reaction Window)', category: 'tactic', minLevel: 'semi_pro' },
  { key: 'sp_variation_speeds_dirs',   label: 'Variation of Speeds and Directions (Fast Ball, Slow Under the Net)', category: 'tactic', minLevel: 'semi_pro' },
  { key: 'sp_lob_types_dirs',          label: 'Types and Directions of the Lob (Fast/High, Middle/Corners)', category: 'tactic', minLevel: 'semi_pro' },
  { key: 'sp_vibora_directions',       label: 'Directions of the Víbora (Side, Feet, Middle, Down the Line)', category: 'tactic', minLevel: 'semi_pro' },
  { key: 'sp_play_avoid_player',       label: 'Play to the Player / Avoid the Player', category: 'tactic', minLevel: 'semi_pro' },
  { key: 'sp_break_pattern_defense',   label: 'Game Intelligence — Knowing When to Break the Pattern in Defense', category: 'tactic', minLevel: 'semi_pro' },
  { key: 'sp_hiding_shot',             label: 'Game Intelligence — Hiding the Shot (Triple Threat, Rulo/Smash, Víbora vs Flat Smash, Gancho)', category: 'tactic', minLevel: 'semi_pro' },
  { key: 'sp_adapt_to_opponent',       label: 'Game Intelligence — Adaptation Based on Opponent\'s Characteristics', category: 'tactic', minLevel: 'semi_pro' },
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
