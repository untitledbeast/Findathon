import {
  AddressComponents,
  ResolvedLocation
} from './types';
import { AddressNormalizer } from './address-normalizer';
import { IGeocoder, NominatimGeocoder } from './geocoder';
import { IGeocodeCache, HybridGeocodeCache } from './geocode-cache';
import { LocationValidator } from './location-validator';

export interface ResolveLocationParams extends AddressComponents {
  isOnline?: boolean;
  existingLatitude?: number | null;
  existingLongitude?: number | null;
}

export class LocationResolver {
  private geocoder: IGeocoder;
  private cache: IGeocodeCache;

  constructor(geocoder?: IGeocoder, cache?: IGeocodeCache) {
    this.geocoder = geocoder ?? new NominatimGeocoder();
    this.cache = cache ?? new HybridGeocodeCache();
  }

  public async resolve(params: ResolveLocationParams): Promise<ResolvedLocation> {
    // 1. ONLINE EVENTS: Physical coordinates NOT_APPLICABLE
    if (params.isOnline) {
      return {
        status: 'NOT_APPLICABLE',
        latitude: null,
        longitude: null,
        normalizedAddress: null,
        precision: null,
        source: null,
        provider: null,
        confidence: null,
        lastError: null
      };
    }

    // 2. TRUSTED EXISTING SOURCE COORDINATES
    if (
      LocationValidator.isValidCoordinate(params.existingLatitude, params.existingLongitude)
    ) {
      return {
        status: 'RESOLVED',
        latitude: Number(params.existingLatitude),
        longitude: Number(params.existingLongitude),
        normalizedAddress: params.address || params.venue || params.city || null,
        precision: 'exact_venue',
        source: 'SOURCE',
        provider: 'source',
        confidence: 1.0,
        lastError: null
      };
    }

    // 3. ADDRESS EXTRACTION & NORMALIZATION
    const normalizedResult = AddressNormalizer.normalize({
      venue: params.venue,
      address: params.address,
      city: params.city,
      state: params.state,
      country: params.country || 'India',
      postalCode: params.postalCode
    });

    if (!normalizedResult) {
      return {
        status: 'UNRESOLVED',
        latitude: null,
        longitude: null,
        normalizedAddress: null,
        precision: null,
        source: null,
        provider: null,
        confidence: null,
        lastError: 'No physical location or address components provided'
      };
    }

    const { normalizedAddress, expectedPrecision } = normalizedResult;

    // RULE 1 ENFORCEMENT: If only a bare city is provided without venue or address,
    // do not guess city-center coordinates. Mark as UNRESOLVED.
    if (expectedPrecision === 'city' && !params.venue && !params.address) {
      return {
        status: 'UNRESOLVED',
        latitude: null,
        longitude: null,
        normalizedAddress,
        precision: 'city',
        source: null,
        provider: null,
        confidence: 0.45,
        lastError: 'City-level location without specific venue/address cannot be plotted as physical map marker'
      };
    }

    // 4. CACHE LOOKUP (Deduplication across identical venues/cities)
    try {
      const cached = await this.cache.get(normalizedAddress);
      if (cached && LocationValidator.isValidCoordinate(cached.latitude, cached.longitude)) {
        return {
          status: 'RESOLVED',
          latitude: cached.latitude,
          longitude: cached.longitude,
          normalizedAddress,
          precision: cached.precision,
          source: 'CACHE',
          provider: cached.provider,
          confidence: cached.confidence,
          lastError: null
        };
      }
    } catch (err) {
      console.warn('[LocationResolver] Cache check error:', err);
    }

    // 5. GEOCODER RESOLUTION
    try {
      const geocodeResult = await this.geocoder.geocode(normalizedAddress);

      // If full address failed and we have city alone, fallback to city query
      let finalResult = geocodeResult;
      if (!finalResult && params.city && normalizedResult.priority < 5) {
        const cityNorm = AddressNormalizer.normalize({ city: params.city, country: params.country || 'India' });
        if (cityNorm) {
          finalResult = await this.geocoder.geocode(cityNorm.normalizedAddress);
        }
      }

      // 6. VALIDATE RESULT
      const validation = LocationValidator.validateResult(finalResult, params.country || 'India');
      if (!validation.isValid || !finalResult) {
        return {
          status: 'UNRESOLVED',
          latitude: null,
          longitude: null,
          normalizedAddress,
          precision: null,
          source: null,
          provider: null,
          confidence: null,
          lastError: validation.reason || 'Geocoding returned no coordinates'
        };
      }

      // 7. STORE IN CACHE
      await this.cache.set({
        normalizedAddress,
        latitude: finalResult.latitude,
        longitude: finalResult.longitude,
        formattedAddress: finalResult.formattedAddress,
        precision: finalResult.precision || expectedPrecision,
        provider: finalResult.provider,
        confidence: finalResult.confidence
      });

      return {
        status: 'RESOLVED',
        latitude: finalResult.latitude,
        longitude: finalResult.longitude,
        normalizedAddress,
        precision: finalResult.precision || expectedPrecision,
        source: 'GEOCODER',
        provider: finalResult.provider,
        confidence: finalResult.confidence,
        lastError: null
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown geocoding failure';
      return {
        status: 'UNRESOLVED',
        latitude: null,
        longitude: null,
        normalizedAddress,
        precision: null,
        source: null,
        provider: null,
        confidence: null,
        lastError: message
      };
    }
  }
}
