import { GeocodeCacheEntry, LocationPrecision } from './types';
import { createClient } from '@supabase/supabase-js';

export interface IGeocodeCache {
  get(normalizedAddress: string): Promise<GeocodeCacheEntry | null>;
  set(entry: {
    normalizedAddress: string;
    latitude: number;
    longitude: number;
    formattedAddress?: string;
    precision: LocationPrecision;
    provider: string;
    confidence: number;
  }): Promise<void>;
}

export class HybridGeocodeCache implements IGeocodeCache {
  private inMemoryCache = new Map<string, GeocodeCacheEntry>();

  public async get(normalizedAddress: string): Promise<GeocodeCacheEntry | null> {
    if (!normalizedAddress) return null;
    const key = normalizedAddress.toLowerCase().trim();

    // 1. Check in-memory cache
    if (this.inMemoryCache.has(key)) {
      return this.inMemoryCache.get(key)!;
    }

    // 2. Check persistent Supabase geocode_cache table
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && !supabaseUrl.includes('placeholder') && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await supabase
          .from('geocode_cache')
          .select('*')
          .eq('normalized_address', key)
          .maybeSingle();

        if (!error && data) {
          const entry: GeocodeCacheEntry = {
            normalizedAddress: data.normalized_address,
            latitude: Number(data.latitude),
            longitude: Number(data.longitude),
            formattedAddress: data.formatted_address,
            precision: data.precision as LocationPrecision,
            provider: data.provider,
            confidence: Number(data.confidence),
            createdAt: data.created_at,
            updatedAt: data.updated_at
          };

          // Store in memory for instant subsequent lookups
          this.inMemoryCache.set(key, entry);
          return entry;
        }
      }
    } catch {
      // Ignore database cache read error, fall back to null
    }

    return null;
  }

  public async set(entry: {
    normalizedAddress: string;
    latitude: number;
    longitude: number;
    formattedAddress?: string;
    precision: LocationPrecision;
    provider: string;
    confidence: number;
  }): Promise<void> {
    if (!entry.normalizedAddress) return;
    const key = entry.normalizedAddress.toLowerCase().trim();
    const nowIso = new Date().toISOString();

    const cacheItem: GeocodeCacheEntry = {
      normalizedAddress: key,
      latitude: entry.latitude,
      longitude: entry.longitude,
      formattedAddress: entry.formattedAddress,
      precision: entry.precision,
      provider: entry.provider,
      confidence: entry.confidence,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    // 1. Save to in-memory cache
    this.inMemoryCache.set(key, cacheItem);

    // 2. Persist to Supabase if table available
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && !supabaseUrl.includes('placeholder') && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase
          .from('geocode_cache')
          .upsert(
            {
              normalized_address: key,
              latitude: entry.latitude,
              longitude: entry.longitude,
              formatted_address: entry.formattedAddress,
              precision: entry.precision,
              provider: entry.provider,
              confidence: entry.confidence,
              updated_at: nowIso
            },
            { onConflict: 'normalized_address' }
          );
      }
    } catch {
      // Non-critical, in-memory cache remains active
    }
  }
}
