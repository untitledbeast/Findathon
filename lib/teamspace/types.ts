export interface DeveloperSkillSnapshot {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  experience_level: 'beginner' | 'intermediate' | 'advanced' | null;
  top_languages: string[];
  competencies: Record<string, number>;
  interests: string[];
  overall_score: number;
}

export interface TeamSkillMap {
  covered: string[];   // skills present in current team members
  gaps: string[];      // required_skills NOT covered by any current member
  members: DeveloperSkillSnapshot[];
}

export interface TeamFitResult {
  score: number;           // 0-100
  confidence: 'low' | 'medium' | 'high';
  covered_skills: string[];
  gap_skills: string[];
  reasons: string[];
}

export interface TeammateRecommendation {
  developer: DeveloperSkillSnapshot;
  match_score: number;     // 0-100, deterministic
  fills_gaps: string[];    // which team gaps this person covers
  adds_skills: string[];   // their top skills
  match_label: string;     // "95% match" etc.
}

export type TeamStatus = 'forming' | 'full' | 'active' | 'completed' | 'disbanded';

export interface Team {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  hackathon_id: string | null;
  created_by: string;
  max_members: number;
  status: TeamStatus;
  required_skills: string[];
  is_open: boolean;
  avatar_color: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  developer_profile?: DeveloperSkillSnapshot | null;
}

export interface TeamWithMemberCount extends Team {
  member_count: number;
  hackathon_title?: string | null;
  members?: TeamMember[];
  team_fit?: TeamFitResult;
  pending_invitations_count?: number;
  is_owner?: boolean;
  is_member?: boolean;
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  invited_by: string;
  invited_user_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  message: string | null;
  created_at: string;
  updated_at: string;
  team?: {
    id?: string;
    name: string;
    avatar_color: string;
    member_count?: number;
    hackathon_title?: string | null;
  };
  inviter?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface DeveloperVisibility {
  user_id: string;
  is_discoverable: boolean;
  looking_for_team: boolean;
  preferred_roles: string[];
  updated_at: string;
}
