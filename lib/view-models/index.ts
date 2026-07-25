import { HackathonDTO, ReviewDTO, NotificationDTO } from '@/types';

export interface HackathonCardViewModel {
  id: string;
  title: string;
  tagline: string;
  locationDisplay: string;
  isOnline: boolean;
  startDateFormatted: string;
  endDateFormatted: string;
  daysRemaining: number;
  prizePoolFormatted: string;
  tags: string[];
  coverImageUrl: string;
  avgRating: number;
  isSaved: boolean;
  submittedBy: string | null;
}

export function toHackathonCardViewModel(dto: HackathonDTO, isSaved = false): HackathonCardViewModel {
  const start = new Date(dto.startDate);
  const end = new Date(dto.endDate);
  const deadline = dto.registrationDeadline ? new Date(dto.registrationDeadline) : start;
  const daysRemaining = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return {
    id: dto.id,
    title: dto.title,
    tagline: dto.tagline || dto.description.slice(0, 100),
    locationDisplay: dto.isOnline ? 'Online' : (dto.locationCity ? `${dto.locationCity}${dto.locationCollege ? `, ${dto.locationCollege}` : ''}` : 'In-Person'),
    isOnline: dto.isOnline,
    startDateFormatted: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    endDateFormatted: end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    daysRemaining,
    prizePoolFormatted: dto.prizePool || 'Swag & Certificates',
    tags: dto.tags || [],
    coverImageUrl: dto.coverImageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
    avgRating: dto.avgRating || 4.8,
    isSaved,
    submittedBy: dto.submittedBy
  };
}

export interface ReviewViewModel {
  id: string;
  authorName: string;
  authorAvatar: string | null;
  rating: number;
  title: string;
  body: string;
  dateFormatted: string;
}

export function toReviewViewModel(dto: ReviewDTO): ReviewViewModel {
  const created = new Date(dto.createdAt);
  return {
    id: dto.id,
    authorName: dto.profile?.fullName || 'Developer',
    authorAvatar: dto.profile?.avatarUrl || null,
    rating: dto.rating,
    title: dto.title,
    body: dto.body,
    dateFormatted: created.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  };
}

export interface NotificationViewModel {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  timeAgo: string;
}

export function toNotificationViewModel(dto: NotificationDTO): NotificationViewModel {
  const created = new Date(dto.createdAt);
  const diffHours = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60));
  let timeAgo = `${diffHours} hours ago`;
  if (diffHours < 1) timeAgo = 'Just now';
  else if (diffHours >= 24) timeAgo = `${Math.floor(diffHours / 24)} days ago`;

  return {
    id: dto.id,
    title: dto.title,
    body: dto.body,
    isRead: dto.isRead,
    timeAgo
  };
}
