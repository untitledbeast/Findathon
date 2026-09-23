import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { RecommendationTelemetryService, TelemetryEventInput } from '@/lib/services/recommendation-telemetry.service';
import { formatError } from '@/lib/errors';

/**
 * Public Telemetry Endpoint for Recommendation Interactions (GATES 17 & 18).
 * Accepts compact, sanitized interaction events.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    const body = await req.json();

    if (!body || !body.hackathonId || typeof body.position !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Missing required telemetry fields (hackathonId, position)' },
        { status: 400 }
      );
    }

    const payload: TelemetryEventInput = {
      userId: user?.id || null,
      hackathonId: String(body.hackathonId),
      eventType: body.eventType || 'recommendation_impression',
      sessionId: body.sessionId ? String(body.sessionId) : undefined,
      position: Number(body.position),
      surface: body.surface ? String(body.surface) : 'recommendations',
      engineVersion: '1.5.0',
      featureVersion: 'v2',
      recommendationMode: body.recommendationMode,
      scoreRecorded: typeof body.scoreRecorded === 'number' ? body.scoreRecorded : undefined
    };

    const res = await RecommendationTelemetryService.recordEvent(payload);
    return NextResponse.json({ success: res.success, id: res.id });
  } catch (err) {
    const formatted = formatError(err);
    return NextResponse.json({ success: false, error: formatted }, { status: formatted.statusCode });
  }
}
