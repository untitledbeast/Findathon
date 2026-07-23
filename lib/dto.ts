import { Hackathon } from './supabase';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    requestId?: string;
  };
}

export type LifecycleState =
  | 'draft'
  | 'submitted'
  | 'pending_review'
  | 'verified'
  | 'published'
  | 'registration_closed'
  | 'event_running'
  | 'completed'
  | 'archived';

export interface HackathonDTO {
  id: string;
  title: string;
  tagline?: string | null;
  description: string;
  start_date: string;
  end_date: string;
  registration_deadline?: string | null;
  location_city?: string | null;
  location_college?: string | null;
  full_address?: string | null;
  is_online: boolean;
  mode?: 'Online' | 'Offline' | 'Hybrid' | string;
  tags: string[];
  register_url: string;
  organizer: string;
  cover_image_url?: string | null;
  status: string;
  lifecycle_state: LifecycleState;
  latitude: number | null;
  longitude: number | null;
  geohash?: string | null;
  place_id?: string | null;
  country_code?: string | null;
  state?: string | null;
  district?: string | null;
  timezone?: string | null;
  prize_pool?: string | null;
  prize_amount: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'open';
  participant_count: number;
  is_featured: boolean;
  is_verified: boolean;
  base_score: number;
  dynamic_score?: number;
  final_discovery_score?: number;
  distance_km?: number;
  avg_rating: number;
  review_count: number;
  save_count: number;
  view_count: number;
  created_at?: string;
}

export interface UniversityDTO {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  country_code?: string | null;
  latitude: number | null;
  longitude: number | null;
  website?: string | null;
  logo_url?: string | null;
  reputation_rank: number;
}

export interface OrganizerDTO {
  id: string;
  name: string;
  organization_type: string;
  website?: string | null;
  logo_url?: string | null;
  reputation_score: number;
  verified_events_count: number;
  is_verified: boolean;
}

export function toHackathonDTO(raw: Partial<Hackathon> & Record<string, unknown>): HackathonDTO {
  const lat = raw.latitude !== undefined && raw.latitude !== null ? Number(raw.latitude) : null;
  const lng = raw.longitude !== undefined && raw.longitude !== null ? Number(raw.longitude) : null;

  return {
    id: (raw.id as string) || `hack-${Math.random().toString(36).substring(2, 9)}`,
    title: (raw.title as string) || 'Untitled Hackathon',
    tagline: (raw.tagline as string) || null,
    description: (raw.description as string) || '',
    start_date: (raw.start_date as string) || new Date().toISOString().split('T')[0],
    end_date: (raw.end_date as string) || new Date().toISOString().split('T')[0],
    registration_deadline: (raw.registration_deadline as string) || (raw.start_date as string) || null,
    location_city: (raw.location_city as string) || null,
    location_college: (raw.location_college as string) || null,
    full_address: (raw.full_address as string) || null,
    is_online: Boolean(raw.is_online),
    mode: (raw.mode as string) || (raw.is_online ? 'Online' : 'Offline'),
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
    register_url: (raw.register_url as string) || '#',
    organizer: (raw.organizer as string) || 'Community Organizer',
    cover_image_url: (raw.cover_image_url as string) || null,
    status: (raw.status as string) || 'approved',
    lifecycle_state: (raw.lifecycle_state as LifecycleState) || 'published',
    latitude: lat,
    longitude: lng,
    geohash: (raw.geohash as string) || null,
    place_id: (raw.place_id as string) || null,
    country_code: (raw.country_code as string) || 'IN',
    state: (raw.state as string) || null,
    district: (raw.district as string) || null,
    timezone: (raw.timezone as string) || 'Asia/Kolkata',
    prize_pool: (raw.prize_pool as string) || null,
    prize_amount: Number(raw.prize_amount || 0),
    difficulty: (raw.difficulty as 'beginner' | 'intermediate' | 'advanced' | 'open') || 'open',
    participant_count: Number(raw.participant_count || 0),
    is_featured: Boolean(raw.is_featured),
    is_verified: Boolean(raw.is_verified || raw.status === 'approved'),
    base_score: Number(raw.base_score || 50),
    distance_km: raw.distance_km !== undefined ? Number(raw.distance_km) : undefined,
    avg_rating: Number(raw.avg_rating || 4.5),
    review_count: Number(raw.review_count || 12),
    save_count: Number(raw.save_count || 24),
    view_count: Number(raw.view_count || 150),
    created_at: (raw.created_at as string) || new Date().toISOString()
  };
}
