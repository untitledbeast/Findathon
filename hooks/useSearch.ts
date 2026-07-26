'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { hackathonsApi, HackathonDTO, HackathonSearchFilters } from '@/lib/modules/hackathons';
import { BaseError } from '@/lib/errors';

export function useSearch(initialFilters: HackathonSearchFilters = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<HackathonSearchFilters>(() => {
    const q = searchParams.get('q') || searchParams.get('query') || undefined;
    const city = searchParams.get('city') || undefined;
    const isOnlineParam = searchParams.get('isOnline');
    const isOnline = isOnlineParam !== null ? isOnlineParam === 'true' : undefined;
    const tagsParam = searchParams.get('tags');
    const tags = tagsParam ? tagsParam.split(',') : undefined;
    return { ...initialFilters, ...(q ? { query: q } : {}), ...(city ? { city } : {}), ...(isOnline !== undefined ? { isOnline } : {}), ...(tags ? { tags } : {}) };
  });

  const [data, setData] = useState<{ hackathons: HackathonDTO[]; total: number; cursor?: string } | null>(null);
  const [error, setError] = useState<BaseError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const updateUrlParams = useCallback((newFilters: HackathonSearchFilters) => {
    const params = new URLSearchParams();
    if (newFilters.query) params.set('q', newFilters.query);
    if (newFilters.city) params.set('city', newFilters.city);
    if (newFilters.isOnline !== undefined) params.set('isOnline', String(newFilters.isOnline));
    if (newFilters.tags && newFilters.tags.length > 0) params.set('tags', newFilters.tags.join(','));
    if (newFilters.sortBy) params.set('sortBy', newFilters.sortBy);

    const paramStr = params.toString();
    router.replace(paramStr ? `?${paramStr}` : window.location.pathname, { scroll: false });
  }, [router]);

  const executeSearch = useCallback(async (activeFilters: HackathonSearchFilters, append = false) => {
    if (!append) {
      setIsLoading(true);
    } else {
      setIsFetching(true);
    }
    setError(null);

    try {
      const res = await hackathonsApi.search(activeFilters);
      if (append) {
        setData(prev => ({
          hackathons: [...(prev?.hackathons || []), ...res.hackathons],
          total: res.total,
          cursor: res.cursor
        }));
      } else {
        setData({
          hackathons: res.hackathons,
          total: res.total,
          cursor: res.cursor
        });
      }
      setHasMore(Boolean(res.cursor));
    } catch (err) {
      setError(err instanceof BaseError ? err : new BaseError(err instanceof Error ? err.message : 'Search failed'));
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    Promise.resolve().then(async () => {
      if (isActive) {
        await executeSearch(filters);
      }
    });
    return () => { isActive = false; };
  }, [executeSearch, filters]);

  const updateFilter = useCallback(<K extends keyof HackathonSearchFilters>(
    key: K,
    value: HackathonSearchFilters[K]
  ) => {
    const updated = { ...filters, [key]: value, cursor: undefined };
    setFilters(updated);
    updateUrlParams(updated);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      executeSearch(updated);
    }, key === 'query' ? 300 : 0);
  }, [filters, updateUrlParams, executeSearch]);

  const setAllFilters = useCallback((newFilters: HackathonSearchFilters) => {
    setFilters(newFilters);
    updateUrlParams(newFilters);
    executeSearch(newFilters);
  }, [updateUrlParams, executeSearch]);

  const reset = useCallback(() => {
    setFilters({});
    updateUrlParams({});
    executeSearch({});
  }, [updateUrlParams, executeSearch]);

  const loadMore = useCallback(() => {
    if (data?.cursor && !isFetching) {
      executeSearch({ ...filters, cursor: data.cursor }, true);
    }
  }, [data, isFetching, filters, executeSearch]);

  return {
    data,
    results: data?.hackathons || [],
    total: data?.total || 0,
    hasMore,
    filters,
    error,
    isLoading,
    isFetching,
    isSubmitting: false,
    updateFilter,
    setFilters: setAllFilters,
    loadMore,
    refresh: () => executeSearch(filters),
    mutate: (updater: (prev: { hackathons: HackathonDTO[]; total: number; cursor?: string } | null) => { hackathons: HackathonDTO[]; total: number; cursor?: string } | null) => setData(updater),
    invalidate: () => executeSearch(filters),
    reset
  };
}
