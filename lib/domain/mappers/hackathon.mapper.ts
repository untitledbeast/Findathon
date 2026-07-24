import { RichHackathon, OrganizerEntity, UniversityEntity, CityEntity, MediaItem, TimelineItem, HackathonStats, RelatedHackathon, Review } from '../hackathon.repository';
import { HackathonDetailDTO, OrganizerDTO, UniversityDTO, CityDTO, MediaDTO, TimelineDTO, HackathonStatsDTO, RelatedHackathonDTO, ReviewDTO } from '../dtos/hackathon.dto';

export function mapOrganizerToDTO(org: OrganizerEntity | null): OrganizerDTO | null {
  if (!org) return null;
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    description: org.description,
    logoUrl: org.logo_url,
    bannerUrl: org.banner_url,
    website: org.website,
    isVerified: Boolean(org.is_verified),
    verificationBadge: org.verification_badge,
    followerCount: org.follower_count || 0,
    hackathonCount: org.hackathon_count || 0,
    totalParticipants: org.total_participants || 0,
    totalPrizeAmount: org.total_prize_amount || 0,
    avgRating: org.avg_rating || 0,
    socialTwitter: org.social_twitter,
    socialLinkedin: org.social_linkedin,
    socialDiscord: org.social_discord,
    country: org.country || 'India'
  };
}

export function mapUniversityToDTO(uni: UniversityEntity | null): UniversityDTO | null {
  if (!uni) return null;
  return {
    id: uni.id,
    name: uni.name,
    slug: uni.slug,
    shortName: uni.short_name,
    city: uni.city,
    state: uni.state,
    country: uni.country || 'India',
    latitude: uni.latitude,
    longitude: uni.longitude,
    logoUrl: uni.logo_url,
    website: uni.website,
    ranking: uni.ranking,
    hackathonCount: uni.hackathon_count || 0
  };
}

export function mapCityToDTO(city: CityEntity | null): CityDTO | null {
  if (!city) return null;
  return {
    id: city.id,
    name: city.name,
    slug: city.slug,
    state: city.state,
    country: city.country || 'India',
    latitude: city.latitude,
    longitude: city.longitude,
    hackathonCount: city.hackathon_count || 0,
    topTags: city.top_tags || []
  };
}

export function mapMediaToDTO(media: MediaItem): MediaDTO {
  return {
    id: media.id,
    mediaType: media.media_type,
    url: media.url,
    caption: media.caption,
    displayOrder: media.display_order || 0
  };
}

export function mapTimelineToDTO(t: TimelineItem): TimelineDTO {
  return {
    id: t.id,
    milestoneName: t.milestone_name,
    milestoneDate: t.milestone_date,
    description: t.description,
    isCompleted: Boolean(t.is_completed),
    displayOrder: t.display_order || 0
  };
}

export function mapStatsToDTO(stats: HackathonStats | null): HackathonStatsDTO | null {
  if (!stats) return null;
  return {
    totalViews: stats.total_views || 0,
    uniqueViews: stats.unique_views || 0,
    totalSaves: stats.total_saves || 0,
    registerClicks: stats.register_clicks || 0,
    shareCount: stats.share_count || 0,
    compareCount: stats.compare_count || 0,
    conversionRate: stats.conversion_rate || 0,
    peakViewDate: stats.peak_view_date
  };
}

export function mapRelatedToDTO(r: RelatedHackathon): RelatedHackathonDTO {
  return {
    id: r.id,
    title: r.title,
    coverImageUrl: r.cover_image_url,
    startDate: r.start_date,
    tags: r.tags || [],
    isOnline: Boolean(r.is_online),
    locationCity: r.location_city,
    prizePool: r.prize_pool,
    avgRating: r.avg_rating || 0,
    relationType: r.relation_type || 'similar'
  };
}

export function mapReviewToDTO(rev: Review): ReviewDTO {
  return {
    id: rev.id,
    rating: rev.rating,
    comment: rev.comment,
    createdAt: rev.created_at,
    userId: rev.user_id,
    profile: {
      fullName: rev.profile?.full_name || null,
      avatarUrl: rev.profile?.avatar_url || null
    }
  };
}

export function mapHackathonDetailToDTO(
  h: RichHackathon,
  organizer: OrganizerEntity | null,
  university: UniversityEntity | null,
  city: CityEntity | null,
  media: MediaItem[],
  timeline: TimelineItem[],
  stats: HackathonStats | null,
  related: RelatedHackathon[],
  reviews: Review[]
): HackathonDetailDTO {
  return {
    id: h.id,
    title: h.title,
    description: h.description,
    tagline: h.tagline,
    startDate: h.start_date,
    endDate: h.end_date,
    registrationDeadline: h.registration_deadline,
    locationCity: h.location_city,
    locationCollege: h.location_college,
    fullAddress: h.full_address,
    isOnline: Boolean(h.is_online),
    tags: h.tags || [],
    registerUrl: h.register_url,
    organizerName: h.organizer,
    coverImageUrl: h.cover_image_url,
    status: h.status,
    latitude: h.latitude,
    longitude: h.longitude,
    prizePool: h.prize_pool,
    prizeAmount: h.prize_amount || 0,
    prizeBreakdown: h.prize_breakdown || [],
    difficulty: h.difficulty || 'open',
    isFeatured: Boolean(h.is_featured),
    isVerified: Boolean(h.is_verified),
    avgRating: h.avg_rating || 0,
    reviewCount: h.review_count || 0,
    saveCount: h.save_count || 0,
    viewCount: h.view_count || 0,
    rules: h.rules,
    eligibilityDetails: h.eligibility_details,
    registrationFee: h.registration_fee || 0,
    registrationFeeCurrency: h.registration_fee_currency || 'INR',
    tracks: h.tracks || [],
    sponsors: h.sponsors || [],
    techStack: h.tech_stack || [],
    minTeamSize: h.min_team_size || 1,
    maxTeamSize: h.max_team_size || 4,
    soloAllowed: Boolean(h.solo_allowed),
    maxParticipants: h.max_participants,
    currentParticipants: h.current_participants || 0,
    durationHours: h.duration_hours,
    certificateProvided: Boolean(h.certificate_provided),
    internshipOpportunity: Boolean(h.internship_opportunity),
    hiringOpportunity: Boolean(h.hiring_opportunity),
    language: h.language || 'English',
    timezone: h.timezone || 'IST',
    faq: h.faq || [],
    qualityScore: h.quality_score || 0,
    trendingScore: h.trending_score || 0,
    seoTitle: h.seo_title,
    seoDescription: h.seo_description,
    ogImageUrl: h.og_image_url,
    createdAt: h.created_at,

    organizerProfile: mapOrganizerToDTO(organizer),
    universityProfile: mapUniversityToDTO(university),
    cityProfile: mapCityToDTO(city),
    media: (media || []).map(mapMediaToDTO),
    timeline: (timeline || []).map(mapTimelineToDTO),
    statistics: mapStatsToDTO(stats),
    related: (related || []).map(mapRelatedToDTO),
    reviews: (reviews || []).map(mapReviewToDTO)
  };
}
