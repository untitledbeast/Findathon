export interface SearchFilters {
  query?: string;
  tags?: string[];
  isOnline?: boolean;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'open';
  prizeMin?: number;
  city?: string;
  country?: string;
  radiusKm?: number;
  startAfter?: string;
  startBefore?: string;
  statusFilter?: 'all' | 'open' | 'closing_soon' | 'closed';
  sort?: 'relevance' | 'date' | 'prize' | 'popularity';
  userLat?: number;
  userLng?: number;
  limit?: number;
  offset?: number;
  compare?: string[];
}

export interface ParsedIntent {
  query: string;
  filters: SearchFilters;
  confidence: number;
  detectedEntities: {
    tags: string[];
    city: string | null;
    difficulty: string | null;
    isOnline: boolean | null;
    prizeMin: number | null;
    timeframe: { start: string | null; end: string | null };
  };
}

export interface SearchSuggestion {
  type: 'hackathon' | 'tag' | 'city' | 'category' | 'organizer';
  label: string;
  filters?: Partial<SearchFilters>;
}

export interface DiscoveryResponse<T> {
  results: T[];
  total: number;
  tookMs: number;
  filters: SearchFilters;
}
