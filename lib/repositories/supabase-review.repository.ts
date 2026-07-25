import { IReviewRepository } from '../domain/repositories/review.repository.interface';
import { ReviewDTO, PaginationParams, ReviewDatabaseRow } from '@/types';
import { supabase } from '@/lib/supabase';
import { ReviewMapper } from '../domain/mappers/review.mapper';
import { DatabaseError } from '../errors';

export class SupabaseReviewRepository implements IReviewRepository {
  public async findByHackathon(hackathonId: string, pagination: PaginationParams): Promise<{ data: ReviewDTO[]; total: number }> {
    try {
      const offset = (pagination.page - 1) * pagination.pageSize;
      const { data, count, error } = await supabase
        .from('reviews')
        .select('*, profiles(*)', { count: 'exact' })
        .eq('hackathon_id', hackathonId)
        .range(offset, offset + pagination.pageSize - 1)
        .order('created_at', { ascending: false });

      if (error || !data) return { data: [], total: 0 };

      const reviews = data.map(row => ReviewMapper.rowToDTO(row as unknown as ReviewDatabaseRow));
      return { data: reviews, total: count || reviews.length };
    } catch {
      return { data: [], total: 0 };
    }
  }

  public async findByUser(userId: string): Promise<ReviewDTO[]> {
    try {
      const { data, error } = await supabase.from('reviews').select('*, profiles(*)').eq('user_id', userId);
      if (error || !data) return [];
      return data.map(row => ReviewMapper.rowToDTO(row as unknown as ReviewDatabaseRow));
    } catch {
      return [];
    }
  }

  public async findOne(userId: string, hackathonId: string): Promise<ReviewDTO | null> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, profiles(*)')
        .eq('user_id', userId)
        .eq('hackathon_id', hackathonId)
        .maybeSingle();

      if (error || !data) return null;
      return ReviewMapper.rowToDTO(data as unknown as ReviewDatabaseRow);
    } catch {
      return null;
    }
  }

  public async create(data: Omit<ReviewDTO, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReviewDTO> {
    try {
      const payload = ReviewMapper.dtoToRow(data);
      payload.created_at = new Date().toISOString();
      payload.updated_at = new Date().toISOString();

      const { data: inserted, error } = await supabase.from('reviews').insert([payload]).select('*, profiles(*)').single();
      if (error || !inserted) throw new DatabaseError(error?.message || 'Failed to create review');

      return ReviewMapper.rowToDTO(inserted as unknown as ReviewDatabaseRow);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to save review');
    }
  }

  public async update(id: string, data: Partial<ReviewDTO>): Promise<ReviewDTO> {
    try {
      const payload = ReviewMapper.dtoToRow(data);
      payload.updated_at = new Date().toISOString();

      const { data: updated, error } = await supabase.from('reviews').update(payload).eq('id', id).select('*, profiles(*)').single();
      if (error || !updated) throw new DatabaseError(error?.message || 'Failed to update review');

      return ReviewMapper.rowToDTO(updated as unknown as ReviewDatabaseRow);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to update review');
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('reviews').delete().eq('id', id);
      if (error) throw new DatabaseError(error.message);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
    }
  }

  public async getAverageRating(hackathonId: string): Promise<number> {
    try {
      const { data, error } = await supabase.from('reviews').select('rating').eq('hackathon_id', hackathonId);
      if (error || !data || data.length === 0) return 5.0;

      const sum = data.reduce((acc, r) => acc + Number(r.rating || 0), 0);
      return Math.round((sum / data.length) * 10) / 10;
    } catch {
      return 5.0;
    }
  }
}
