import { ProfileDTO } from '@/types';

export interface IProfileRepository {
  findById(userId: string): Promise<ProfileDTO | null>;
  upsert(userId: string, data: Partial<ProfileDTO>): Promise<ProfileDTO>;
  findByOrganization(org: string): Promise<ProfileDTO[]>;
}
