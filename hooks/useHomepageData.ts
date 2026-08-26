'use client';

import { useState, useEffect, useCallback } from 'react';
import { transportClient } from '@/lib/transport/http-client';
import { HackathonDTO, hackathonsApi } from '@/lib/modules/hackathons';
import { BaseError } from '@/lib/errors';
import { CURATED_COLLECTIONS } from '@/lib/collections';

export interface HomepageStats {
  hackathons: number;
  users: number;
  prizes: string;
  cities: number;
}

export interface TrendingTag {
  name: string;
  slug: string;
  icon: string;
  count: number;
  category: string;
}

export interface HomepageData {
  stats: HomepageStats;
  featured: HackathonDTO[];
  trendingTags: TrendingTag[];
  collections: typeof CURATED_COLLECTIONS;
}

export function useHomepageData() {
  const [data, setData] = useState<HomepageData | null>(null);
  const [error, setError] = useState<BaseError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  const fetchHomepageData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsRes, featuredRes, tagsRes] = await Promise.all([
        transportClient<HomepageStats>('/api/v1/stats').catch(() => ({
          hackathons: 0,
          users: 0,
          prizes: '',
          cities: 0
        })),
        hackathonsApi.search({ limit: 8 }).then(r => r?.hackathons || (Array.isArray(r) ? r : [])).catch(() => []),
        transportClient<TrendingTag[]>('/api/v1/tags/trending').catch(() => [])
      ]);

      setData({
        stats: statsRes,
        featured: featuredRes,
        trendingTags: tagsRes,
        collections: CURATED_COLLECTIONS
      });
    } catch (err) {
      setError(err instanceof BaseError ? err : new BaseError('Failed to load homepage data'));
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    Promise.resolve().then(async () => {
      if (isActive) {
        await fetchHomepageData();
      }
    });
    return () => { isActive = false; };
  }, [fetchHomepageData]);

  return {
    data,
    stats: data?.stats,
    featured: data?.featured || [],
    trendingTags: data?.trendingTags || [],
    collections: data?.collections || CURATED_COLLECTIONS,
    error,
    isLoading,
    isFetching,
    refresh: fetchHomepageData
  };
}
