import { apiClient } from './client';
import { SearchResultDTO, HackathonFilters, PaginationParams } from '@/types';

export const searchApi = {
  search: async (query: string, filters: HackathonFilters = {}, pagination: PaginationParams = { page: 1, pageSize: 12 }): Promise<SearchResultDTO> => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (filters.city) params.set('city', filters.city);
    if (filters.mode) params.set('mode', filters.mode);
    if (filters.isOnline !== undefined) params.set('isOnline', String(filters.isOnline));
    if (filters.tags && filters.tags.length > 0) params.set('tags', filters.tags.join(','));
    params.set('page', String(pagination.page));
    params.set('pageSize', String(pagination.pageSize));

    return apiClient<SearchResultDTO>(`/api/v1/hackathons/search?${params.toString()}`);
  }
};
