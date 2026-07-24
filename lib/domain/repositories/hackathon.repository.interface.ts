import { RichHackathon, HackathonDetail } from '@/lib/domain/hackathon.repository';
import { HackathonFilters } from '@/lib/database/filters/hackathon.filters';

export interface IHackathonRepository {
  getById(id: string): Promise<HackathonDetail | null>;
  getList(filters?: HackathonFilters): Promise<RichHackathon[]>;
  create(data: Partial<RichHackathon>): Promise<RichHackathon | null>;
  update(id: string, data: Partial<RichHackathon>): Promise<RichHackathon | null>;
  updateStatus(id: string, status: string): Promise<boolean>;
}
