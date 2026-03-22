export type UserRole = 'student' | 'coach' | 'admin' | 'parent';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'competition';
export type EnrollmentStatus = 'active' | 'waitlisted' | 'completed' | 'cancelled';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  skill_level?: SkillLevel;
  date_of_birth?: string;
  emergency_contact?: string;
  created_at: string;
  updated_at: string;
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
