import { IUserBlockRepository } from '../domain/repositories/user-block.repository.interface';
import { UserBlockEntity } from '../domain/entities/user-block.entity';
import { supabase } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { DatabaseError } from '../errors';

export class SupabaseUserBlockRepository implements IUserBlockRepository {
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

  public async blockUser(block: UserBlockEntity): Promise<UserBlockEntity> {
    try {
      const client = await this.getClient();
      const payload = {
        id: block.id,
        blocker_user_id: block.blockerUserId,
        blocked_user_id: block.blockedUserId,
        created_at: new Date(block.createdAt).toISOString()
      };

      const { data, error } = await client
        .from('user_blocks')
        .upsert([payload], { onConflict: 'blocker_user_id,blocked_user_id' })
        .select('*')
        .single();

      if (error || !data) {
        console.error('[UserBlockRepository.blockUser] error:', error);
        throw new DatabaseError(error?.message || 'Failed to block user');
      }

      return new UserBlockEntity({
        id: data.id,
        blockerUserId: data.blocker_user_id,
        blockedUserId: data.blocked_user_id,
        createdAt: new Date(data.created_at).getTime()
      });
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to block user');
    }
  }

  public async unblockUser(blockerUserId: string, blockedUserId: string): Promise<void> {
    try {
      const client = await this.getClient();
      const { error } = await client
        .from('user_blocks')
        .delete()
        .eq('blocker_user_id', blockerUserId)
        .eq('blocked_user_id', blockedUserId);

      if (error) {
        console.error('[UserBlockRepository.unblockUser] error:', error);
        throw new DatabaseError(error.message);
      }
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to unblock user');
    }
  }

  public async getBlock(blockerUserId: string, blockedUserId: string): Promise<UserBlockEntity | null> {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from('user_blocks')
        .select('*')
        .eq('blocker_user_id', blockerUserId)
        .eq('blocked_user_id', blockedUserId)
        .maybeSingle();

      if (error) {
        console.error('[UserBlockRepository.getBlock] error:', error);
        throw new DatabaseError(error.message);
      }
      if (!data) return null;

      return new UserBlockEntity({
        id: data.id,
        blockerUserId: data.blocker_user_id,
        blockedUserId: data.blocked_user_id,
        createdAt: new Date(data.created_at).getTime()
      });
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to fetch block status');
    }
  }

  public async isBlockedEitherDirection(userA: string, userB: string): Promise<boolean> {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from('user_blocks')
        .select('id')
        .or(`and(blocker_user_id.eq.${userA},blocked_user_id.eq.${userB}),and(blocker_user_id.eq.${userB},blocked_user_id.eq.${userA})`)
        .limit(1);

      if (error) {
        console.error('[UserBlockRepository.isBlockedEitherDirection] error:', error);
        return false;
      }

      return Boolean(data && data.length > 0);
    } catch {
      return false;
    }
  }

  public async getBlockedUserIds(blockerUserId: string): Promise<string[]> {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from('user_blocks')
        .select('blocked_user_id')
        .eq('blocker_user_id', blockerUserId);

      if (error) {
        console.error('[UserBlockRepository.getBlockedUserIds] error:', error);
        return [];
      }

      return (data || []).map(r => r.blocked_user_id);
    } catch {
      return [];
    }
  }

  public async getBlockerUserIds(blockedUserId: string): Promise<string[]> {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from('user_blocks')
        .select('blocker_user_id')
        .eq('blocked_user_id', blockedUserId);

      if (error) {
        console.error('[UserBlockRepository.getBlockerUserIds] error:', error);
        return [];
      }

      return (data || []).map(r => r.blocker_user_id);
    } catch {
      return [];
    }
  }

  public async getAllBlockedOrBlockerIds(userId: string): Promise<Set<string>> {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from('user_blocks')
        .select('blocker_user_id, blocked_user_id')
        .or(`blocker_user_id.eq.${userId},blocked_user_id.eq.${userId}`);

      if (error || !data) return new Set<string>();

      const ids = new Set<string>();
      for (const row of data) {
        if (row.blocker_user_id === userId) ids.add(row.blocked_user_id);
        if (row.blocked_user_id === userId) ids.add(row.blocker_user_id);
      }
      return ids;
    } catch {
      return new Set<string>();
    }
  }
}
