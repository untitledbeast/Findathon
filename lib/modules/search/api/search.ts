import { transportClient } from '@/lib/transport/http-client';
import { SearchSuggestion } from '../application/queries/GetSearchSuggestionsHandler';

export const searchApi = {
  getSuggestions: async (query: string): Promise<SearchSuggestion[]> => {
    return transportClient<SearchSuggestion[]>(`/api/v1/hackathons/search/suggestions?q=${encodeURIComponent(query)}`);
  }
};
