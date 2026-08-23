import {
  formatPrize,
  formatDate,
  formatDateRange,
  getDaysUntil,
  normalizeUrl,
  isValidExternalUrl,
  getSafeImageUrl,
  formatRating,
  formatCount,
  DEFAULT_HACKATHON_COVER
} from './formatters';

export interface NormalizedHackathonDetail {
  id: string;
  title: string;
  slug: string;
  description: string;
  tagline: string | null;
  startDate: string;
  endDate: string;
  formattedDates: string;
  registrationDeadline: string | null;
  formattedDeadline: string;
  deadlineStatus: {
    days: number;
    isPast: boolean;
    isToday: boolean;
    label: string;
  };
  isOnline: boolean;
  mode: 'online' | 'offline' | 'hybrid';
  locationCity: string | null;
  locationCollege: string | null;
  fullAddress: string | null;
  locationDisplay: string;
  venueDisplay: string;
  prizePool: string;
  prizeAmount: number;
  prizeDisplay: string;
  registerUrl: string;
  hasValidRegisterUrl: boolean;
  organizer: string;
  organization: string | null;
  organizerInitial: string;
  coverImageUrl: string;
  status: 'pending' | 'approved' | 'rejected' | 'archived';
  isApproved: boolean;
  isPending: boolean;
  tags: string[];
  avgRating: number;
  formattedRating: string;
  reviewCount: number;
  formattedReviewCount: string;
  viewCount: number;
  saveCount: number;
  minTeamSize: number;
  maxTeamSize: number;
  teamSizeDisplay: string;
  soloAllowed: boolean;
  eligibility: string;
  registrationFee: string;
  isVerified: boolean;
  isFeatured: boolean;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'open';
  hasCertificate: boolean;
  isHiring: boolean;
  submittedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Universally normalizes any raw hackathon object (from DB row, API DTO, or submission)
 * into a guaranteed non-crashing UI model.
 */
export function normalizeHackathonDetail(raw: unknown): NormalizedHackathonDetail {
  const item = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const id = String(item.id || item._id || crypto.randomUUID());
  const title = String(item.title || 'Untitled Hackathon').trim();
  const slug = String(item.slug || title.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-') || `hackathon-${id}`);
  const description = String(item.description || item.tagline || 'No description provided.').trim();
  const tagline = item.tagline ? String(item.tagline).trim() : null;

  // Dates
  const nowIso = new Date().toISOString();
  const startDate = String(item.startDate || item.start_date || nowIso);
  const endDate = String(item.endDate || item.end_date || startDate);
  const registrationDeadline = item.registrationDeadline || item.registration_deadline
    ? String(item.registrationDeadline || item.registration_deadline)
    : null;

  const formattedDates = formatDateRange(startDate, endDate);
  const formattedDeadline = formatDate(registrationDeadline || startDate);
  const deadlineStatus = getDaysUntil(registrationDeadline || startDate);

  // Online / Mode / Location
  const isOnline = item.isOnline !== undefined
    ? Boolean(item.isOnline)
    : item.is_online !== undefined
      ? Boolean(item.is_online)
      : false;

  const rawMode = String(item.mode || '').toLowerCase();
  const mode: 'online' | 'offline' | 'hybrid' =
    rawMode === 'online' || rawMode === 'offline' || rawMode === 'hybrid'
      ? rawMode
      : isOnline
        ? 'online'
        : 'offline';

  const locationCity = item.locationCity || item.location_city ? String(item.locationCity || item.location_city).trim() : null;
  const locationCollege = item.locationCollege || item.location_college ? String(item.locationCollege || item.location_college).trim() : null;
  const fullAddress = item.fullAddress || item.full_address ? String(item.fullAddress || item.full_address).trim() : null;

  const locationDisplay = isOnline
    ? 'Worldwide 🌐'
    : locationCity || 'In-Person';

  const venueDisplay = isOnline
    ? 'Virtual Event'
    : locationCollege || fullAddress || 'Venue details inside';

  // Prize
  const rawPrizePool = item.prizePool || item.prize_pool ? String(item.prizePool || item.prize_pool) : null;
  const rawPrizeAmount = item.prizeAmount !== undefined
    ? Number(item.prizeAmount)
    : item.prize_amount !== undefined
      ? Number(item.prize_amount)
      : undefined;

  const prizeDisplay = formatPrize(rawPrizePool, rawPrizeAmount);
  const prizeAmount = typeof rawPrizeAmount === 'number' && !isNaN(rawPrizeAmount) ? rawPrizeAmount : 0;
  const prizePool = rawPrizePool || prizeDisplay;

  // Registration URL
  const rawRegisterUrl = item.registerUrl || item.register_url || item.registrationUrl || item.registration_url;
  const registerUrl = normalizeUrl(rawRegisterUrl ? String(rawRegisterUrl) : null, `/hackathons/${id}`);
  const hasValidRegisterUrl = isValidExternalUrl(registerUrl);

  // Organizer
  const organizer = String(item.organizer || item.organization || 'Community Organizer').trim();
  const organization = item.organization ? String(item.organization).trim() : null;
  const organizerInitial = organizer.length > 0 ? organizer.charAt(0).toUpperCase() : 'H';

  // Cover Image
  const rawCover = item.coverImageUrl || item.cover_image_url || item.coverImage || item.cover_image;
  const coverImageUrl = getSafeImageUrl(rawCover ? String(rawCover) : null, DEFAULT_HACKATHON_COVER);

  // Status
  const rawStatus = String(item.status || 'approved').toLowerCase();
  const status: 'pending' | 'approved' | 'rejected' | 'archived' =
    rawStatus === 'pending' || rawStatus === 'approved' || rawStatus === 'rejected' || rawStatus === 'archived'
      ? rawStatus
      : 'approved';

  // Tags
  const tags = Array.isArray(item.tags)
    ? (item.tags as string[]).map(t => String(t).trim()).filter(Boolean)
    : [];

  // Ratings & Counts
  const avgRating = Number(item.avgRating || item.avg_rating || 5.0);
  const formattedRating = formatRating(avgRating);
  const reviewCount = Number(item.reviewCount || item.review_count || item.reviewsCount || item.reviews_count || 0);
  const formattedReviewCount = formatCount(reviewCount);
  const viewCount = Number(item.viewCount || item.view_count || item.viewsCount || item.views_count || 0);
  const saveCount = Number(item.saveCount || item.save_count || item.savesCount || item.saves_count || 0);

  // Team & Eligibility
  const minTeamSize = Number(item.minTeamSize || item.min_team_size || 1);
  const maxTeamSize = Number(item.maxTeamSize || item.max_team_size || 4);
  const teamSizeDisplay = minTeamSize === maxTeamSize
    ? `${minTeamSize} ${minTeamSize === 1 ? 'Member' : 'Members'}`
    : `${minTeamSize} – ${maxTeamSize} Members`;

  const soloAllowed = item.soloAllowed !== undefined
    ? Boolean(item.soloAllowed)
    : item.solo_allowed !== undefined
      ? Boolean(item.solo_allowed)
      : true;

  const eligibility = String(item.eligibility || 'Open to all developers and students worldwide.').trim();
  const registrationFee = String(item.registrationFee || item.registration_fee || 'Free').trim();

  // Badges & Features
  const isVerified = Boolean(item.isVerified || item.is_verified || status === 'approved');
  const isFeatured = Boolean(item.isFeatured || item.is_featured);
  const rawDifficulty = String(item.difficulty || 'open').toLowerCase();
  const difficulty: 'beginner' | 'intermediate' | 'advanced' | 'open' =
    rawDifficulty === 'beginner' || rawDifficulty === 'intermediate' || rawDifficulty === 'advanced'
      ? rawDifficulty
      : 'open';

  const hasCertificate = Boolean(item.hasCertificate || item.has_certificate);
  const isHiring = Boolean(item.isHiring || item.is_hiring);
  const submittedBy = item.submittedBy || item.submitted_by ? String(item.submittedBy || item.submitted_by) : null;
  const createdAt = String(item.createdAt || item.created_at || nowIso);
  const updatedAt = String(item.updatedAt || item.updated_at || nowIso);

  return {
    id,
    title,
    slug,
    description,
    tagline,
    startDate,
    endDate,
    formattedDates,
    registrationDeadline,
    formattedDeadline,
    deadlineStatus,
    isOnline,
    mode,
    locationCity,
    locationCollege,
    fullAddress,
    locationDisplay,
    venueDisplay,
    prizePool,
    prizeAmount,
    prizeDisplay,
    registerUrl,
    hasValidRegisterUrl,
    organizer,
    organization,
    organizerInitial,
    coverImageUrl,
    status,
    isApproved: status === 'approved',
    isPending: status === 'pending',
    tags,
    avgRating,
    formattedRating,
    reviewCount,
    formattedReviewCount,
    viewCount,
    saveCount,
    minTeamSize,
    maxTeamSize,
    teamSizeDisplay,
    soloAllowed,
    eligibility,
    registrationFee,
    isVerified,
    isFeatured,
    difficulty,
    hasCertificate,
    isHiring,
    submittedBy,
    createdAt,
    updatedAt
  };
}
