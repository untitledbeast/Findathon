type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

export class EntityCacheService {
  private cache = new Map<string, CacheEntry<unknown>>();
  private defaultTTLMs = 300000; // 5 Minutes TTL

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.defaultTTLMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now() - (ttlMs ? (this.defaultTTLMs - ttlMs) : 0)
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const entityCache = new EntityCacheService();
