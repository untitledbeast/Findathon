import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { adminClient } from '@/lib/supabase-admin';
import type { FeedbackType, RecommendationEventType } from '@/lib/recommendation/types';

const ALLOWED_FEEDBACK: Set<FeedbackType> = new Set([
  'interested',
  'not_interested',
  'too_advanced',
  'too_basic',
  'wrong_domain',
  'already_registered',
]);

const FEEDBACK_TO_EVENT_MAP: Record<FeedbackType, RecommendationEventType> = {
  interested: 'save',
  not_interested: 'dismiss',
  too_advanced: 'dismiss',
  too_basic: 'dismiss',
  wrong_domain: 'dismiss',
  already_registered: 'apply',
};

/**
 * ====================================================================
 * FINDATHON RECOMMENDATION ENGINE V2 — FEEDBACK ENDPOINT
 * POST /api/v1/recommendations/feedback
 *
 * Records explicit user feedback (highest weight) and triggers event logging.
 * ====================================================================
 */
export async function POST(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to submit feedback' },
        { status: 401 }
      );
    }

    const body = await req.json();
    if (!body || !body.hackathon_id || !body.feedback) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: hackathon_id, feedback' },
        { status: 400 }
      );
    }

    const { hackathon_id, feedback } = body;

    if (!ALLOWED_FEEDBACK.has(feedback as FeedbackType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid feedback: "${feedback}". Must be one of: ${Array.from(ALLOWED_FEEDBACK).join(', ')}`,
        },
        { status: 400 }
      );
    }

    // 1. Upsert into hackathon_feedback table
    const { error: feedbackError } = await adminClient
      .from('hackathon_feedback')
      .upsert(
        {
          user_id: user.id,
          hackathon_id: String(hackathon_id),
          feedback,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,hackathon_id' }
      );

    if (feedbackError) {
      console.error('[recommendation-feedback] DB upsert error:', feedbackError);
      return NextResponse.json(
        { success: false, error: 'Failed to record feedback' },
        { status: 500 }
      );
    }

    // 2. Insert mapped event into recommendation_events
    // This triggers cache invalidation and user_interests updating
    const mappedEventType = FEEDBACK_TO_EVENT_MAP[feedback as FeedbackType] ?? 'dismiss';
    const { error: eventError } = await adminClient
      .from('recommendation_events')
      .insert({
        user_id: user.id,
        hackathon_id: String(hackathon_id),
        event_type: mappedEventType,
        was_recommended: true,
        created_at: new Date().toISOString(),
      });

    if (eventError) {
      console.warn('[recommendation-feedback] Event logging failed (non-critical):', eventError);
    }

    return NextResponse.json({ success: true, data: { recorded: true } });
  } catch (err: unknown) {
    console.error('[recommendation-feedback] Error submitting feedback:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal error submitting feedback',
      },
      { status: 500 }
    );
  }
}
