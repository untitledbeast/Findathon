import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/lib/dto';
import { GeocodeService } from '@/lib/services/geocode.service';

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<{ lat: string; lon: string }>>> {
  const requestId = `req-${Date.now()}`;
  try {
    const { hackathon_id, city, college, country = 'India' } = await req.json();

    if (!hackathon_id || (!city && !college)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_PARAMETERS',
          message: 'Missing required parameters: hackathon_id, city or college',
          requestId
        }
      }, { status: 400 });
    }

    const res = await GeocodeService.geocodeAndSaveHackathon(hackathon_id, city, college, country);

    if (!res.success || res.lat === undefined || res.lon === undefined) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'LOCATION_NOT_FOUND',
          message: res.error || 'Unable to geocode coordinates',
          requestId
        }
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { lat: res.lat.toString(), lon: res.lon.toString() }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Geocoding request failed';
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message,
        requestId
      }
    }, { status: 500 });
  }
}
