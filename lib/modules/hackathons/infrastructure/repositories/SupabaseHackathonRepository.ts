import { supabase } from '@/lib/supabase';
import { IHackathonRepository } from '../../domain/repositories/IHackathonRepository';
import { HackathonAggregate } from '../../domain/aggregates/HackathonAggregate';
import { HackathonSearchSpecification } from '../../domain/specifications/HackathonSearchSpecification';
import { SpatialSpecification } from '../../domain/specifications/SpatialSpecification';

export class SupabaseHackathonRepository implements IHackathonRepository {
  public async findById(id: string): Promise<HackathonAggregate | null> {
    const { data, error } = await supabase
      .from('hackathons')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.mapToAggregate(data);
  }

  public async findBySlug(slug: string): Promise<HackathonAggregate | null> {
    const { data, error } = await supabase
      .from('hackathons')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) return null;
    return this.mapToAggregate(data);
  }

  public async search(spec: HackathonSearchSpecification): Promise<{ items: HackathonAggregate[]; total: number; cursor?: string }> {
    let query = supabase
      .from('hackathons')
      .select('*', { count: 'exact' })
      .eq('status', 'approved');

    const f = spec.filters;
    if (f.isOnline !== undefined) query = query.eq('is_online', f.isOnline);
    if (f.city) query = query.ilike('location_city', `%${f.city}%`);
    if (f.tags && f.tags.length > 0) query = query.overlaps('tags', f.tags);
    if (f.query) {
      const q = f.query.trim();
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,location_city.ilike.%${q}%`);
    }

    const limit = f.limit || 20;
    query = query.range(0, limit - 1).order('created_at', { ascending: false });

    const { data, count, error } = await query;
    if (error || !data) return { items: [], total: 0 };

    const items = data.map(row => this.mapToAggregate(row));
    return {
      items,
      total: count || items.length,
      cursor: items.length >= limit ? items[items.length - 1].id.toString() : undefined
    };
  }

  public async findByViewport(spec: SpatialSpecification): Promise<HackathonAggregate[]> {
    const { data, error } = await supabase
      .from('hackathons')
      .select('*')
      .gte('latitude', spec.bounds.south)
      .lte('latitude', spec.bounds.north)
      .gte('longitude', spec.bounds.west)
      .lte('longitude', spec.bounds.east)
      .limit(500);

    if (error || !data) return [];
    return data.map(row => this.mapToAggregate(row));
  }

  public async save(aggregate: HackathonAggregate): Promise<HackathonAggregate> {
    const row = {
      id: aggregate.id.toString(),
      title: aggregate.title,
      slug: aggregate.slug,
      description: aggregate.description,
      start_date: aggregate.startDate,
      end_date: aggregate.endDate,
      registration_deadline: aggregate.registrationDeadline,
      location_city: aggregate.locationCity,
      location_college: aggregate.locationCollege,
      is_online: aggregate.isOnline,
      latitude: aggregate.latitude,
      longitude: aggregate.longitude,
      tags: aggregate.tags,
      prize_pool: aggregate.prizePool,
      prize_amount: aggregate.prizeAmount,
      organizer: aggregate.organizer,
      cover_image: aggregate.coverImage,
      logo_url: aggregate.logoUrl,
      status: aggregate.status,
      views_count: aggregate.viewsCount,
      avg_rating: aggregate.avgRating,
      reviews_count: aggregate.reviewsCount,
      submitted_by: aggregate.submittedBy,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('hackathons')
      .upsert(row)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to save hackathon: ${error?.message || 'Database error'}`);
    }

    return this.mapToAggregate(data);
  }

  public async delete(id: string): Promise<void> {
    await supabase.from('hackathons').delete().eq('id', id);
  }

  private mapToAggregate(row: Record<string, unknown>): HackathonAggregate {
    return HackathonAggregate.create(
      {
        title: String(row.title || 'Untitled Hackathon'),
        slug: String(row.slug || `hackathon-${row.id}`),
        description: String(row.description || ''),
        startDate: String(row.start_date || new Date().toISOString()),
        endDate: String(row.end_date || new Date().toISOString()),
        registrationDeadline: String(row.registration_deadline || row.start_date || new Date().toISOString()),
        locationCity: row.location_city ? String(row.location_city) : undefined,
        locationCollege: row.location_college ? String(row.location_college) : undefined,
        isOnline: Boolean(row.is_online),
        latitude: row.latitude ? Number(row.latitude) : undefined,
        longitude: row.longitude ? Number(row.longitude) : undefined,
        tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
        prizePool: String(row.prize_pool || '$10,000'),
        prizeAmount: Number(row.prize_amount || 10000),
        organizer: String(row.organizer || 'Community Host'),
        coverImage: row.cover_image ? String(row.cover_image) : undefined,
        logoUrl: row.logo_url ? String(row.logo_url) : undefined,
        status: (row.status as 'draft' | 'pending' | 'approved' | 'rejected' | 'archived') || 'approved',
        viewsCount: Number(row.views_count || 0),
        avgRating: Number(row.avg_rating || 5.0),
        reviewsCount: Number(row.reviews_count || 0),
        submittedBy: row.submitted_by ? String(row.submitted_by) : undefined,
        createdAt: String(row.created_at || new Date().toISOString()),
        updatedAt: String(row.updated_at || new Date().toISOString()),
        version: Number(row.version || 1),
      },
      String(row.id)
    );
  }
}
