import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { adminClient } from '@/lib/supabase-admin';
import type { RecommendationEventType } from '@/lib/recommendation/types';

const ALLOWED_EVENT_TYPES: Set<RecommendationEventType> = new Set([
  'view',
  'save',
  'unsave',
  'register_click',
  'share',
  'ignore',
  'dismiss',
  'apply',
  'search_result',
  'search_click',
]);

/**
 * ====================================================================
 * FINDATHON RECOMMENDATION ENGINE V2 — EVENT TRACKING ENDPOINT
 * POST /api/v1/recommendations/event
 *
 * Records user interaction events for behavioral learning and cache invalidation.
 * ====================================================================
 */
export async function POST(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    const body = await req.json();

    if (!body || !body.hackathon_id || !body.event_type) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: hackathon_id, event_type' },
        { status: 400 }
      );
    }

    const { hackathon_id, event_type, position, score, was_recommended, session_id } = body;

    if (!ALLOWED_EVENT_TYPES.has(event_type as RecommendationEventType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid event_type: "${event_type}". Must be one of: ${Array.from(ALLOWED_EVENT_TYPES).join(', ')}`,
        },
        { status: 400 }
      );
    }

    const { error: insertError } = await adminClient
      .from('recommendation_events')
      .insert({
        user_id: user?.id || null,
        hackathon_id: String(hackathon_id),
        event_type,
        recommendation_position: typeof position === 'number' ? position : null,
        recommendation_score: typeof score === 'number' ? score : null,
        was_recommended: typeof was_recommended === 'boolean' ? was_recommended : false,
        session_id: session_id ? String(session_id) : null,
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('[recommendation-events] DB insert error:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to record event in database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { recorded: true },
    });
  } catch (err: unknown) {
    console.error('[recommendation-events] Error processing event:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal error processing recommendation event',
      },
      { status: 500 }
    );
  }
}
