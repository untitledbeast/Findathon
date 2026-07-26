export interface HackathonSearchFilters {
  query?: string;
  tags?: string[];
  isOnline?: boolean;
  city?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'open';
  prizeMin?: number;
  prizeMax?: number;
  registrationOpen?: boolean;
  sortBy?: 'relevance' | 'deadline' | 'prize' | 'rating' | 'newest' | 'trending';
  cursor?: string;
  limit?: number;
}

export class HackathonSearchSpecification {
  constructor(public readonly filters: HackathonSearchFilters) {}

  public isSatisfiedBy(item: {
    title: string;
    description: string;
    tags: string[];
    isOnline: boolean;
    locationCity?: string;
    prizeAmount: number;
    status: string;
  }): boolean {
    if (item.status !== 'approved' && item.status !== 'published') {
      return false;
    }

    if (this.filters.isOnline !== undefined && item.isOnline !== this.filters.isOnline) {
      return false;
    }

    if (this.filters.city && item.locationCity?.toLowerCase() !== this.filters.city.toLowerCase()) {
      return false;
    }

    if (this.filters.prizeMin && item.prizeAmount < this.filters.prizeMin) {
      return false;
    }

    if (this.filters.tags && this.filters.tags.length > 0) {
      const hasMatchingTag = this.filters.tags.some(t => item.tags.map(x => x.toLowerCase()).includes(t.toLowerCase()));
      if (!hasMatchingTag) return false;
    }

    if (this.filters.query) {
      const q = this.filters.query.toLowerCase();
      const titleMatches = item.title.toLowerCase().includes(q);
      const descMatches = item.description.toLowerCase().includes(q);
      const tagMatches = item.tags.some(t => t.toLowerCase().includes(q));
      if (!titleMatches && !descMatches && !tagMatches) return false;
    }

    return true;
  }
}
