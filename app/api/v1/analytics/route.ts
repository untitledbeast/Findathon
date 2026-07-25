import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsService } from '@/lib/services/analytics.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { event, metadata } = body || {};

    if (event && typeof event === 'string') {
      AnalyticsService.trackEvent({
        eventType: (event as 'page_view') || 'page_view',
        hackathonId: String(metadata?.hackathonId || 'global')
      });
    }

    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json({ data: { success: true } });
  }
}
