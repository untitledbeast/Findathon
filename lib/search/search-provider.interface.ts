import { HackathonCard } from '@/lib/types/hackathon';
import { HackathonFilters } from '@/lib/database/filters/hackathon.filters';

export interface ISearchProvider {
  search(query: string, filters?: HackathonFilters): Promise<{ data: HackathonCard[]; total: number }>;
}
