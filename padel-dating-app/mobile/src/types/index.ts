// ─── Users ───────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | null;
  bio: string | null;
  looking_for: 'date' | 'partner' | 'both' | 'exploring' | null;
  visible_to: 'everyone' | 'women' | 'men' | 'no_preference' | null;
  city: string | null;
  location_lat: number | null;
  location_lon: number | null;
  // Radar fields
  last_lat: number | null;
  last_lon: number | null;
  last_location_at: string | null;
  radar_visible: boolean;
  is_premium: boolean;
  premium_expires_at: string | null;
  profile_complete: boolean;
  photos: string[]; // signed URLs
  photo_url?: string | null; // primary photo convenience field
  home_club_id: string | null;
  home_club_name: string | null;
  created_at: string;
  last_active_at: string | null;
}

// ─── Platform Connections ─────────────────────────────────────────────────────

export type Platform = 'playtomic' | 'matchi' | 'on_the_court';

export interface PlatformConnection {
  id: string;
  user_id: string;
  platform: Platform;
  platform_user_id: string;
  last_synced_at: string | null;
  created_at: string;
}

// ─── Player Stats ─────────────────────────────────────────────────────────────

export type PlayStyle = 'aggressive' | 'defensive' | 'balanced' | 'net_dominant';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export interface PlayerStats {
  id: string;
  user_id: string;
  platform: Platform;
  level_value: number;
  level_confidence: number;
  total_matches: number;
  wins: number;
  losses: number;
  win_rate: number;
  avg_set_score_for: number;
  avg_set_score_against: number;
  play_style: PlayStyle | null;
  preferred_time_of_day: TimeOfDay | null;
  preferred_days: string[];
  top_clubs: { club_id: string; club_name: string; play_count: number }[];
  updated_at: string;
}

// ─── Matches ──────────────────────────────────────────────────────────────────

export type MatchType = 'competitive' | 'casual';
export type SurfaceType = 'panoramic' | 'crystal' | 'wall' | 'outdoor';

export interface Match {
  id: string;
  platform: Platform;
  platform_match_id: string;
  tenant_id: string;
  tenant_name: string;
  court_name: string | null;
  city: string | null;
  country_code: string | null;
  lat: number | null;
  lon: number | null;
  played_at: string;
  duration_minutes: number | null;
  match_type: MatchType;
  surface_type: SurfaceType | null;
  result_confirmed: boolean;
  created_at: string;
}

export interface MatchPlayer {
  id: string;
  match_id: string;
  user_id: string | null; // null if not on Volpair yet
  platform_user_id: string;
  platform_name: string;
  team_id: '0' | '1';
  result: 'won' | 'lost' | 'unconfirmed';
  level_value: number | null;
  level_confidence: number | null;
}

// ─── Volpair Score ────────────────────────────────────────────────────────────

export interface VolpairScore {
  id: string;
  user_a_id: string;
  user_b_id: string;
  total_score: number;
  skill_score: number;
  style_score: number;
  availability_score: number;
  location_score: number;
  chemistry_score: number;
  proximity_score: number;
  matches_together: number;
  last_played_together: string | null;
  calculated_at: string;
}

// ─── Connections ──────────────────────────────────────────────────────────────

export type ActionType = 'play_again' | 'connect' | 'volley';
export type ConnectionStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface Connection {
  id: string;
  sender_id: string;
  receiver_id: string;
  action_type: ActionType;
  status: ConnectionStatus;
  matched_at: string | null;
  created_at: string;
  expires_at: string | null;
}

// ─── Serves (Messages) ───────────────────────────────────────────────────────

export interface Serve {
  id: string;
  connection_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

// ─── Clubs ────────────────────────────────────────────────────────────────────

export interface Club {
  id: string;
  platform: Platform | null;
  platform_tenant_id: string | null;
  name: string;
  city: string | null;
  country_code: string | null;
  lat: number | null;
  lon: number | null;
  surface_types: SurfaceType[];
  court_count: number | null;
  is_partner: boolean;
  created_at: string;
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Welcome: undefined;
  PlatformSelect: undefined;
  PlatformLogin: { platform: Platform };
  SyncingProfile: { platform: Platform };
  ProfilePreview: undefined;
  Question1Location: undefined;
  Question2Intent: undefined;
  Question3Visibility: undefined;
  Question4Bio: undefined;
  PhotoUpload: undefined;
  OnboardingComplete: undefined;
  MainTabs: undefined;
};

export type MainTabParamList = {
  Connect: undefined;
  Play: undefined;
  Radar: undefined;
  Messages: undefined;
  Profile: undefined;
};

export type ConnectStackParamList = {
  ConnectHome: undefined;
  PlayerProfile: { userId: string };
  MutualVolleyMatch: { connectionId: string; matchedUserId: string };
  Conversation: { connectionId: string };
};

export type PlayStackParamList = {
  PlayHome: undefined;
  FindPartner: undefined;
};

export type ProfileStackParamList = {
  MyProfile: undefined;
  EditProfile: undefined;
  MyStats: undefined;
  PlatformSync: undefined;
  Notifications: undefined;
  Settings: undefined;
  BlockedUsers: undefined;
  DeleteAccount: undefined;
};
