import { INotificationRepository } from '../domain/repositories/notification.repository.interface';
import { NotificationDTO, PaginationParams, NotificationDatabaseRow } from '@/types';
import { supabase } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { NotificationMapper } from '../domain/mappers/notification.mapper';
import { DatabaseError } from '../errors';

export class SupabaseNotificationRepository implements INotificationRepository {
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

  public async findByUser(userId: string, pagination: PaginationParams): Promise<{ data: NotificationDTO[]; total: number }> {
    try {
      const offset = (pagination.page - 1) * pagination.pageSize;
      const client = await this.getClient();
      const { data, count, error } = await client
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .range(offset, offset + pagination.pageSize - 1)
        .order('created_at', { ascending: false });

      if (error || !data) return { data: [], total: 0 };

      const items = data.map(row => NotificationMapper.rowToDTO(row as unknown as NotificationDatabaseRow));
      return { data: items, total: count || items.length };
    } catch {
      return { data: [], total: 0 };
    }
  }

  public async findUnreadCount(userId: string): Promise<number> {
    try {
      const client = await this.getClient();
      const { count, error } = await client
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) return 0;
      return count || 0;
    } catch {
      return 0;
    }
  }

  public async markRead(notificationId: string, userId: string): Promise<void> {
    try {
      const client = await this.getClient();
      const { error } = await client
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) throw new DatabaseError(error.message);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
    }
  }

  public async markAllRead(userId: string): Promise<void> {
    try {
      const client = await this.getClient();
      const { error } = await client
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId);

      if (error) throw new DatabaseError(error.message);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
    }
  }

  public async create(data: Omit<NotificationDTO, 'id' | 'createdAt'>): Promise<NotificationDTO> {
    try {
      const payload = NotificationMapper.dtoToRow(data);
      payload.created_at = new Date().toISOString();

      const client = await this.getClient();
      const { data: inserted, error } = await client.from('notifications').insert([payload]).select().single();
      if (error || !inserted) throw new DatabaseError(error?.message || 'Failed to create notification');

      return NotificationMapper.rowToDTO(inserted as unknown as NotificationDatabaseRow);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError('Failed to create notification');
    }
  }

  public async createBulk(notifications: Array<Omit<NotificationDTO, 'id' | 'createdAt'>>): Promise<void> {
    try {
      const payloads = notifications.map(n => {
        const row = NotificationMapper.dtoToRow(n);
        row.created_at = new Date().toISOString();
        return row;
      });

      const client = await this.getClient();
      const { error } = await client.from('notifications').insert(payloads);
      if (error) throw new DatabaseError(error.message);
    } catch (err) {
      if (err instanceof DatabaseError) throw err;
    }
  }
}
