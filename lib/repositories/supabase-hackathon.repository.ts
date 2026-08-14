import { IHackathonRepository } from '../domain/repositories/hackathon.repository.interface';
import { HackathonSearchSpecification } from '../domain/specifications';
import { HackathonDTO, HackathonFilters, PaginationParams, HackathonDatabaseRow } from '@/types';
import { supabase, MOCK_HACKATHONS } from '@/lib/supabase';
import { HackathonMapper } from '../domain/mappers/hackathon.mapper';
import { DatabaseError } from '../errors';

export class SupabaseHackathonRepository implements IHackathonRepository {
  public async findAll(spec: HackathonSearchSpecification): Promise<{ data: HackathonDTO[]; total: number }> {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
        const dtos = MOCK_HACKATHONS.map(h => HackathonMapper.rowToDTO(h as unknown as HackathonDatabaseRow));
        return { data: dtos, total: dtos.length };
      }

      const p = spec.getPagination();
      let query = supabase.from('hackathons').select('*', { count: 'exact' });

      if (spec.props.status) {
        query = query.eq('status', spec.props.status);
      } else {
        query = query.eq('status', 'approved');
      }

      if (spec.props.isOnline !== undefined) {
        query = query.eq('is_online', spec.props.isOnline);
      }

      if (spec.props.tags && spec.props.tags.length > 0) {
        query = query.overlaps('tags', spec.props.tags);
      }

      if (spec.props.city) {
        query = query.ilike('location_city', `%${spec.props.city}%`);
      }

      const offset = p.getOffset();
      query = query.range(offset, offset + p.getPageSize() - 1).order('created_at', { ascending: false });

      const { data, count, error } = await query;
      if (error) throw new DatabaseError(error.message);

      const items = (data || []).map(row => HackathonMapper.rowToDTO(row as unknown as HackathonDatabaseRow));
      return { data: items, total: count || items.length };
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      const dtos = MOCK_HACKATHONS.map(h => HackathonMapper.rowToDTO(h as unknown as HackathonDatabaseRow));
      return { data: dtos, total: dtos.length };
    }
  }

  public async findById(id: string): Promise<HackathonDTO | null> {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
        const found = MOCK_HACKATHONS.find(h => h.id === id) || MOCK_HACKATHONS[0];
        return found ? HackathonMapper.rowToDTO(found as unknown as HackathonDatabaseRow) : null;
      }

      const { data, error } = await supabase.from('hackathons').select('*').eq('id', id).single();
      if (error || !data) return null;

      return HackathonMapper.rowToDTO(data as unknown as HackathonDatabaseRow);
    } catch {
      const found = MOCK_HACKATHONS.find(h => h.id === id) || MOCK_HACKATHONS[0];
      return found ? HackathonMapper.rowToDTO(found as unknown as HackathonDatabaseRow) : null;
    }
  }

  public async findByUserId(userId: string): Promise<HackathonDTO[]> {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
        return MOCK_HACKATHONS.map(h => HackathonMapper.rowToDTO(h as unknown as HackathonDatabaseRow));
      }

      const { data, error } = await supabase.from('hackathons').select('*').eq('submitted_by', userId).order('created_at', { ascending: false });
      if (error || !data) return [];

      return data.map(row => HackathonMapper.rowToDTO(row as unknown as HackathonDatabaseRow));
    } catch {
      return MOCK_HACKATHONS.map(h => HackathonMapper.rowToDTO(h as unknown as HackathonDatabaseRow));
    }
  }

  public async create(data: Omit<HackathonDTO, 'id' | 'createdAt' | 'updatedAt' | 'slug' | 'viewCount' | 'saveCount' | 'avgRating' | 'reviewCount'>): Promise<HackathonDTO> {
    try {
      const rowPayload = HackathonMapper.dtoToRow(data as Partial<HackathonDTO>);
      rowPayload.created_at = new Date().toISOString();

      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
        const mockRow = { ...rowPayload, id: `hack_${Date.now()}` } as unknown as HackathonDatabaseRow;
        return HackathonMapper.rowToDTO(mockRow);
      }

      const { data: inserted, error } = await supabase.from('hackathons').insert([rowPayload]).select().single();
      if (error || !inserted) throw new DatabaseError(error?.message || 'Failed to create hackathon');

      return HackathonMapper.rowToDTO(inserted as unknown as HackathonDatabaseRow);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Database write operation failed');
    }
  }

  public async update(id: string, data: Partial<HackathonDTO>): Promise<HackathonDTO> {
    try {
      const rowPayload = HackathonMapper.dtoToRow(data);

      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
        const existing = await this.findById(id);
        return { ...(existing || {}), ...data, updatedAt: new Date().toISOString() } as HackathonDTO;
      }

      const { data: updated, error } = await supabase.from('hackathons').update(rowPayload).eq('id', id).select().single();
      if (error || !updated) throw new DatabaseError(error?.message || 'Failed to update hackathon');

      return HackathonMapper.rowToDTO(updated as unknown as HackathonDatabaseRow);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to update hackathon');
    }
  }

  public async updateStatus(id: string, status: string): Promise<void> {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) return;
      const { error } = await supabase.from('hackathons').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw new DatabaseError(error.message);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
    }
  }

  public async incrementViewCount(id: string): Promise<void> {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) return;
      await supabase.rpc('increment_view_count', { hackathon_id: id });
    } catch {
      // Fire and forget
    }
  }

  public async search(query: string, filters: HackathonFilters, pagination: PaginationParams): Promise<{ data: HackathonDTO[]; total: number }> {
    try {
      let builder = supabase.from('hackathons').select('*', { count: 'exact' });
      if (query?.trim()) {
        builder = builder.textSearch('search_vector', query.trim(), { type: 'websearch' });
      }
      if (filters.city) builder = builder.ilike('location_city', `%${filters.city}%`);
      if (filters.mode) builder = builder.eq('mode', filters.mode);
      if (filters.isOnline !== undefined) builder = builder.eq('is_online', filters.isOnline);
      if (filters.tags && filters.tags.length > 0) builder = builder.overlaps('tags', filters.tags);

      const offset = (pagination.page - 1) * pagination.pageSize;
      builder = builder.range(offset, offset + pagination.pageSize - 1).order('created_at', { ascending: false });

      const { data, count, error } = await builder;
      if (error || !data) {
        const dtos = MOCK_HACKATHONS.map(h => HackathonMapper.rowToDTO(h as unknown as HackathonDatabaseRow));
        return { data: dtos, total: dtos.length };
      }

      const dtos = data.map(row => HackathonMapper.rowToDTO(row as unknown as HackathonDatabaseRow));
      return { data: dtos, total: count || dtos.length };
    } catch {
      const dtos = MOCK_HACKATHONS.map(h => HackathonMapper.rowToDTO(h as unknown as HackathonDatabaseRow));
      return { data: dtos, total: dtos.length };
    }
  }
}
