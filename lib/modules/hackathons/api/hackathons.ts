import { transportClient } from '@/lib/transport/http-client';
import { HackathonDTO } from '../application/dtos/HackathonDTO';
import { HackathonSearchFilters } from '../domain/specifications/HackathonSearchSpecification';

export const hackathonsApi = {
  getById: async (id: string): Promise<HackathonDTO> => {
    return transportClient<HackathonDTO>(`/api/v1/hackathons/${id}`);
  },

  search: async (filters: HackathonSearchFilters): Promise<{ hackathons: HackathonDTO[]; total: number; cursor?: string; took: number }> => {
    const params = new URLSearchParams();
    if (filters.query) params.set('query', filters.query);
    if (filters.city) params.set('city', filters.city);
    if (filters.isOnline !== undefined) params.set('isOnline', String(filters.isOnline));
    if (filters.tags && filters.tags.length > 0) params.set('tags', filters.tags.join(','));
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.cursor) params.set('cursor', filters.cursor);
    if (filters.limit) params.set('limit', String(filters.limit));

    return transportClient<{ hackathons: HackathonDTO[]; total: number; cursor?: string; took: number }>(
      `/api/v1/hackathons/search?${params.toString()}`
    );
  },

  update: async (id: string, fields: Partial<HackathonDTO>): Promise<HackathonDTO> => {
    return transportClient<HackathonDTO>(`/api/v1/hackathons/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(fields)
    });
  }
};
