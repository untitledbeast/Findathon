import { IConnectionRepository } from '../domain/repositories/connection.repository.interface';
import { ConnectionEntity } from '../domain/entities/connection.entity';
import { ConnectionMapper, ConnectionDatabaseRow } from '../domain/mappers/connection.mapper';
import { supabase } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { DatabaseError } from '../errors';

export class SupabaseConnectionRepository implements IConnectionRepository {
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

  public async createConnection(connection: ConnectionEntity): Promise<ConnectionEntity> {
    try {
      const client = await this.getClient();
      const payload = ConnectionMapper.entityToRow(connection);

      const { data, error } = await client
        .from('connections')
        .insert([payload])
        .select('*')
        .single();

      if (error || !data) {
        console.error('[ConnectionRepository.createConnection] error:', error);
        throw new DatabaseError(error?.message || 'Failed to create connection request');
      }

      return ConnectionMapper.rowToEntity(data as ConnectionDatabaseRow);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to create connection');
    }
  }

  public async getConnectionById(id: string): Promise<ConnectionEntity | null> {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from('connections')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('[ConnectionRepository.getConnectionById] error:', error);
        throw new DatabaseError(error.message);
      }
      if (!data) return null;

      return ConnectionMapper.rowToEntity(data as ConnectionDatabaseRow);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to fetch connection');
    }
  }

  public async getConnectionByPair(userA: string, userB: string): Promise<ConnectionEntity | null> {
    try {
      const { userLowId, userHighId } = ConnectionEntity.getCanonicalPair(userA, userB);
      const client = await this.getClient();

      const { data, error } = await client
        .from('connections')
        .select('*')
        .eq('user_low_id', userLowId)
        .eq('user_high_id', userHighId)
        .maybeSingle();

      if (error) {
        console.error('[ConnectionRepository.getConnectionByPair] error:', error);
        throw new DatabaseError(error.message);
      }
      if (!data) return null;

      return ConnectionMapper.rowToEntity(data as ConnectionDatabaseRow);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to fetch connection by pair');
    }
  }

  public async getAcceptedConnectionsByUserId(userId: string): Promise<ConnectionEntity[]> {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from('connections')
        .select('*')
        .or(`user_low_id.eq.${userId},user_high_id.eq.${userId}`)
        .eq('status', 'accepted')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('[ConnectionRepository.getAcceptedConnectionsByUserId] error:', error);
        throw new DatabaseError(error.message);
      }

      return (data || []).map(row => ConnectionMapper.rowToEntity(row as ConnectionDatabaseRow));
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to fetch connections');
    }
  }

  public async getPendingReceivedRequests(userId: string): Promise<ConnectionEntity[]> {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from('connections')
        .select('*')
        .or(`user_low_id.eq.${userId},user_high_id.eq.${userId}`)
        .neq('initiator_user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[ConnectionRepository.getPendingReceivedRequests] error:', error);
        throw new DatabaseError(error.message);
      }

      return (data || []).map(row => ConnectionMapper.rowToEntity(row as ConnectionDatabaseRow));
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to fetch received requests');
    }
  }

  public async getPendingSentRequests(userId: string): Promise<ConnectionEntity[]> {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from('connections')
        .select('*')
        .eq('initiator_user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[ConnectionRepository.getPendingSentRequests] error:', error);
        throw new DatabaseError(error.message);
      }

      return (data || []).map(row => ConnectionMapper.rowToEntity(row as ConnectionDatabaseRow));
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to fetch sent requests');
    }
  }

  public async updateConnection(connection: ConnectionEntity): Promise<ConnectionEntity> {
    try {
      const client = await this.getClient();
      const payload = ConnectionMapper.entityToRow(connection);

      const { data, error } = await client
        .from('connections')
        .update({
          status: payload.status,
          updated_at: payload.updated_at,
          responded_at: payload.responded_at
        })
        .eq('id', payload.id)
        .select('*')
        .single();

      if (error || !data) {
        console.error('[ConnectionRepository.updateConnection] error:', error);
        throw new DatabaseError(error?.message || 'Failed to update connection');
      }

      return ConnectionMapper.rowToEntity(data as ConnectionDatabaseRow);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to update connection');
    }
  }

  public async deleteConnection(id: string): Promise<void> {
    try {
      const client = await this.getClient();
      const { error } = await client
        .from('connections')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[ConnectionRepository.deleteConnection] error:', error);
        throw new DatabaseError(error.message);
      }
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to delete connection');
    }
  }

  public async isBlocked(userA: string, userB: string): Promise<boolean> {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from('user_blocks')
        .select('id')
        .or(`and(blocker_user_id.eq.${userA},blocked_user_id.eq.${userB}),and(blocker_user_id.eq.${userB},blocked_user_id.eq.${userA})`)
        .limit(1);

      if (error) {
        console.error('[ConnectionRepository.isBlocked] error:', error);
        return false;
      }

      return Boolean(data && data.length > 0);
    } catch {
      return false;
    }
  }
}
