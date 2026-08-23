import { NextRequest, NextResponse } from 'next/server';
import { LocationValidator } from '@/lib/location/location-validator';

export interface PlaceSuggestion {
  placeId: string;
  title: string;
  venue?: string;
  city: string;
  state?: string;
  country: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  precision: string;
  confidence: number;
}

// In-memory query cache for fast suggestion deduplication
const autocompleteCache = new Map<string, { timestamp: number; results: PlaceSuggestion[] }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q')?.trim() || '';
    if (q.length < 3) {
      return NextResponse.json({ success: true, suggestions: [] });
    }

    const cacheKey = q.toLowerCase();
    const cached = autocompleteCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ success: true, suggestions: cached.results, cached: true });
    }

    const encoded = encodeURIComponent(q);
    const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&addressdetails=1&limit=6&countrycodes=in`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Findathon/1.0 (contact@findathon.app)',
        'Accept-Language': 'en'
      },
      next: { revalidate: 3600 }
    });

    if (!res.ok) {
      return NextResponse.json({ success: true, suggestions: [] });
    }

    const rawData = await res.json();
    if (!Array.isArray(rawData)) {
      return NextResponse.json({ success: true, suggestions: [] });
    }

    const suggestions: PlaceSuggestion[] = [];
    const seenCoordinates = new Set<string>();

    for (const item of rawData) {
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);

      if (!LocationValidator.isValidCoordinate(lat, lon)) {
        continue;
      }

      const coordKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
      if (seenCoordinates.has(coordKey)) continue;
      seenCoordinates.add(coordKey);

      const addr = item.address || {};
      const city = addr.city || addr.town || addr.municipality || addr.suburb || addr.state_district || 'Unknown City';
      const state = addr.state;
      const country = addr.country || 'India';

      // Determine main title / venue
      const title = item.name || item.display_name.split(',')[0] || q;
      const venue = (item.class === 'amenity' || item.class === 'building' || item.type === 'university' || item.type === 'college' || item.type === 'school')
        ? title
        : undefined;

      let precision = 'city';
      let confidence = 0.70;

      if (venue || item.class === 'building' || item.class === 'amenity') {
        precision = 'exact_venue';
        confidence = 0.95;
      } else if (item.class === 'place' && (item.type === 'house' || item.type === 'isolated_dwelling')) {
        precision = 'building';
        confidence = 0.85;
      } else if (item.class === 'highway') {
        precision = 'street';
        confidence = 0.80;
      }

      suggestions.push({
        placeId: String(item.place_id || `${lat}_${lon}`),
        title,
        venue,
        city,
        state,
        country,
        formattedAddress: item.display_name,
        latitude: lat,
        longitude: lon,
        precision,
        confidence
      });
    }

    // Store in cache
    autocompleteCache.set(cacheKey, {
      timestamp: Date.now(),
      results: suggestions
    });

    return NextResponse.json({
      success: true,
      suggestions
    });
  } catch (err: unknown) {
    console.error('[Places Autocomplete API] Error:', err);
    return NextResponse.json({ success: false, error: 'Autocomplete search failed' }, { status: 500 });
  }
}
