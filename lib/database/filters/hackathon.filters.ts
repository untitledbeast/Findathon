export interface HackathonFilters {
  query?: string;
  city?: string;
  college?: string;
  organizer_id?: string;
  university_id?: string;
  city_id?: string;
  tags?: string[];
  mode?: 'online' | 'offline' | 'hybrid' | 'all';
  is_online?: boolean;
  is_verified?: boolean;
  status?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'start_date' | 'prize_amount' | 'view_count' | 'avg_rating';
  sortOrder?: 'asc' | 'desc';
}

export interface OrganizerFilters {
  query?: string;
  is_verified?: boolean;
  country?: string;
  limit?: number;
}

export interface SearchFilters extends HackathonFilters {
  minPrize?: number;
  difficulty?: string;
}
