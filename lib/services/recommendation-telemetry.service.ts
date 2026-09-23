import { supabase } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export type RecommendationEventType =
  | 'recommendation_impression'
  | 'recommendation_open'
  | 'recommendation_save'
  | 'registration_click'
  | 'external_registration'
  | 'hide'
  | 'not_relevant';

export interface TelemetryEventInput {
  userId?: string | null;
  hackathonId: string;
  eventType: RecommendationEventType;
  sessionId?: string;
  position: number;
  surface?: string;
  engineVersion?: string;
  featureVersion?: string;
  recommendationMode?: 'COLD_START' | 'LIGHT_PERSONALIZATION' | 'FULL_PERSONALIZATION';
  scoreRecorded?: number;
}

export class RecommendationTelemetryService {
  private static async getClient() {
    if (typeof window === 'undefined') {
      try {
        return await createSupabaseServerClient();
      } catch {
        return supabase;
      }
    }
    return supabase;
  }

  /**
   * Records a compact, auditable recommendation interaction event.
   * GATES 17 & 18: Preserves position, session, versioning; never stores giant blobs or secrets.
   */
  public static async recordEvent(event: TelemetryEventInput): Promise<{ success: boolean; id?: string }> {
    try {
      if (!event.hackathonId || typeof event.position !== 'number' || event.position < 0) {
        return { success: false };
      }

      const client = await this.getClient();
      const { data, error } = await client
        .from('recommendation_telemetry_events')
        .insert({
          user_id: event.userId || null,
          hackathon_id: event.hackathonId,
          event_type: event.eventType,
          session_id: event.sessionId || null,
          position: event.position,
          surface: event.surface || 'recommendations',
          engine_version: event.engineVersion || '1.5.0',
          feature_version: event.featureVersion || 'v2',
          recommendation_mode: event.recommendationMode || 'COLD_START',
          score_recorded: typeof event.scoreRecorded === 'number' ? Math.round(event.scoreRecorded * 10000) / 10000 : null
        })
        .select('id')
        .single();

      if (error) {
        console.warn('[RecommendationTelemetryService] Telemetry insert skipped or failed:', error.message);
        return { success: false };
      }

      return { success: true, id: data?.id };
    } catch (err) {
      console.warn('[RecommendationTelemetryService] Error:', err);
      return { success: false };
    }
  }

  /**
   * Batch records impression events for multiple recommended hackathons on page view.
   */
  public static async recordImpressions(
    items: Array<{ hackathonId: string; position: number; scoreRecorded?: number }>,
    metadata: {
      userId?: string | null;
      sessionId?: string;
      surface?: string;
      recommendationMode?: 'COLD_START' | 'LIGHT_PERSONALIZATION' | 'FULL_PERSONALIZATION';
    }
  ): Promise<boolean> {
    try {
      if (!items || items.length === 0) return true;

      const client = await this.getClient();
      const records = items.map(it => ({
        user_id: metadata.userId || null,
        hackathon_id: it.hackathonId,
        event_type: 'recommendation_impression',
        session_id: metadata.sessionId || null,
        position: it.position,
        surface: metadata.surface || 'recommendations',
        engine_version: '1.5.0',
        feature_version: 'v2',
        recommendation_mode: metadata.recommendationMode || 'COLD_START',
        score_recorded: typeof it.scoreRecorded === 'number' ? Math.round(it.scoreRecorded * 10000) / 10000 : null
      }));

      const { error } = await client
        .from('recommendation_telemetry_events')
        .insert(records);

      if (error) {
        console.warn('[RecommendationTelemetryService] Batch impression insert skipped:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[RecommendationTelemetryService] Error in recordImpressions:', err);
      return false;
    }
  }
}
