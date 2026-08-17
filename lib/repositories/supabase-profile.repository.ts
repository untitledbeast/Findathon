import { IProfileRepository } from '../domain/repositories/profile.repository.interface';
import { ProfileDTO, ProfileDatabaseRow } from '@/types';
import { supabase } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ProfileMapper } from '../domain/mappers/profile.mapper';
import { DatabaseError } from '../errors';

export class SupabaseProfileRepository implements IProfileRepository {
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

  public async findById(userId: string): Promise<ProfileDTO | null> {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
        return {
          id: userId,
          fullName: 'Developer User',
          avatarUrl: null,
          bio: 'Full-stack developer building cool apps on Findathon!',
          organization: 'Findathon Community',
          phone: '+91 98765 43210',
          website: 'https://findathon.dev',
          socialTwitter: 'devuser',
          socialLinkedin: 'https://linkedin.com/in/devuser',
          socialInstagram: 'devuser',
          socialDiscord: 'devuser#1234',
          role: 'user',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }

      const client = await this.getClient();
      const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (error || !data) return null;

      return ProfileMapper.rowToDTO(data as unknown as ProfileDatabaseRow);
    } catch {
      return null;
    }
  }

  public async upsert(userId: string, data: Partial<ProfileDTO>): Promise<ProfileDTO> {
    try {
      const payload = ProfileMapper.dtoToRow(data);
      payload.id = userId;
      payload.updated_at = new Date().toISOString();

      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
        const existing = await this.findById(userId);
        return { ...(existing || {}), ...data, id: userId } as ProfileDTO;
      }

      const client = await this.getClient();
      const { data: updated, error } = await client.from('profiles').upsert([payload]).select().single();
      if (error || !updated) throw new DatabaseError(error?.message || 'Failed to upsert profile');

      return ProfileMapper.rowToDTO(updated as unknown as ProfileDatabaseRow);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Profile update failed');
    }
  }

  public async findByOrganization(org: string): Promise<ProfileDTO[]> {
    try {
      const client = await this.getClient();
      const { data, error } = await client.from('profiles').select('*').ilike('organization', `%${org}%`);
      if (error || !data) return [];
      return data.map(row => ProfileMapper.rowToDTO(row as unknown as ProfileDatabaseRow));
    } catch {
      return [];
    }
  }
}
