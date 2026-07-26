export interface HackathonSearchReadModel {
  id: string;
  title: string;
  slug: string;
  description: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  locationCity?: string;
  locationCollege?: string;
  isOnline: boolean;
  latitude?: number;
  longitude?: number;
  tags: string[];
  prizePool: string;
  prizeAmount: number;
  organizer: string;
  coverImage?: string;
  logoUrl?: string;
  status: string;
  viewsCount: number;
  avgRating: number;
  reviewsCount: number;
}
