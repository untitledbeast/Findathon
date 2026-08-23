import { AddressComponents } from './types';

export interface NormalizedAddressResult {
  normalizedAddress: string;
  cacheKey: string;
  priority: number;
  expectedPrecision: 'exact_venue' | 'building' | 'street' | 'city';
  baseConfidence: number;
}

export class AddressNormalizer {
  /**
   * Cleans and sanitizes raw text fragments.
   */
  public static cleanFragment(text?: string | null): string {
    if (!text || typeof text !== 'string') return '';
    return text
      .trim()
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .replace(/^[,.\s-]+|[,.\s-]+$/g, '');
  }

  /**
   * Normalizes city names for consistent geocoding and caching.
   */
  public static normalizeCity(city?: string | null): string {
    const clean = this.cleanFragment(city);
    if (!clean) return '';
    const lower = clean.toLowerCase();

    if (lower === 'bengaluru' || lower === 'bangalore') return 'Bengaluru';
    if (lower === 'bombay' || lower === 'mumbai') return 'Mumbai';
    if (lower === 'new delhi' || lower === 'delhi' || lower === 'ncr') return 'Delhi';
    if (lower === 'calcutta' || lower === 'kolkata') return 'Kolkata';
    if (lower === 'madras' || lower === 'chennai') return 'Chennai';
    if (lower === 'gurugram' || lower === 'gurgaon') return 'Gurugram';

    // Capitalize first letter of each word
    return clean
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Normalizes country name.
   */
  public static normalizeCountry(country?: string | null): string {
    const clean = this.cleanFragment(country);
    if (!clean) return 'India';
    const lower = clean.toLowerCase();
    if (lower === 'in' || lower === 'ind' || lower === 'india' || lower === 'bharat') return 'India';
    if (lower === 'us' || lower === 'usa' || lower === 'united states') return 'United States';
    return clean;
  }

  /**
   * Normalizes complete address components following priority resolution.
   */
  public static normalize(components: AddressComponents): NormalizedAddressResult | null {
    const venue = this.cleanFragment(components.venue);
    const address = this.cleanFragment(components.address);
    const city = this.normalizeCity(components.city);
    const state = this.cleanFragment(components.state);
    const country = this.normalizeCountry(components.country);
    const postalCode = this.cleanFragment(components.postalCode);

    // If nothing provided at all
    if (!venue && !address && !city && !state) {
      return null;
    }

    const fragments: string[] = [];

    // Priority 1: Full structured address (venue + address + city + state + postalCode + country)
    if (venue && address && city) {
      fragments.push(venue, address, city);
      if (state && !address.toLowerCase().includes(state.toLowerCase())) fragments.push(state);
      if (postalCode) fragments.push(postalCode);
      fragments.push(country);

      const norm = fragments.join(', ');
      return {
        normalizedAddress: norm,
        cacheKey: norm.toLowerCase(),
        priority: 1,
        expectedPrecision: 'exact_venue',
        baseConfidence: 0.95
      };
    }

    // Priority 2: Full Address string provided
    if (address && !venue && city) {
      fragments.push(address, city);
      if (state && !address.toLowerCase().includes(state.toLowerCase())) fragments.push(state);
      if (postalCode) fragments.push(postalCode);
      fragments.push(country);

      const norm = fragments.join(', ');
      return {
        normalizedAddress: norm,
        cacheKey: norm.toLowerCase(),
        priority: 2,
        expectedPrecision: 'street',
        baseConfidence: 0.90
      };
    }

    // Priority 3: Venue + City + Country (Most common for college hackathons e.g. "IIT Bombay, Mumbai, India")
    if (venue && city) {
      fragments.push(venue, city);
      if (state && !venue.toLowerCase().includes(state.toLowerCase())) fragments.push(state);
      fragments.push(country);

      const norm = fragments.join(', ');
      return {
        normalizedAddress: norm,
        cacheKey: norm.toLowerCase(),
        priority: 3,
        expectedPrecision: 'building',
        baseConfidence: 0.85
      };
    }

    // Priority 4: Venue + State + Country (When city is missing)
    if (venue && state) {
      fragments.push(venue, state, country);
      const norm = fragments.join(', ');
      return {
        normalizedAddress: norm,
        cacheKey: norm.toLowerCase(),
        priority: 4,
        expectedPrecision: 'building',
        baseConfidence: 0.75
      };
    }

    // Priority 5: City + Country (City-level resolution only)
    if (city) {
      fragments.push(city);
      if (state) fragments.push(state);
      fragments.push(country);

      const norm = fragments.join(', ');
      return {
        normalizedAddress: norm,
        cacheKey: norm.toLowerCase(),
        priority: 5,
        expectedPrecision: 'city',
        baseConfidence: 0.60
      };
    }

    // Fallback: Venue alone with country
    if (venue) {
      fragments.push(venue, country);
      const norm = fragments.join(', ');
      return {
        normalizedAddress: norm,
        cacheKey: norm.toLowerCase(),
        priority: 6,
        expectedPrecision: 'building',
        baseConfidence: 0.55
      };
    }

    return null;
  }
}
