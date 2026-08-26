import { UserRole } from '@/constants/roles';

export type { UserRole };

export interface HackathonDTO {
  id: string;
  title: string;
  slug: string;
  description: string;
  tagline: string | null;
  startDate: string;
  endDate: string;
  registrationDeadline: string | null;
  locationCity: string | null;
  locationCollege: string | null;
  fullAddress: string | null;
  isOnline: boolean;
  mode: 'online' | 'offline' | 'hybrid';
  tags: string[];
  registerUrl: string;
  organizer: string;
  organization: string | null;
  coverImageUrl: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'archived';
  minTeamSize: number;
  maxTeamSize: number;
  soloAllowed: boolean;
  eligibility: string | null;
  prizePool: string | null;
  registrationFee: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  socialTwitter: string | null;
  socialLinkedin: string | null;
  socialDiscord: string | null;
  socialInstagram: string | null;
  submittedBy: string | null;
  viewCount: number;
  saveCount: number;
  avgRating: number;
  reviewCount: number;
  latitude: number | null;
  longitude: number | null;
  isVerified: boolean;
  isFeatured: boolean;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'open';
  hasCertificate: boolean;
  isHiring: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileDTO {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  organization: string | null;
  phone: string | null;
  website: string | null;
  socialTwitter: string | null;
  socialLinkedin: string | null;
  socialInstagram: string | null;
  socialDiscord: string | null;
  role: UserRole;
  discoverableForTeams?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TeamStatus = 'forming' | 'active' | 'locked' | 'submitted' | 'completed' | 'archived';
export type TeamVisibility = 'public' | 'private';
export type TeamMemberRole = 'owner' | 'lead' | 'member';
export type TeamMemberStatus = 'active' | 'inactive' | 'left' | 'removed';
export type TeamInvitationStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';

export interface TeamMemberDTO {
  id: string;
  teamId: string;
  userId: string;
  role: TeamMemberRole;
  membershipStatus: TeamMemberStatus;
  joinedAt: string;
  updatedAt: string;
  profile?: {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
    technicalLevel?: string | null;
    topLanguages?: string[];
  };
}

export interface TeamDTO {
  id: string;
  hackathonId: string;
  ownerUserId: string;
  name: string;
  description: string | null;
  status: TeamStatus;
  visibility: TeamVisibility;
  maxMembers: number;
  memberCount: number;
  members?: TeamMemberDTO[];
  hackathon?: {
    id: string;
    title: string;
    slug: string;
    coverImageUrl: string | null;
    startDate: string;
    endDate: string;
    minTeamSize: number;
    maxTeamSize: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TeamInvitationDTO {
  id: string;
  teamId: string;
  inviterUserId: string;
  inviteeUserId: string;
  status: TeamInvitationStatus;
  message: string | null;
  expiresAt: string;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  team?: TeamDTO;
  inviter?: {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
  invitee?: {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
}

export interface TeamCoverageItemDTO {
  skillId: string;
  displayLabel: string;
  category: string;
  proficiency: number;
  coverageLevel: 'strong' | 'partial' | 'missing';
  coveredByUsers: string[];
}

export interface TeamGapDTO {
  skillId: string;
  displayLabel: string;
  category: string;
  severity: 'critical' | 'important' | 'optional';
  reason: string;
}

export interface TeamCompatibilityResultDTO {
  teamFitScore: number;
  confidence: 'high' | 'medium' | 'low';
  confidenceScore: number;
  requiredCoverageScore: number;
  preferredCoverageScore: number;
  roleCoverageScore: number;
  complementarityScore: number;
  redundancyPenalty: number;
  coveredSkills: TeamCoverageItemDTO[];
  criticalGaps: TeamGapDTO[];
  importantGaps: TeamGapDTO[];
  optionalGaps: TeamGapDTO[];
  explanationCodes: string[];
  roleBreakdown: {
    frontend: number;
    backend: number;
    aiMl: number;
    data: number;
    devops: number;
  };
}

export type ConnectionStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface ConnectionDTO {
  id: string;
  userLowId: string;
  userHighId: string;
  initiatorUserId: string;
  status: ConnectionStatus;
  createdAt: string;
  updatedAt: string;
  respondedAt: string | null;
  partner?: {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
    bio?: string | null;
  };
}

export interface UserBlockDTO {
  id: string;
  blockerUserId: string;
  blockedUserId: string;
  createdAt: string;
  blockedUser?: {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
}

export interface TeammateCandidateDTO {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  contributionScore: number;
  confidence: 'high' | 'medium' | 'low';
  technicalLevel: string;
  addsSkills: string[];
  fillsGaps: string[];
  reasons: string[];
  connectionState: 'none' | 'pending_sent' | 'pending_received' | 'accepted';
  invitationState: 'none' | 'pending' | 'accepted' | 'not_allowed';
  hasPendingInvite?: boolean;
}

export interface UserDTO {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: UserRole;
}

export interface ReviewDTO {
  id: string;
  hackathonId: string;
  userId: string;
  rating: number;
  title: string;
  body: string;
  organizationQuality: number;
  prizeTransparency: number;
  mentorship: number;
  createdAt: string;
  updatedAt: string;
  profile?: ProfileDTO | null;
}

export interface BookmarkDTO {
  id: string;
  userId: string;
  hackathonId: string;
  savedAt: string;
  hackathon?: HackathonDTO | null;
}

export interface NotificationDTO {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface SearchResultDTO {
  hackathons: HackathonDTO[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
}

export interface AnalyticsEventDTO {
  event: string;
  userId?: string;
  hackathonId?: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  code?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface HackathonFilters {
  query?: string;
  city?: string;
  college?: string;
  tags?: string[];
  mode?: 'online' | 'offline' | 'hybrid';
  isOnline?: boolean;
  minPrize?: number;
  deadline?: string;
  verified?: boolean;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'open';
  hasCertificate?: boolean;
  isHiring?: boolean;
}

// Database Rows
export interface HackathonDatabaseRow {
  id: string;
  title: string;
  tagline?: string | null;
  description: string;
  start_date: string;
  end_date: string;
  registration_deadline?: string | null;
  location_city?: string | null;
  location_college?: string | null;
  full_address?: string | null;
  is_online: boolean;
  mode?: string | null;
  tags?: string[] | null;
  register_url: string;
  organizer: string;
  organization?: string | null;
  cover_image_url?: string | null;
  status: string;
  min_team_size?: number | null;
  max_team_size?: number | null;
  solo_allowed?: boolean | null;
  eligibility?: string | null;
  prize_pool?: string | null;
  registration_fee?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  social_twitter?: string | null;
  social_linkedin?: string | null;
  social_discord?: string | null;
  social_instagram?: string | null;
  submitted_by?: string | null;
  view_count?: number | null;
  save_count?: number | null;
  avg_rating?: number | null;
  review_count?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  is_verified?: boolean | null;
  is_featured?: boolean | null;
  difficulty?: string | null;
  has_certificate?: boolean | null;
  is_hiring?: boolean | null;
  source?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ProfileDatabaseRow {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  organization?: string | null;
  phone?: string | null;
  website?: string | null;
  social_twitter?: string | null;
  social_linkedin?: string | null;
  social_instagram?: string | null;
  social_discord?: string | null;
  role?: string | null;
  discoverable_for_teams?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ReviewDatabaseRow {
  id: string;
  hackathon_id: string;
  user_id: string;
  rating: number;
  title: string;
  body: string;
  organization_quality: number;
  prize_transparency: number;
  mentorship: number;
  created_at?: string | null;
  updated_at?: string | null;
  profiles?: ProfileDatabaseRow | null;
}

export interface BookmarkDatabaseRow {
  id: string;
  user_id: string;
  hackathon_id: string;
  saved_at?: string | null;
  hackathons?: HackathonDatabaseRow | null;
}

export interface NotificationDatabaseRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  is_read?: boolean | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
}
