import { SearchFilters, ParsedIntent, DiscoveryResponse, SearchSuggestion } from './types/search';
import { HackathonCard } from './types/hackathon';
import { parseSearchIntent } from './intent-parser';
import { rankHackathons } from './search-ranking';
import { getSearchSuggestions } from './search-suggestions';
import { logSearchAnalytics } from './search-analytics';
import { CURATED_COLLECTIONS } from './collections';
import { IHackathonRepository, SupabaseHackathonRepository } from './repository';

export interface IDiscoveryEngine {
  discover(filters?: SearchFilters, source?: 'home' | 'map' | 'spotlight' | 'categories'): Promise<DiscoveryResponse<HackathonCard>>;
  searchNaturalLanguage(query: string, source?: 'home' | 'map' | 'spotlight' | 'categories'): Promise<{ parsed: ParsedIntent; response: DiscoveryResponse<HackathonCard> }>;
  getSuggestions(query: string): Promise<SearchSuggestion[]>;
  getCollections(): typeof CURATED_COLLECTIONS;
  getByIds(ids: string[]): Promise<HackathonCard[]>;
  getById(id: string): Promise<HackathonCard | null>;
}

export class StatelessDiscoveryEngine implements IDiscoveryEngine {
  private repository: IHackathonRepository;

  constructor(repository?: IHackathonRepository) {
    this.repository = repository || new SupabaseHackathonRepository();
  }

  async discover(
    filters: SearchFilters = {},
    source: 'home' | 'map' | 'spotlight' | 'categories' = 'home'
  ): Promise<DiscoveryResponse<HackathonCard>> {
    const startTime = Date.now();

    try {
      // 1. Fetch raw filtered candidates from Repository
      const rawResults = await this.repository.findAll(filters);

      // Normalize registration_deadline string | null | undefined -> string | null
      const cards: HackathonCard[] = rawResults.map(r => ({
        ...r,
        location_city: r.location_city || null,
        registration_deadline: r.registration_deadline || null,
        cover_image_url: r.cover_image_url || null,
        latitude: r.latitude || null,
        longitude: r.longitude || null,
        prize_pool: r.prize_pool || null,
        prize_amount: r.prize_amount || 0,
        difficulty: r.difficulty || 'open',
        is_featured: Boolean(r.is_featured)
      }));

      // 2. Apply Pure TypeScript Business Ranking
      const rankedResults = rankHackathons(cards, {
        userTags: filters.tags,
        userLocation: (filters.userLat && filters.userLng) ? { lat: filters.userLat, lng: filters.userLng } : undefined,
        now: new Date()
      });

      const tookMs = Date.now() - startTime;

      // 3. Fire-and-forget analytics logging
      if (filters.query) {
        logSearchAnalytics({
          query: filters.query,
          search_source: source,
          results_count: rankedResults.length,
          response_time_ms: tookMs,
          timestamp: new Date().toISOString()
        });
      }

      return {
        results: rankedResults,
        total: rankedResults.length,
        tookMs,
        filters
      };
    } catch (err) {
      console.error('Discovery Engine error:', err);
      return {
        results: [],
        total: 0,
        tookMs: Date.now() - startTime,
        filters
      };
    }
  }

  async searchNaturalLanguage(
    query: string,
    source: 'home' | 'map' | 'spotlight' | 'categories' = 'spotlight'
  ) {
    const parsed = parseSearchIntent(query);
    const response = await this.discover(parsed.filters, source);
    return { parsed, response };
  }

  async getSuggestions(query: string): Promise<SearchSuggestion[]> {
    return getSearchSuggestions(query);
  }

  getCollections() {
    return CURATED_COLLECTIONS;
  }

  async getByIds(ids: string[]): Promise<HackathonCard[]> {
    if (!ids || ids.length === 0) return [];
    try {
      const { results } = await this.discover();
      return results.filter(h => ids.includes(h.id));
    } catch (err) {
      console.error('getByIds error:', err);
      return [];
    }
  }

  async getById(id: string): Promise<HackathonCard | null> {
    const items = await this.getByIds([id]);
    return items[0] || null;
  }
}

export const discoveryEngine = new StatelessDiscoveryEngine();
