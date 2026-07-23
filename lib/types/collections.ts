import { SearchFilters } from './search';

export interface Collection {
  id: string;
  title: string;
  description: string;
  emoji: string;
  query: Partial<SearchFilters>;
}
