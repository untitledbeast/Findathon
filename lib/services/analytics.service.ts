import { supabase } from '@/lib/supabase';

export interface AnalyticsEvent {
  eventType: 'page_view' | 'register_click' | 'share' | 'compare' | 'save';
  hackathonId: string;
  userId?: string;
  source?: string;
}

export const AnalyticsService = {
  trackEvent(event: AnalyticsEvent): void {
    // Asynchronous fire-and-forget
    Promise.resolve().then(async () => {
      try {
        if (event.eventType === 'page_view') {
          await supabase.rpc('increment_hackathon_view', { h_id: event.hackathonId });
        } else if (event.eventType === 'register_click') {
          await supabase.rpc('increment_register_clicks', { h_id: event.hackathonId });
        }

        await supabase.from('search_events').insert({
          query: `action:${event.eventType}`,
          search_source: event.source || 'detail_page',
          clicked_result_id: event.hackathonId,
          user_id: event.userId || null,
          created_at: new Date().toISOString()
        });
      } catch (err) {
        // Log silently without throwing error to UI
        console.error('Analytics tracking failed silently:', err);
      }
    });
  }
};
