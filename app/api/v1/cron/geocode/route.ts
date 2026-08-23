import { NextRequest, NextResponse } from 'next/server';
import { LocationResolutionService } from '@/lib/location';

export async function GET(req: NextRequest) {
  return handleCronGeocode(req);
}

export async function POST(req: NextRequest) {
  return handleCronGeocode(req);
}

async function handleCronGeocode(req: NextRequest) {
  try {
    // Optional secret verification
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const urlSecret = req.nextUrl.searchParams.get('secret');
      if (urlSecret !== cronSecret) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
    }

    const limitParam = req.nextUrl.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    const service = new LocationResolutionService();
    const result = await service.processPendingBatch({ limit });

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (err: unknown) {
    console.error('[cron/geocode] Error processing batch:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Cron geocoding failed'
      },
      { status: 500 }
    );
  }
}
