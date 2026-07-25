'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SearchResultDTO, HackathonFilters } from '@/types';
import { searchApi } from '@/lib/api/search';

export function useSearch(initialQuery = '', initialFilters: HackathonFilters = {}) {
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<HackathonFilters>(initialFilters);
  const [data, setData] = useState<SearchResultDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const filterCity = filters.city;
  const filterMode = filters.mode;
  const filterOnline = filters.isOnline;
  const filterTags = filters.tags ? filters.tags.join(',') : '';

  const executeSearch = useCallback(async (q: string) => {
    setIsFetching(true);
    setError(null);
    try {
      const res = await searchApi.search(q, {
        city: filterCity,
        mode: filterMode,
        isOnline: filterOnline,
        tags: filterTags ? filterTags.split(',') : undefined
      });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [filterCity, filterMode, filterOnline, filterTags]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      executeSearch(query);
    }, 350);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, executeSearch]);

  return {
    query,
    setQuery,
    filters,
    setFilters,
    data,
    results: data?.hackathons || [],
    total: data?.total || 0,
    error,
    isLoading,
    isFetching,
    isSubmitting: false,
    isRefreshing: false,
    refresh: () => executeSearch(query),
    mutate: (updater: (prev: SearchResultDTO | null) => SearchResultDTO | null) => setData(updater),
    invalidate: () => executeSearch(query),
    prefetch: () => {},
    reset: () => { setQuery(''); setFilters({}); setData(null); setError(null); }
  };
}
