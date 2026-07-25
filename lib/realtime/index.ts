import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface IRealtimeProvider {
  subscribeToUserNotifications(userId: string, callback: (payload: Record<string, unknown>) => void): () => void;
  subscribeToHackathonUpdates(hackathonId: string, callback: (payload: Record<string, unknown>) => void): () => void;
}

export class SupabaseRealtimeProvider implements IRealtimeProvider {
  public subscribeToUserNotifications(userId: string, callback: (payload: Record<string, unknown>) => void): () => void {
    if (!userId) return () => {};

    const channel: RealtimeChannel = supabase
      .channel(`public:notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => callback(payload.new)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  public subscribeToHackathonUpdates(hackathonId: string, callback: (payload: Record<string, unknown>) => void): () => void {
    if (!hackathonId) return () => {};

    const channel: RealtimeChannel = supabase
      .channel(`public:hackathons:${hackathonId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'hackathons', filter: `id=eq.${hackathonId}` },
        (payload) => callback(payload.new)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export const realtimeProvider = new SupabaseRealtimeProvider();
