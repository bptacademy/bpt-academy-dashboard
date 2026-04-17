export type UserRole = 'student' | 'coach' | 'admin' | 'super_admin' | 'parent';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';
export type EnrollmentStatus = 'active' | 'waitlisted' | 'completed' | 'cancelled' | 'pending_payment' | 'pending_next_cycle';
export type Division = 'amateur' | 'semi_pro' | 'pro' | 'junior_9_11' | 'junior_12_15' | 'junior_15_18';
export type PaymentMethod = 'stripe' | 'bank_transfer';
export type PaymentStatus = 'pending' | 'confirmed' | 'failed' | 'refunded';
export type TournamentStatus = 'upcoming' | 'registration_open' | 'ongoing' | 'completed';

export const DIVISION_LABELS: Record<Division, string> = {
  amateur: 'Amateur',
  semi_pro: 'Semi-Pro',
  pro: 'Pro',
  junior_9_11: 'Junior 9–11',
  junior_12_15: 'Junior 12–15',
  junior_15_18: 'Junior 15–18',
};

export const DIVISION_COLORS: Record<Division, string> = {
  amateur: '#3B82F6',
  semi_pro: '#F59E0B',
  pro: '#16A34A',
  junior_9_11: '#8B5CF6',
  junior_12_15: '#EC4899',
  junior_15_18: '#EF4444',
};

export interface Payment {
  id: string;
  student_id: string;
  program_id?: string;
  enrollment_id?: string;
  tournament_id?: string;
  amount_gbp: number;
  method: PaymentMethod;
  status: PaymentStatus;
  stripe_payment_intent_id?: string;
  stripe_client_secret?: string;
  bank_reference?: string;
  notes?: string;
  confirmed_by?: string;
  confirmed_at?: string;
  created_at: string;
}

export interface Tournament {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  location?: string;
  eligible_divisions: string[];
  max_participants?: number;
  entry_fee_gbp: number;
  organizer: string;
  status: TournamentStatus;
  registration_deadline?: string;
  created_at: string;
}

export interface TournamentRegistration {
  id: string;
  tournament_id: string;
  student_id: string;
  payment_id?: string;
  division?: Division;
  status: 'pending' | 'confirmed' | 'withdrawn';
  registered_at: string;
}

export interface TournamentMatch {
  id: string;
  tournament_id: string;
  round: string;
  player1_id?: string;
  player2_id?: string;
  winner_id?: string;
  score?: string;
  court?: string;
  scheduled_at?: string;
  played_at?: string;
}

export interface Court {
  id: string;
  name: string;
  location?: string;
  surface?: string;
  is_active: boolean;
}

export interface CourtBooking {
  id: string;
  court_id: string;
  student_id: string;
  program_session_id?: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: 'confirmed' | 'cancelled';
  created_at: string;
  court?: Court;
}

export interface SessionAttendance {
  id: string;
  session_id: string;
  student_id: string;
  attended: boolean;
  feedback_rating?: number;
  feedback_text?: string;
  created_at: string;
}

export interface CoachNote {
  id: string;
  student_id: string;
  coach_id: string;
  note: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface RankingEvent {
  id: string;
  student_id: string;
  division: Division;
  points: number;
  reason: string;
  created_at: string;
}

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  skill_level?: SkillLevel;
  division?: Division;
  ranking_points?: number;
  date_of_birth?: string;
  emergency_contact?: string;
  // Parent / Junior system fields
  parent_name?: string;
  parent_email?: string;
  child_email?: string;
  child_auth_id?: string;
  is_junior?: boolean;
  graduated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ParentAccess {
  id: string;
  parent_id: string;
  student_id: string;
  created_at: string;
}

export interface Program {
  id: string;
  title: string;
  description?: string;
  skill_level: SkillLevel;
  duration_weeks?: number;
  max_students?: number;
  coach_id?: string;
  is_active: boolean;
  created_at: string;
  coach?: Profile;
}

export interface ProgramSession {
  id: string;
  program_id: string;
  title: string;
  description?: string;
  scheduled_at?: string;
  duration_minutes: number;
  location?: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  program_id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  program?: Program;
}

export interface Module {
  id: string;
  program_id: string;
  title: string;
  description?: string;
  order_index: number;
}

export interface StudentProgress {
  id: string;
  student_id: string;
  module_id: string;
  completed: boolean;
  score?: number;
  completed_at?: string;
  notes?: string;
  module?: Module;
}

export interface Video {
  id: string;
  title: string;
  description?: string;
  program_id?: string;
  uploaded_by?: string;
  mux_asset_id?: string;
  mux_playback_id?: string;
  duration_seconds?: number;
  drill_type?: string;
  skill_focus?: string;
  tags?: string[];
  is_published: boolean;
  created_at: string;
  uploader?: Profile;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at?: string;
  created_at: string;
  sender?: Profile;
}

export interface Conversation {
  id: string;
  is_group: boolean;
  title?: string;
  created_by?: string;
  created_at: string;
  members?: Profile[];
  last_message?: Message;
}

export interface Notification {
  id: string;
  recipient_id: string;
  title: string;
  body?: string;
  type?: string;
  data?: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export interface PromotionCycle {
  id: string;
  student_id: string;
  program_id?: string;
  from_level: string;
  to_level: string;
  cycle_start_date: string;
  cycle_end_date: string;
  required_attendance_pct: number;
  min_active_weeks: number;
  active_weeks_so_far: number;
  attendance_pct: number;
  performance_pct: number;
  requires_coach_approval: boolean;
  status: 'active' | 'eligible' | 'approved' | 'promoted' | 'expired';
  coach_approved_by?: string;
  coach_approved_at?: string;
  last_evaluated_at?: string;
  rejection_note?: string;
  created_at: string;
  updated_at: string;
}

export const LEVEL_LABELS: Record<string, string> = {
  amateur_beginner: 'Amateur · Beginner',
  amateur_intermediate: 'Amateur · Intermediate',
  amateur_advanced: 'Amateur · Advanced',
  semi_pro: 'Semi-Pro',
  pro: 'Pro',
};
