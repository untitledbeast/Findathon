export interface HackathonCard {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  registration_deadline: string | null;
  location_city: string | null;
  location_college?: string | null;
  is_online: boolean;
  tags: string[];
  register_url: string;
  organizer: string;
  cover_image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  prize_pool: string | null;
  prize_amount: number;
  difficulty: string;
  is_featured: boolean;
  is_verified?: boolean;
  relevance_score?: number;
  distance_km?: number | null;
  days_until_deadline?: number | null;
  avg_rating?: number;
  review_count?: number;
  save_count?: number;
  view_count?: number;
}

export interface HackathonEntity extends HackathonCard {
  status: string;
  created_at?: string;
  updated_at?: string;
}
