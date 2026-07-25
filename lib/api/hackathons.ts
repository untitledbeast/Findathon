import { apiClient } from './client';
import { HackathonDTO, SearchResultDTO, HackathonFilters, PaginationParams } from '@/types';

export const hackathonsApi = {
  getAll: async (filters: HackathonFilters = {}, pagination: PaginationParams = { page: 1, pageSize: 12 }): Promise<SearchResultDTO> => {
    const params = new URLSearchParams();
    if (filters.query) params.set('query', filters.query);
    if (filters.city) params.set('city', filters.city);
    if (filters.mode) params.set('mode', filters.mode);
    if (filters.isOnline !== undefined) params.set('isOnline', String(filters.isOnline));
    if (filters.tags && filters.tags.length > 0) params.set('tags', filters.tags.join(','));
    params.set('page', String(pagination.page));
    params.set('pageSize', String(pagination.pageSize));

    return apiClient<SearchResultDTO>(`/api/v1/hackathons?${params.toString()}`);
  },

  getById: async (id: string): Promise<HackathonDTO> => {
    return apiClient<HackathonDTO>(`/api/v1/hackathons/${id}`);
  },

  create: async (data: Partial<HackathonDTO>): Promise<HackathonDTO> => {
    return apiClient<HackathonDTO>('/api/v1/hackathons', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  update: async (id: string, data: Partial<HackathonDTO>): Promise<HackathonDTO> => {
    return apiClient<HackathonDTO>(`/api/v1/hackathons/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  approve: async (id: string): Promise<void> => {
    return apiClient<void>(`/api/v1/hackathons/${id}/approve`, {
      method: 'POST'
    });
  }
};
