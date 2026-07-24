/**
 * INERT INFRASTRUCTURE CONTRACT
 * Reserved for future notification triggers when Review Notifications & Organizers Alerts are built.
 * Tracked in docs/architecture.md.
 */
import { supabase } from '@/lib/supabase';
import { NotificationTemplatePayload } from './notification-template';

export class NotificationDispatcher {
  async dispatch(userId: string, type: string, payload: NotificationTemplatePayload, metadata: Record<string, unknown> = {}): Promise<boolean> {
    try {
      await supabase.from('notifications').insert({
        user_id: userId,
        type,
        title: payload.title,
        body: payload.body,
        metadata,
        is_read: false,
        created_at: new Date().toISOString()
      });
      return true;
    } catch (err) {
      console.error('Notification dispatch failed:', err);
      return false;
    }
  }
}

export const notificationDispatcher = new NotificationDispatcher();
