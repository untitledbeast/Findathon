export interface HackathonDTO {
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
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'archived';
  viewsCount: number;
  avgRating: number;
  reviewsCount: number;
  submittedBy?: string;
  createdAt: string;
  updatedAt: string;
}
