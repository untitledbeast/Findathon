import { SearchAnalyticsEvent } from './types/analytics';
import { supabase } from './supabase';

/**
 * Non-blocking, fire-and-forget search interaction logger.
 * Errors are caught and ignored silently so search execution is never delayed or interrupted.
 */
export function logSearchAnalytics(event: SearchAnalyticsEvent): void {
  if (!event.query || !event.query.trim()) return;

  // Fire and forget asynchronously
  Promise.resolve().then(async () => {
    try {
      await supabase.from('search_events').insert({
        query: event.query.trim().toLowerCase(),
        search_source: event.search_source || 'spotlight',
        clicked_result_id: event.clicked_result_id || null,
        position: event.position || null,
        results_count: event.results_count || 0,
        response_time_ms: event.response_time_ms || 0,
        created_at: event.timestamp || new Date().toISOString()
      });
    } catch (err) {
      // Ignored silently for search resilience
      console.warn('Search analytics log skipped:', err);
    }
  });
}
