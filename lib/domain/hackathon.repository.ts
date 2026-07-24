import { supabase } from '@/lib/supabase';

export interface RichHackathon {
  // Base fields
  id: string;
  title: string;
  description: string;
  tagline: string | null;
  start_date: string;
  end_date: string;
  registration_deadline: string | null;
  location_city: string | null;
  location_college: string | null;
  full_address: string | null;
  is_online: boolean;
  tags: string[];
  register_url: string;
  organizer: string;
  cover_image_url: string | null;
  status: string;
  latitude: number | null;
  longitude: number | null;
  prize_pool: string | null;
  prize_amount: number;
  prize_breakdown: { title?: string; amount?: string }[];
  difficulty: string;
  is_featured: boolean;
  is_verified: boolean;
  avg_rating: number;
  review_count: number;
  save_count: number;
  view_count: number;
  // Rich fields
  rules: string | null;
  eligibility_details: string | null;
  registration_fee: number;
  registration_fee_currency: string;
  tracks: string[];
  sponsors: string[];
  tech_stack: string[];
  min_team_size: number;
  max_team_size: number;
  solo_allowed: boolean;
  max_participants: number | null;
  current_participants: number;
  duration_hours: number | null;
  certificate_provided: boolean;
  internship_opportunity: boolean;
  hiring_opportunity: boolean;
  language: string;
  timezone: string;
  faq: { question: string; answer: string }[];
  quality_score: number;
  trending_score: number;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  created_at: string;
  // Relations
  organizer_id: string | null;
  university_id: string | null;
  city_id: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  organization: string | null;
  social_twitter: string | null;
  social_linkedin: string | null;
  social_discord: string | null;
  social_instagram: string | null;
  submitted_by: string | null;
}

export interface OrganizerEntity {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  website: string | null;
  is_verified: boolean;
  verification_badge: string | null;
  follower_count: number;
  hackathon_count: number;
  total_participants?: number;
  total_prize_amount?: number;
  avg_rating: number;
  social_twitter: string | null;
  social_linkedin: string | null;
  social_discord: string | null;
  country: string;
}

export interface UniversityEntity {
  id: string;
  name: string;
  slug: string;
  short_name: string | null;
  city: string | null;
  state: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  logo_url: string | null;
  website: string | null;
  ranking: number | null;
  hackathon_count: number;
}

export interface CityEntity {
  id: string;
  name: string;
  slug: string;
  state: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  hackathon_count: number;
  top_tags: string[];
}

export interface MediaItem {
  id: string;
  media_type: string;
  url: string;
  caption: string | null;
  display_order: number;
}

export interface TimelineItem {
  id: string;
  milestone_name: string;
  milestone_date: string;
  description: string | null;
  is_completed: boolean;
  display_order: number;
}

export interface HackathonStats {
  total_views: number;
  unique_views: number;
  total_saves: number;
  register_clicks: number;
  share_count: number;
  compare_count: number;
  conversion_rate: number;
  peak_view_date: string | null;
}

export interface RelatedHackathon {
  id: string;
  title: string;
  cover_image_url: string | null;
  start_date: string;
  tags: string[];
  is_online: boolean;
  location_city: string | null;
  prize_pool: string | null;
  avg_rating: number;
  relation_type: string;
}

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_id: string;
  profile: { full_name: string | null; avatar_url: string | null };
}

export interface HackathonDetail extends RichHackathon {
  organizer_profile: OrganizerEntity | null;
  university_profile: UniversityEntity | null;
  city_profile: CityEntity | null;
  media: MediaItem[];
  timeline: TimelineItem[];
  statistics: HackathonStats | null;
  related: RelatedHackathon[];
  reviews: Review[];
}

export const HackathonRepository = {
  async getById(id: string): Promise<HackathonDetail | null> {
    try {
      const { data: hackathon, error } = await supabase
        .from('hackathons')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !hackathon) return null;

      const [media, timeline, statistics, related, reviews, organizer, university, city] =
        await Promise.all([
          supabase.from('hackathon_media').select('*').eq('hackathon_id', id).order('display_order'),
          supabase.from('hackathon_timeline').select('*').eq('hackathon_id', id).order('display_order'),
          supabase.from('hackathon_statistics').select('*').eq('hackathon_id', id).single(),
          supabase
            .from('hackathon_related')
            .select('related_id, relation_type, score, hackathons!related_id(id,title,cover_image_url,start_date,tags,is_online,location_city,prize_pool,avg_rating)')
            .eq('hackathon_id', id)
            .order('score', { ascending: false })
            .limit(6),
          supabase
            .from('hackathon_reviews')
            .select('*, profiles(full_name, avatar_url)')
            .eq('hackathon_id', id)
            .order('created_at', { ascending: false })
            .limit(10),
          hackathon.organizer_id
            ? supabase.from('organizers').select('*').eq('id', hackathon.organizer_id).single()
            : Promise.resolve({ data: null }),
          hackathon.university_id
            ? supabase.from('universities').select('*').eq('id', hackathon.university_id).single()
            : Promise.resolve({ data: null }),
          hackathon.city_id
            ? supabase.from('cities').select('*').eq('id', hackathon.city_id).single()
            : Promise.resolve({ data: null }),
        ]);

      // Increment view count (fire and forget)
      if (statistics.data) {
        supabase
          .from('hackathon_statistics')
          .update({ total_views: (statistics.data.total_views || 0) + 1, updated_at: new Date().toISOString() })
          .eq('hackathon_id', id)
          .then(() => {});
      }

      return {
        ...hackathon,
        organizer_profile: organizer.data || null,
        university_profile: university.data || null,
        city_profile: city.data || null,
        media: media.data || [],
        timeline: timeline.data || [],
        statistics: statistics.data || null,
        related: (related.data || []).map((r: Record<string, unknown>) => ({
          ...((r.hackathons || {}) as unknown as RelatedHackathon),
          relation_type: (r.relation_type as string) || 'similar'
        })),
        reviews: (reviews.data || []).map((r: Review & { profiles?: { full_name: string | null; avatar_url: string | null } }) => ({
          ...r,
          profile: r.profiles || { full_name: null, avatar_url: null }
        })),
      } as HackathonDetail;
    } catch (err) {
      console.error('Error fetching hackathon detail:', err);
      return null;
    }
  },

  async getList(filters: { organizer_id?: string; university_id?: string; city_id?: string; tags?: string[]; is_online?: boolean; limit?: number } = {}) {
    try {
      let q = supabase.from('hackathons').select('*').eq('status', 'approved');
      if (filters.organizer_id) q = q.eq('organizer_id', filters.organizer_id);
      if (filters.university_id) q = q.eq('university_id', filters.university_id);
      if (filters.city_id) q = q.eq('city_id', filters.city_id);
      if (filters.tags?.length) q = q.overlaps('tags', filters.tags);
      if (filters.is_online !== undefined) q = q.eq('is_online', filters.is_online);
      const { data } = await q.order('created_at', { ascending: false }).limit(filters.limit || 20);
      return data || [];
    } catch (err) {
      console.error('Error fetching hackathon list:', err);
      return [];
    }
  }
};
