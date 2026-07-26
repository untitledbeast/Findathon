import { HackathonDTO } from '../../application/dtos/HackathonDTO';

export interface HackathonCardViewModel {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  coverImage: string;
  logoUrl: string;
  organizerName: string;
  locationLabel: string;
  isOnline: boolean;
  formattedPrize: string;
  statusText: string;
  statusColor: string;
  daysRemainingText: string;
  formattedStartDate: string;
  formattedDeadline: string;
  ratingText: string;
  reviewsCountText: string;
  tagsList: string[];
}

export function createHackathonCardViewModel(dto: HackathonDTO): HackathonCardViewModel {
  const startDate = new Date(dto.startDate);
  const deadline = new Date(dto.registrationDeadline || dto.startDate);
  const now = new Date();

  const diffTime = deadline.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let daysRemainingText = 'Ended';
  let statusText = 'Completed';
  let statusColor = 'bg-slate-500/20 text-slate-400 border-slate-500/30';

  if (diffDays > 0) {
    daysRemainingText = `${diffDays} day${diffDays === 1 ? '' : 's'} left`;
    statusText = 'Registration Open';
    statusColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  } else if (diffDays === 0) {
    daysRemainingText = 'Ends Today';
    statusText = 'Closing Soon';
    statusColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  }

  const formattedStartDate = startDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const formattedDeadline = deadline.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });

  const locationLabel = dto.isOnline
    ? '🌐 Online Event'
    : dto.locationCity
    ? `📍 ${dto.locationCity}${dto.locationCollege ? `, ${dto.locationCollege}` : ''}`
    : '📍 In-Person';

  return {
    id: dto.id,
    title: dto.title,
    slug: dto.slug,
    shortDescription: dto.description.length > 120 ? `${dto.description.substring(0, 117)}...` : dto.description,
    coverImage: dto.coverImage || '/images/default-cover.jpg',
    logoUrl: dto.logoUrl || '/images/default-logo.png',
    organizerName: dto.organizer || 'Findathon Host',
    locationLabel,
    isOnline: dto.isOnline,
    formattedPrize: dto.prizePool || `$${dto.prizeAmount.toLocaleString()}`,
    statusText,
    statusColor,
    daysRemainingText,
    formattedStartDate,
    formattedDeadline,
    ratingText: dto.avgRating ? dto.avgRating.toFixed(1) : '5.0',
    reviewsCountText: `(${dto.reviewsCount} review${dto.reviewsCount === 1 ? '' : 's'})`,
    tagsList: dto.tags.slice(0, 4),
  };
}
