export interface ICacheProvider {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttlSeconds: number): void;
  delete(key: string): void;
  invalidatePrefix(prefix: string): void;
  clear(): void;
}

export class MemoryCacheProvider implements ICacheProvider {
  private cache = new Map<string, { value: unknown; expiresAt: number }>();

  public get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.value as T;
  }

  public set<T>(key: string, value: T, ttlSeconds: number): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  public delete(key: string): void {
    this.cache.delete(key);
  }

  public invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  public clear(): void {
    this.cache.clear();
  }
}

export class CacheService implements ICacheProvider {
  constructor(private provider: ICacheProvider = new MemoryCacheProvider()) {}

  public get<T>(key: string): T | null {
    return this.provider.get<T>(key);
  }

  public set<T>(key: string, value: T, ttlSeconds: number): void {
    this.provider.set<T>(key, value, ttlSeconds);
  }

  public delete(key: string): void {
    this.provider.delete(key);
  }

  public invalidatePrefix(prefix: string): void {
    this.provider.invalidatePrefix(prefix);
  }

  public clear(): void {
    this.provider.clear();
  }
}

export const HACKATHON_TTL = 600;
export const SEARCH_TTL = 120;
export const TRENDING_TTL = 300;
export const PROFILE_TTL = 1800;
export const NOTIFICATION_TTL = 60;

export const CacheKeys = {
  hackathonKey: (id: string) => `hackathon:${id}`,
  hackathonListKey: (filters: string) => `hackathons:${filters}`,
  searchKey: (query: string, filters: string) => `search:${query}:${filters}`,
  trendingKey: () => 'trending',
  profileKey: (userId: string) => `profile:${userId}`,
  bookmarksKey: (userId: string) => `bookmarks:${userId}`
};
