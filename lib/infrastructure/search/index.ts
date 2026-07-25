import { HackathonDTO, HackathonFilters, PaginationParams } from '@/types';
import { supabase } from '@/lib/supabase';
import { HackathonMapper } from '@/lib/domain/mappers/hackathon.mapper';
import { HackathonDatabaseRow } from '@/types';

export interface ISearchProvider {
  search(query: string, filters: HackathonFilters, pagination: PaginationParams): Promise<{ data: HackathonDTO[]; total: number }>;
}

export class SupabaseSearchProvider implements ISearchProvider {
  public async search(query: string, filters: HackathonFilters, pagination: PaginationParams): Promise<{ data: HackathonDTO[]; total: number }> {
    let builder = supabase.from('hackathons').select('*', { count: 'exact' });

    if (query?.trim()) {
      builder = builder.textSearch('search_vector', query.trim(), { type: 'websearch' });
    }

    if (filters.city) {
      builder = builder.ilike('location_city', `%${filters.city}%`);
    }

    if (filters.mode) {
      builder = builder.eq('mode', filters.mode);
    }

    if (filters.isOnline !== undefined) {
      builder = builder.eq('is_online', filters.isOnline);
    }

    if (filters.tags && filters.tags.length > 0) {
      builder = builder.overlaps('tags', filters.tags);
    }

    const from = (pagination.page - 1) * pagination.pageSize;
    const to = from + pagination.pageSize - 1;

    builder = builder.range(from, to).order('created_at', { ascending: false });

    const { data, count, error } = await builder;
    if (error || !data) {
      return { data: [], total: 0 };
    }

    const hackathons = data.map(row => HackathonMapper.rowToDTO(row as unknown as HackathonDatabaseRow));
    return { data: hackathons, total: count || hackathons.length };
  }
}
