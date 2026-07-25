import { HackathonDTO, PaginationParams, HackathonFilters } from '@/types';
import { HackathonSearchSpecification } from '../specifications';

export interface IHackathonRepository {
  findAll(spec: HackathonSearchSpecification): Promise<{ data: HackathonDTO[]; total: number }>;
  findById(id: string): Promise<HackathonDTO | null>;
  findByUserId(userId: string): Promise<HackathonDTO[]>;
  create(data: Omit<HackathonDTO, 'id' | 'createdAt' | 'updatedAt' | 'slug' | 'viewCount' | 'saveCount' | 'avgRating' | 'reviewCount'>): Promise<HackathonDTO>;
  update(id: string, data: Partial<HackathonDTO>): Promise<HackathonDTO>;
  updateStatus(id: string, status: string): Promise<void>;
  incrementViewCount(id: string): Promise<void>;
  search(query: string, filters: HackathonFilters, pagination: PaginationParams): Promise<{ data: HackathonDTO[]; total: number }>;
}
