import { Result, ok } from '@/lib/shared';
import { BaseError } from '@/lib/errors';

export interface SearchSuggestion {
  text: string;
  type: 'recent' | 'trending' | 'category' | 'city';
}

export class GetSearchSuggestionsHandler {
  public async execute(query: string): Promise<Result<SearchSuggestion[], BaseError>> {
    const q = query.toLowerCase().trim();
    if (!q) {
      return ok([
        { text: 'Artificial Intelligence', type: 'trending' },
        { text: 'Web3 & Blockchain', type: 'trending' },
        { text: 'Bangalore', type: 'city' },
        { text: 'Online', type: 'category' }
      ]);
    }

    const categories = ['AI', 'Web3', 'Cloud', 'Mobile', 'Open Source', 'Design', 'Cybersecurity'];
    const cities = ['Bangalore', 'Delhi NCR', 'Mumbai', 'Hyderabad', 'San Francisco', 'London'];

    const suggestions: SearchSuggestion[] = [];

    categories.forEach(cat => {
      if (cat.toLowerCase().includes(q)) {
        suggestions.push({ text: cat, type: 'category' });
      }
    });

    cities.forEach(city => {
      if (city.toLowerCase().includes(q)) {
        suggestions.push({ text: city, type: 'city' });
      }
    });

    if (suggestions.length === 0) {
      suggestions.push({ text: query, type: 'recent' });
    }

    return ok(suggestions);
  }
}
