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

interface NominatimRawItem {
  place_id?: number | string;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  class?: string;
  type?: string;
  address?: {
    city?: string;
    town?: string;
    municipality?: string;
    suburb?: string;
    state_district?: string;
    state?: string;
    country?: string;
  };
}

// In-memory query cache for fast suggestion deduplication (Best-effort L1 optimization)
const autocompleteCache = new Map<string, { timestamp: number; results: PlaceSuggestion[] }>();
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes
const MAX_CACHE_SIZE = 200;

async function queryNominatim(queryStr: string): Promise<NominatimRawItem[]> {
  try {
    const encoded = encodeURIComponent(queryStr);
    const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&addressdetails=1&limit=6&countrycodes=in`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Findathon/1.0 (contact@findathon.app)',
        'Accept-Language': 'en'
      },
      signal: controller.signal,
      next: { revalidate: 1800 }
    });

    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? (data as NominatimRawItem[]) : [];
  } catch {
    return [];
  }
}

function generateCandidateQueries(original: string): string[] {
  const candidates: string[] = [original];
  const trimmed = original.trim();

  // If query contains parentheses like "Guru Nanak Institute of Technology (GNIT), Panihati"
  if (/\([^)]+\)/.test(trimmed)) {
    // Candidate A: Text without parenthesized content
    const withoutParens = trimmed.replace(/\([^)]+\)/g, ' ').replace(/\s{2,}/g, ' ').trim();
    if (withoutParens.length >= 3 && !candidates.includes(withoutParens)) {
      candidates.push(withoutParens);
    }

    // Candidate B: Parenthesized acronym + locality
    const match = trimmed.match(/\(([^)]+)\)/);
    if (match && match[1]) {
      const acronym = match[1].trim();
      const afterComma = trimmed.split(',').slice(1).join(',').trim();
      if (afterComma) {
        const acronymWithLocality = `${acronym}, ${afterComma}`;
        if (!candidates.includes(acronymWithLocality)) {
          candidates.push(acronymWithLocality);
        }
      }
    }
  }

  // If query contains commas like "GNIT, Panihati", try without comma
  if (trimmed.includes(',')) {
    const withoutComma = trimmed.replace(/,/g, ' ').replace(/\s{2,}/g, ' ').trim();
    if (withoutComma.length >= 3 && !candidates.includes(withoutComma)) {
      candidates.push(withoutComma);
    }
  }

  return candidates;
}

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

    const candidateQueries = generateCandidateQueries(q);
    let rawData: NominatimRawItem[] = [];

    // Query candidates sequentially with strict budget (stop at first non-empty response)
    for (const candidate of candidateQueries.slice(0, 3)) {
      const results = await queryNominatim(candidate);
      if (results && results.length > 0) {
        rawData = results;
        break;
      }
    }

    const suggestions: PlaceSuggestion[] = [];
    const seenCoordinates = new Set<string>();
    const seenPlaceIds = new Set<string>();

    for (const item of rawData) {
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);

      if (!LocationValidator.isValidCoordinate(lat, lon)) {
        continue;
      }

      const placeId = String(item.place_id || `${lat}_${lon}`);
      if (seenPlaceIds.has(placeId)) continue;
      seenPlaceIds.add(placeId);

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
        placeId,
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

    // Cache management
    if (autocompleteCache.size >= MAX_CACHE_SIZE) {
      const firstKey = autocompleteCache.keys().next().value;
      if (firstKey) autocompleteCache.delete(firstKey);
    }

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
