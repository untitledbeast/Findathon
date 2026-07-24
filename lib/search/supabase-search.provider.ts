import { ISearchProvider } from './search-provider.interface';
import { HackathonCard } from '@/lib/types/hackathon';
import { HackathonFilters } from '@/lib/database/filters/hackathon.filters';
import { supabase } from '@/lib/supabase';

export class SupabaseSearchProvider implements ISearchProvider {
  async search(query: string, filters: HackathonFilters = {}): Promise<{ data: HackathonCard[]; total: number }> {
    let q = supabase.from('hackathons').select('*', { count: 'exact' }).eq('status', 'approved');

    if (query) {
      q = q.or(`title.ilike.%${query}%,description.ilike.%${query}%,location_city.ilike.%${query}%`);
    }

    if (filters.city) q = q.eq('location_city', filters.city);
    if (filters.is_online !== undefined) q = q.eq('is_online', filters.is_online);

    const limit = filters.limit || 12;
    const offset = filters.offset || 0;
    q = q.range(offset, offset + limit - 1);

    const { data, count } = await q;

    return {
      data: (data || []).map(h => ({
        id: h.id,
        title: h.title,
        description: h.description,
        start_date: h.start_date,
        end_date: h.end_date,
        location_city: h.location_city,
        location_college: h.location_college,
        is_online: Boolean(h.is_online),
        tags: h.tags || [],
        register_url: h.register_url,
        organizer: h.organizer,
        cover_image_url: h.cover_image_url,
        status: h.status,
        latitude: h.latitude || null,
        longitude: h.longitude || null,
        prize_amount: h.prize_amount || 0,
        difficulty: h.difficulty || 'open',
        is_featured: Boolean(h.is_featured),
        prize_pool: h.prize_pool || null,
        registration_deadline: h.registration_deadline || null,
        full_address: h.full_address || null,
        min_team_size: h.min_team_size || 1,
        max_team_size: h.max_team_size || 4,
        solo_allowed: h.solo_allowed !== false,
        eligibility: h.eligibility || null,
        contact_email: h.contact_email || null,
        contact_phone: h.contact_phone || null,
        contact_name: h.contact_name || null,
        organization: h.organization || null,
        social_twitter: h.social_twitter || null,
        social_linkedin: h.social_linkedin || null,
        social_discord: h.social_discord || null,
        social_instagram: h.social_instagram || null,
        submitted_by: h.submitted_by || null,
        created_at: h.created_at,
        avg_rating: h.avg_rating || 0
      })),
      total: count || 0
    };
  }
}

export const supabaseSearchProvider = new SupabaseSearchProvider();
