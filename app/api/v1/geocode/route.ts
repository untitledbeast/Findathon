import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ApiResponse } from '@/lib/dto';

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

    const queryStr = `${college || ''} ${city || ''} ${country}`.trim();
    const encoded = encodeURIComponent(queryStr);

    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`,
      { headers: { 'User-Agent': 'Findathon/1.0 (findathon.app)' } }
    );

    if (!geoRes.ok) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'GEOCODING_SERVICE_ERROR',
          message: 'External geocoding service error',
          requestId
        }
      }, { status: 502 });
    }

    const data = await geoRes.json();
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'LOCATION_NOT_FOUND',
          message: `Unable to geocode coordinates for query: "${queryStr}"`,
          requestId
        }
      }, { status: 404 });
    }

    const { lat, lon } = data[0];

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && !supabaseUrl.includes('placeholder') && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase
        .from('hackathons')
        .update({
          latitude: parseFloat(lat),
          longitude: parseFloat(lon)
        })
        .eq('id', hackathon_id);
    }

    return NextResponse.json({
      success: true,
      data: { lat, lon }
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
