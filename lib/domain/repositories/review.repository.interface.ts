import { ReviewDTO, PaginationParams } from '@/types';

export interface IReviewRepository {
  findByHackathon(hackathonId: string, pagination: PaginationParams): Promise<{ data: ReviewDTO[]; total: number }>;
  findByUser(userId: string): Promise<ReviewDTO[]>;
  findOne(userId: string, hackathonId: string): Promise<ReviewDTO | null>;
  create(data: Omit<ReviewDTO, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReviewDTO>;
  update(id: string, data: Partial<ReviewDTO>): Promise<ReviewDTO>;
  delete(id: string): Promise<void>;
  getAverageRating(hackathonId: string): Promise<number>;
}
