import { IBookmarkRepository } from '../domain/repositories/bookmark.repository.interface';
import { BookmarkDTO, HackathonDatabaseRow } from '@/types';
import { supabase, MOCK_HACKATHONS } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { HackathonMapper } from '../domain/mappers/hackathon.mapper';
import { DatabaseError } from '../errors';

export class SupabaseBookmarkRepository implements IBookmarkRepository {
  private async getClient() {
    if (typeof window === 'undefined') {
      try {
        return await createSupabaseServerClient();
      } catch {
        return supabase;
      }
    }
    return supabase;
  }

  public async findByUser(userId: string): Promise<BookmarkDTO[]> {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
        return MOCK_HACKATHONS.map(h => ({
          id: `bm-${h.id}`,
          userId,
          hackathonId: h.id,
          savedAt: new Date().toISOString(),
          hackathon: HackathonMapper.rowToDTO(h as unknown as HackathonDatabaseRow)
        }));
      }

      const client = await this.getClient();
      const { data, error } = await client.from('saved_hackathons').select('*, hackathons(*)').eq('user_id', userId);
      if (error || !data) return [];

      return data.map(row => ({
        id: row.id,
        userId: row.user_id,
        hackathonId: row.hackathon_id,
        savedAt: row.saved_at || new Date().toISOString(),
        hackathon: row.hackathons ? HackathonMapper.rowToDTO(row.hackathons as unknown as HackathonDatabaseRow) : null
      }));
    } catch {
      return [];
    }
  }

  public async findOne(userId: string, hackathonId: string): Promise<BookmarkDTO | null> {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
        return null;
      }

      const client = await this.getClient();
      const { data, error } = await client
        .from('saved_hackathons')
        .select('*')
        .eq('user_id', userId)
        .eq('hackathon_id', hackathonId)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.id,
        userId: data.user_id,
        hackathonId: data.hackathon_id,
        savedAt: data.saved_at || new Date().toISOString()
      };
    } catch {
      return null;
    }
  }

  public async create(userId: string, hackathonId: string): Promise<BookmarkDTO> {
    try {
      const payload = { user_id: userId, hackathon_id: hackathonId, saved_at: new Date().toISOString() };
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
        return { id: `bm-${Date.now()}`, userId, hackathonId, savedAt: payload.saved_at };
      }

      const client = await this.getClient();
      const { data, error } = await client.from('saved_hackathons').insert([payload]).select().single();
      if (error || !data) throw new DatabaseError(error?.message || 'Failed to save bookmark');

      return { id: data.id, userId: data.user_id, hackathonId: data.hackathon_id, savedAt: data.saved_at };
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to save bookmark');
    }
  }

  public async delete(userId: string, hackathonId: string): Promise<void> {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) return;
      const client = await this.getClient();
      const { error } = await client.from('saved_hackathons').delete().eq('user_id', userId).eq('hackathon_id', hackathonId);
      if (error) throw new DatabaseError(error.message);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
    }
  }

  public async countByHackathon(hackathonId: string): Promise<number> {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) return 12;
      const client = await this.getClient();
      const { count, error } = await client.from('saved_hackathons').select('*', { count: 'exact', head: true }).eq('hackathon_id', hackathonId);
      if (error) return 0;
      return count || 0;
    } catch {
      return 0;
    }
  }
}
