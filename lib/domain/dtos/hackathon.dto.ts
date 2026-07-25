import { HackathonDTO as BaseHackathonDTO, ProfileDTO } from '@/types';

export type HackathonDTO = BaseHackathonDTO;

export interface ReviewDTO {
  id: string;
  rating: number;
  comment?: string | null;
  title?: string;
  body?: string;
  organizationQuality?: number;
  prizeTransparency?: number;
  mentorship?: number;
  createdAt: string;
  updatedAt?: string;
  userId: string;
  hackathonId?: string;
  profile?: { fullName: string | null; avatarUrl: string | null } | ProfileDTO | null;
}

export interface OrganizerDTO {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  website: string | null;
  isVerified: boolean;
  verificationBadge: string | null;
  followerCount: number;
  hackathonCount: number;
  totalParticipants?: number;
  totalPrizeAmount?: number;
  avgRating: number;
  socialTwitter: string | null;
  socialLinkedin: string | null;
  socialDiscord: string | null;
  country: string;
}

export interface UniversityDTO {
  id: string;
  name: string;
  slug: string;
  shortName: string | null;
  city: string | null;
  state: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  logoUrl: string | null;
  website: string | null;
  ranking: number | null;
  hackathonCount: number;
}

export interface CityDTO {
  id: string;
  name: string;
  slug: string;
  state: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  hackathonCount: number;
  topTags: string[];
}

export interface MediaDTO {
  id: string;
  mediaType: string;
  url: string;
  caption: string | null;
  displayOrder: number;
}

export interface TimelineDTO {
  id: string;
  milestoneName: string;
  milestoneDate: string;
  description: string | null;
  isCompleted: boolean;
  displayOrder: number;
}

export interface HackathonStatsDTO {
  totalViews: number;
  uniqueViews: number;
  totalSaves: number;
  registerClicks: number;
  shareCount: number;
  compareCount: number;
  conversionRate: number;
  peakViewDate: string | null;
}

export interface RelatedHackathonDTO {
  id: string;
  title: string;
  coverImageUrl: string | null;
  startDate: string;
  tags: string[];
  isOnline: boolean;
  locationCity: string | null;
  prizePool: string | null;
  avgRating: number;
  relationType: string;
}

export interface HackathonDetailDTO extends BaseHackathonDTO {
  organizerName: string;
  rules: string | null;
  eligibilityDetails: string | null;
  registrationFeeCurrency: string;
  tracks: string[];
  sponsors: string[];
  techStack: string[];
  maxParticipants: number | null;
  currentParticipants: number;
  durationHours: number | null;
  certificateProvided: boolean;
  internshipOpportunity: boolean;
  hiringOpportunity: boolean;
  language: string;
  timezone: string;
  faq: { question: string; answer: string }[];
  qualityScore: number;
  trendingScore: number;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageUrl: string | null;
  prizeAmount: number;
  prizeBreakdown: { title?: string; amount?: string }[];
  organizerProfile: OrganizerDTO | null;
  universityProfile: UniversityDTO | null;
  cityProfile: CityDTO | null;
  media: MediaDTO[];
  timeline: TimelineDTO[];
  statistics: HackathonStatsDTO | null;
  related: RelatedHackathonDTO[];
  reviews: ReviewDTO[];
}
