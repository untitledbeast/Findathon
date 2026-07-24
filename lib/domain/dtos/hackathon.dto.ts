export interface HackathonDetailDTO {
  id: string;
  title: string;
  description: string;
  tagline: string | null;
  startDate: string;
  endDate: string;
  registrationDeadline: string | null;
  locationCity: string | null;
  locationCollege: string | null;
  fullAddress: string | null;
  isOnline: boolean;
  tags: string[];
  registerUrl: string;
  organizerName: string;
  coverImageUrl: string | null;
  status: string;
  latitude: number | null;
  longitude: number | null;
  prizePool: string | null;
  prizeAmount: number;
  prizeBreakdown: { title?: string; amount?: string }[];
  difficulty: string;
  isFeatured: boolean;
  isVerified: boolean;
  avgRating: number;
  reviewCount: number;
  saveCount: number;
  viewCount: number;
  rules: string | null;
  eligibilityDetails: string | null;
  registrationFee: number;
  registrationFeeCurrency: string;
  tracks: string[];
  sponsors: string[];
  techStack: string[];
  minTeamSize: number;
  maxTeamSize: number;
  soloAllowed: boolean;
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
  createdAt: string;

  // Relations
  organizerProfile: OrganizerDTO | null;
  universityProfile: UniversityDTO | null;
  cityProfile: CityDTO | null;
  media: MediaDTO[];
  timeline: TimelineDTO[];
  statistics: HackathonStatsDTO | null;
  related: RelatedHackathonDTO[];
  reviews: ReviewDTO[];
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

export interface ReviewDTO {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  userId: string;
  profile: { fullName: string | null; avatarUrl: string | null };
}
