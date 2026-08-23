/**
 * Findathon Map Engine Location Intelligence Types
 */

export type LocationStatus =
  | 'PENDING'
  | 'RESOLVING'
  | 'RESOLVED'
  | 'UNRESOLVED'
  | 'INVALID'
  | 'NOT_APPLICABLE';

export type LocationPrecision =
  | 'exact_venue'
  | 'building'
  | 'street'
  | 'city'
  | 'region'
  | 'country'
  | 'unknown';

export type LocationSource =
  | 'SOURCE'
  | 'GEOCODER'
  | 'CACHE';

export type EventMode =
  | 'online'
  | 'offline'
  | 'hybrid'
  | 'unknown';

export interface AddressComponents {
  venue?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  precision: LocationPrecision;
  provider: string;
  confidence: number;
}

export interface ResolvedLocation {
  status: LocationStatus;
  latitude: number | null;
  longitude: number | null;
  normalizedAddress: string | null;
  precision: LocationPrecision | null;
  source: LocationSource | null;
  provider: string | null;
  confidence: number | null;
  lastError: string | null;
}

export interface GeocodeCacheEntry {
  normalizedAddress: string;
  latitude: number;
  longitude: number;
  formattedAddress?: string;
  precision: LocationPrecision;
  provider: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
}

export interface LocationResolutionBatchResult {
  totalProcessed: number;
  resolved: number;
  unresolved: number;
  notApplicable: number;
  errors: number;
  details: Array<{
    id: string;
    title: string;
    status: LocationStatus;
    latitude: number | null;
    longitude: number | null;
    source: LocationSource | null;
    error?: string;
  }>;
}
