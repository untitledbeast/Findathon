import { createClient } from '@supabase/supabase-js';

export interface GeocodeResult {
  lat: number;
  lon: number;
}

export class GeocodeService {
  /**
   * Geocodes a location query string using OpenStreetMap Nominatim API.
   */
  public static async geocodeLocation(queryStr: string): Promise<GeocodeResult | null> {
    if (!queryStr || !queryStr.trim()) return null;
    try {
      const encoded = encodeURIComponent(queryStr.trim());
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`,
        { headers: { 'User-Agent': 'Findathon/1.0 (findathon.app)' } }
      );

      if (!geoRes.ok) {
        return null;
      }

      const data = await geoRes.json();
      if (!Array.isArray(data) || data.length === 0) {
        return null;
      }

      const { lat, lon } = data[0];
      return {
        lat: parseFloat(lat),
        lon: parseFloat(lon)
      };
    } catch {
      return null;
    }
  }

  /**
   * Geocodes and updates the latitude and longitude columns of a hackathon in Supabase.
   */
  public static async geocodeAndSaveHackathon(
    hackathonId: string,
    city?: string | null,
    college?: string | null,
    country = 'India'
  ): Promise<{ success: boolean; lat?: number; lon?: number; error?: string }> {
    if (!hackathonId || (!city && !college)) {
      return { success: false, error: 'Missing required parameters: hackathonId, city or college' };
    }

    const queryStr = `${college || ''} ${city || ''} ${country}`.trim();
    const result = await this.geocodeLocation(queryStr);

    if (!result) {
      return { success: false, error: `Unable to geocode coordinates for query: "${queryStr}"` };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && !supabaseUrl.includes('placeholder') && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase
        .from('hackathons')
        .update({
          latitude: result.lat,
          longitude: result.lon
        })
        .eq('id', hackathonId);
    }

    return {
      success: true,
      lat: result.lat,
      lon: result.lon
    };
  }
}
