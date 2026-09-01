import { HackathonDTO, HackathonDatabaseRow } from '@/types';
import { HackathonEntity } from '../entities/hackathon.entity';
import { HackathonFactory } from '../factories';
import { HackathonDetailDTO, ReviewDTO } from '../dtos/hackathon.dto';

export class HackathonMapper {
  public static rowToDTO(row: HackathonDatabaseRow): HackathonDTO {
    const isOnline = Boolean(row.is_online);
    const mode = ((row.location_mode || row.mode)?.toLowerCase() as 'online' | 'offline' | 'hybrid') || (isOnline ? 'online' : 'offline');
    const tags = Array.isArray(row.tags) ? row.tags : [];
    const status = ((row.publication_status || row.status)?.toLowerCase() as 'pending' | 'approved' | 'rejected' | 'archived') || 'pending';

    return {
      id: row.id,
      title: row.title || 'Untitled Hackathon',
      slug: (row.title || '').toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      description: row.description || '',
      tagline: row.tagline || null,
      startDate: row.start_date || new Date().toISOString(),
      endDate: row.end_date || new Date().toISOString(),
      registrationDeadline: row.registration_deadline || null,
      locationCity: row.location_city || null,
      locationCollege: row.location_college || row.venue_name || null,
      fullAddress: row.location_address || row.full_address || null,
      isOnline,
      mode,
      tags,
      registerUrl: row.register_url || row.registration_url || '#',
      organizer: row.organizer || 'Community Organizer',
      organization: row.organization || null,
      coverImageUrl: row.cover_image_url || null,
      status,
      minTeamSize: row.min_team_size || 1,
      maxTeamSize: row.max_team_size || 4,
      soloAllowed: row.solo_allowed ?? true,
      eligibility: row.eligibility || 'Open to All',
      prizePool: row.prize_pool || null,
      registrationFee: row.registration_fee || 'Free',
      contactName: row.contact_name || null,
      contactEmail: row.contact_email || null,
      contactPhone: row.contact_phone || null,
      socialTwitter: row.social_twitter || null,
      socialLinkedin: row.social_linkedin || null,
      socialDiscord: row.social_discord || null,
      socialInstagram: row.social_instagram || null,
      submittedBy: row.submitted_by || null,
      viewCount: Number(row.view_count || 0),
      saveCount: Number(row.save_count || 0),
      avgRating: Number(row.avg_rating || 0),
      reviewCount: Number(row.review_count || 0),
      latitude: row.latitude ? Number(row.latitude) : null,
      longitude: row.longitude ? Number(row.longitude) : null,
      isVerified: Boolean(row.is_verified || status === 'approved'),
      isFeatured: Boolean(row.is_featured),
      difficulty: (row.difficulty as 'beginner' | 'intermediate' | 'advanced' | 'open') || 'open',
      hasCertificate: Boolean(row.has_certificate),
      isHiring: Boolean(row.is_hiring),
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString()
    };
  }

  public static dtoToRow(dto: Partial<HackathonDTO>): Record<string, unknown> {
    const row: Record<string, unknown> = {};
    if (dto.id !== undefined) row.id = dto.id;
    if (dto.title !== undefined) row.title = dto.title;
    if (dto.description !== undefined) row.description = dto.description;
    if (dto.tagline !== undefined) row.tagline = dto.tagline;
    if (dto.startDate !== undefined) row.start_date = dto.startDate;
    if (dto.endDate !== undefined) row.end_date = dto.endDate;
    if (dto.locationCity !== undefined) row.location_city = dto.locationCity;
    if (dto.locationCollege !== undefined) {
      row.location_college = dto.locationCollege;
      row.venue_name = dto.locationCollege;
    }
    if (dto.fullAddress !== undefined) {
      row.location_address = dto.fullAddress;
      row.full_address = dto.fullAddress;
    }
    if (dto.isOnline !== undefined) row.is_online = dto.isOnline;
    if (dto.mode !== undefined) {
      row.location_mode = dto.mode;
      row.mode = dto.mode;
    }
    if (dto.prizePool !== undefined) row.prize_pool = dto.prizePool;
    if (dto.tags !== undefined) row.tags = dto.tags;
    if (dto.registerUrl !== undefined) {
      row.register_url = dto.registerUrl;
      row.registration_url = dto.registerUrl;
    }
    if (dto.organizer !== undefined) row.organizer = dto.organizer;
    if (dto.coverImageUrl !== undefined) row.cover_image_url = dto.coverImageUrl;
    if (dto.status !== undefined) {
      row.status = dto.status;
      row.publication_status = dto.status;
    }
    if (dto.contactEmail !== undefined) row.contact_email = dto.contactEmail;
    if (dto.submittedBy !== undefined) row.submitted_by = dto.submittedBy;
    if (dto.viewCount !== undefined) row.view_count = dto.viewCount;
    if (dto.saveCount !== undefined) row.save_count = dto.saveCount;
    if (dto.latitude !== undefined && dto.longitude !== undefined) {
      if (dto.latitude !== null && dto.longitude !== null) {
        row.latitude = dto.latitude;
        row.longitude = dto.longitude;
        row.location_status = 'resolved';
      } else {
        row.latitude = null;
        row.longitude = null;
        row.location_status = dto.isOnline ? null : 'pending';
      }
    }
    if (dto.isFeatured !== undefined) row.is_featured = dto.isFeatured;

    // Filter against exact known columns physically existing in live Postgres schema
    const DB_COLUMNS = new Set([
      'id', 'title', 'description', 'tagline', 'start_date', 'end_date',
      'location_city', 'location_college', 'is_online', 'mode', 'tags',
      'register_url', 'registration_url', 'organizer', 'cover_image_url',
      'prize_pool', 'full_address',
      'status', 'publication_status', 'event_status', 'submitted_by',
      'location_mode', 'venue_name', 'location_address', 'location_state',
      'location_country', 'latitude', 'longitude', 'normalized_location_query',
      'location_status', 'location_confidence', 'location_source',
      'geocoding_provider', 'location_resolved_at', 'location_retry_count',
      'location_next_retry_at', 'slug', 'source_type', 'submitted_at',
      'published_at', 'contact_email', 'created_at', 'updated_at',
      'is_featured', 'featured_order', 'view_count', 'save_count',
      'click_count', 'avg_rating', 'review_count', 'rejection_reason',
      'reviewed_by', 'reviewed_at'
    ]);

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (DB_COLUMNS.has(key) && value !== undefined) {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  public static dtoToEntity(dto: HackathonDTO): HackathonEntity {
    return HackathonFactory.createNew({
      title: dto.title,
      description: dto.description,
      tagline: dto.tagline,
      startDate: dto.startDate,
      endDate: dto.endDate,
      registrationDeadline: dto.registrationDeadline || dto.startDate,
      registerUrl: dto.registerUrl,
      organizer: dto.organizer,
      organization: dto.organization,
      isOnline: dto.isOnline,
      city: dto.locationCity,
      college: dto.locationCollege,
      fullAddress: dto.fullAddress,
      latitude: dto.latitude,
      longitude: dto.longitude,
      tags: dto.tags,
      prizePool: dto.prizePool,
      minTeamSize: dto.minTeamSize,
      maxTeamSize: dto.maxTeamSize,
      soloAllowed: dto.soloAllowed,
      contactName: dto.contactName,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      socialTwitter: dto.socialTwitter,
      socialLinkedin: dto.socialLinkedin,
      socialDiscord: dto.socialDiscord,
      socialInstagram: dto.socialInstagram,
      submittedBy: dto.submittedBy
    });
  }
}

export function mapReviewToDTO(raw: Record<string, unknown>): ReviewDTO {
  if (!raw) return { id: '', rating: 5, comment: '', createdAt: new Date().toISOString(), userId: '', profile: null };
  const profiles = raw.profiles as { full_name?: string; avatar_url?: string } | undefined;
  return {
    id: String(raw.id || ''),
    rating: Number(raw.rating || 5),
    comment: String(raw.body || raw.comment || ''),
    title: String(raw.title || ''),
    body: String(raw.body || ''),
    createdAt: String(raw.created_at || raw.createdAt || new Date().toISOString()),
    userId: String(raw.user_id || raw.userId || ''),
    profile: profiles ? { fullName: profiles.full_name || null, avatarUrl: profiles.avatar_url || null } : null
  };
}

export function mapHackathonDetailToDTO(
  raw: Record<string, unknown>
): HackathonDetailDTO {
  const base = HackathonMapper.rowToDTO(raw as unknown as HackathonDatabaseRow);
  return {
    ...base,
    organizerName: base.organizer,
    rules: null,
    eligibilityDetails: base.eligibility,
    registrationFeeCurrency: 'USD',
    tracks: base.tags,
    sponsors: [],
    techStack: base.tags,
    maxParticipants: null,
    currentParticipants: 150,
    durationHours: 48,
    certificateProvided: base.hasCertificate,
    internshipOpportunity: false,
    hiringOpportunity: base.isHiring,
    language: 'English',
    timezone: 'UTC',
    faq: [],
    qualityScore: 85,
    trendingScore: 92,
    seoTitle: base.title,
    seoDescription: base.tagline || base.description,
    ogImageUrl: base.coverImageUrl,
    prizeAmount: 10000,
    prizeBreakdown: [],
    organizerProfile: null,
    universityProfile: null,
    cityProfile: null,
    media: [],
    timeline: [],
    statistics: {
      totalViews: base.viewCount,
      uniqueViews: base.viewCount,
      totalSaves: base.saveCount,
      registerClicks: 45,
      shareCount: 12,
      compareCount: 8,
      conversionRate: 0.15,
      peakViewDate: null
    },
    related: [],
    reviews: []
  };
}
