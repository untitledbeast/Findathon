import { GeocodeResult, LocationPrecision } from './types';

export interface IGeocoder {
  geocode(address: string): Promise<GeocodeResult | null>;
}

export class NominatimGeocoder implements IGeocoder {
  private lastRequestTime = 0;
  private readonly minIntervalMs: number;
  private readonly timeoutMs: number;
  private readonly userAgent: string;

  constructor(options: { minIntervalMs?: number; timeoutMs?: number; userAgent?: string } = {}) {
    this.minIntervalMs = options.minIntervalMs ?? 1000;
    this.timeoutMs = options.timeoutMs ?? 6000;
    this.userAgent = options.userAgent ?? 'Findathon/1.0 (contact@findathon.app)';
  }

  /**
   * Rate limiting helper to ensure at least minIntervalMs between requests.
   */
  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minIntervalMs) {
      await new Promise(resolve => setTimeout(resolve, this.minIntervalMs - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Maps OSM type and class to LocationPrecision.
   */
  private mapPrecision(osmClass?: string, osmType?: string): LocationPrecision {
    if (!osmClass && !osmType) return 'unknown';

    if (
      osmClass === 'amenity' ||
      osmClass === 'building' ||
      osmType === 'university' ||
      osmType === 'college' ||
      osmType === 'school' ||
      osmType === 'hospital'
    ) {
      return 'exact_venue';
    }

    if (osmClass === 'place' && (osmType === 'house' || osmType === 'isolated_dwelling')) {
      return 'building';
    }

    if (osmClass === 'highway') {
      return 'street';
    }

    if (
      osmClass === 'place' &&
      (osmType === 'city' || osmType === 'town' || osmType === 'suburb' || osmType === 'municipality')
    ) {
      return 'city';
    }

    if (osmClass === 'boundary' && (osmType === 'administrative' || osmType === 'state')) {
      return 'region';
    }

    if (osmClass === 'place' && osmType === 'country') {
      return 'country';
    }

    return 'building';
  }

  public async geocode(address: string): Promise<GeocodeResult | null> {
    if (!address || !address.trim()) return null;

    await this.throttle();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const encoded = encodeURIComponent(address.trim());
      const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&addressdetails=1&limit=1`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept-Language': 'en'
        },
        signal: controller.signal
      });

      if (!response.ok) {
        console.warn(`[NominatimGeocoder] HTTP ${response.status} for query "${address}"`);
        return null;
      }

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        return null;
      }

      const first = data[0];
      const lat = parseFloat(first.lat);
      const lon = parseFloat(first.lon);

      // Validate coordinate bounds
      if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180 || (lat === 0 && lon === 0)) {
        return null;
      }

      const precision = this.mapPrecision(first.class, first.type);
      const addr = first.address || {};

      // Calculate confidence based on result completeness & precision
      let confidence = 0.70;
      if (precision === 'exact_venue') confidence = 0.95;
      else if (precision === 'building') confidence = 0.85;
      else if (precision === 'street') confidence = 0.80;
      else if (precision === 'city') confidence = 0.60;
      else if (precision === 'region') confidence = 0.40;

      // Bonus if city/state/country match
      if (addr.country && (addr.country.toLowerCase().includes('india') || addr.country_code === 'in')) {
        confidence = Math.min(1.0, confidence + 0.05);
      }

      return {
        latitude: lat,
        longitude: lon,
        formattedAddress: first.display_name || address,
        city: addr.city || addr.town || addr.municipality || addr.suburb || undefined,
        state: addr.state || undefined,
        country: addr.country || 'India',
        postalCode: addr.postcode || undefined,
        precision,
        provider: 'nominatim',
        confidence: Number(confidence.toFixed(2))
      };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.warn(`[NominatimGeocoder] Timeout (${this.timeoutMs}ms) for query "${address}"`);
      } else {
        console.warn(`[NominatimGeocoder] Request error for "${address}":`, err);
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
