import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { LocationResolver } from './location-resolver';
import { LocationResolutionBatchResult, ResolvedLocation } from './types';
import { HackathonDatabaseRow } from '@/types';

export class LocationResolutionService {
  private resolver: LocationResolver;
  private supabase: SupabaseClient | null = null;

  constructor(resolver?: LocationResolver) {
    this.resolver = resolver ?? new LocationResolver();
  }

  private getClient(): SupabaseClient | null {
    if (this.supabase) return this.supabase;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && !url.includes('placeholder') && key) {
      this.supabase = createClient(url, key);
      return this.supabase;
    }
    return null;
  }

  /**
   * Resolves a single hackathon by ID.
   */
  public async resolveSingle(hackathonId: string): Promise<ResolvedLocation | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      const { data: row, error } = await client
        .from('hackathons')
        .select('*')
        .eq('id', hackathonId)
        .maybeSingle();

      if (error || !row) return null;

      const resolved = await this.resolver.resolve({
        isOnline: Boolean(row.is_online),
        venue: row.location_college,
        city: row.location_city,
        address: row.full_address || row.location_college,
        state: null,
        country: 'India',
        existingLatitude: row.latitude ? Number(row.latitude) : null,
        existingLongitude: row.longitude ? Number(row.longitude) : null
      });

      // Prepare database update payload
      const nowIso = new Date().toISOString();
      const updatePayload: Record<string, unknown> = {
        location_status: resolved.status,
        latitude: resolved.latitude,
        longitude: resolved.longitude,
        normalized_address: resolved.normalizedAddress,
        location_precision: resolved.precision,
        location_source: resolved.source,
        geocoder_provider: resolved.provider,
        geocoder_confidence: resolved.confidence,
        geocoded_at: resolved.status === 'RESOLVED' ? nowIso : null,
        last_attempted_at: nowIso,
        last_error: resolved.lastError
      };

      // Sanitize against columns that exist in DB
      await this.safeUpdateHackathon(client, hackathonId, updatePayload);
      return resolved;
    } catch (err) {
      console.error(`[LocationResolutionService] Error resolving hackathon ${hackathonId}:`, err);
      return null;
    }
  }

  /**
   * Safely updates hackathon row by filtering out columns that might not exist in the database yet.
   */
  private async safeUpdateHackathon(
    client: SupabaseClient,
    hackathonId: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    try {
      const { error } = await client
        .from('hackathons')
        .update(payload)
        .eq('id', hackathonId);

      if (error) {
        // Fallback: If advanced columns don't exist yet, update core latitude/longitude
        if (payload.latitude !== undefined || payload.longitude !== undefined) {
          await client
            .from('hackathons')
            .update({
              latitude: payload.latitude,
              longitude: payload.longitude
            })
            .eq('id', hackathonId);
        }
      }
    } catch {
      // Non-critical update failure
    }
  }

  /**
   * Processes a batch of pending/unresolved offline hackathons.
   */
  public async processPendingBatch(options: { limit?: number } = {}): Promise<LocationResolutionBatchResult> {
    const limit = options.limit ?? 10;
    const client = this.getClient();

    const result: LocationResolutionBatchResult = {
      totalProcessed: 0,
      resolved: 0,
      unresolved: 0,
      notApplicable: 0,
      errors: 0,
      details: []
    };

    if (!client) {
      console.warn('[LocationResolutionService] Supabase client unavailable for batch resolution');
      return result;
    }

    try {
      // 1. Fetch pending hackathons
      // Matches:
      // a) is_online = false AND (latitude IS NULL OR longitude IS NULL)
      // b) location_status = 'PENDING'
      const { data: rows, error } = await client
        .from('hackathons')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error || !rows) {
        console.error('[LocationResolutionService] Failed to query hackathons for batch:', error);
        return result;
      }

      // Filter rows that need resolution
      const pendingRows = rows
        .filter((r: HackathonDatabaseRow) => {
          // If online: set not applicable if coords exist
          if (r.is_online) return false;
          // If offline and missing coords
          if (!r.latitude || !r.longitude) return true;
          // If location_status is explicitly PENDING
          if ((r as unknown as Record<string, unknown>).location_status === 'PENDING') return true;
          return false;
        })
        .slice(0, limit);

      result.totalProcessed = pendingRows.length;

      for (const row of pendingRows) {
        try {
          const resolved = await this.resolver.resolve({
            isOnline: Boolean(row.is_online),
            venue: row.location_college,
            city: row.location_city,
            address: row.full_address || row.location_college,
            country: 'India'
          });

          const nowIso = new Date().toISOString();
          const updatePayload: Record<string, unknown> = {
            location_status: resolved.status,
            latitude: resolved.latitude,
            longitude: resolved.longitude,
            normalized_address: resolved.normalizedAddress,
            location_precision: resolved.precision,
            location_source: resolved.source,
            geocoder_provider: resolved.provider,
            geocoder_confidence: resolved.confidence,
            geocoded_at: resolved.status === 'RESOLVED' ? nowIso : null,
            last_attempted_at: nowIso,
            last_error: resolved.lastError
          };

          await this.safeUpdateHackathon(client, row.id, updatePayload);

          if (resolved.status === 'RESOLVED') {
            result.resolved++;
          } else if (resolved.status === 'NOT_APPLICABLE') {
            result.notApplicable++;
          } else {
            result.unresolved++;
          }

          result.details.push({
            id: row.id,
            title: row.title,
            status: resolved.status,
            latitude: resolved.latitude,
            longitude: resolved.longitude,
            source: resolved.source,
            error: resolved.lastError || undefined
          });
        } catch (err: unknown) {
          result.errors++;
          const message = err instanceof Error ? err.message : 'Batch processing error';
          result.details.push({
            id: row.id,
            title: row.title,
            status: 'UNRESOLVED',
            latitude: null,
            longitude: null,
            source: null,
            error: message
          });
        }
      }
    } catch (err) {
      console.error('[LocationResolutionService] Batch execution error:', err);
    }

    return result;
  }
}
