import { supabase } from '@/lib/supabase';

export const RealtimeService = {
  subscribeToNotifications(userId: string, onNotification: (payload: Record<string, unknown>) => void) {
    return supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        payload => {
          onNotification(payload.new as Record<string, unknown>);
        }
      )
      .subscribe();
  }
};
