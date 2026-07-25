'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SearchResultDTO, HackathonFilters } from '@/types';
import { hackathonsApi } from '@/lib/api/hackathons';

export function useHackathons(filters: HackathonFilters = {}) {
  const [data, setData] = useState<SearchResultDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const filterCity = filters.city;
  const filterMode = filters.mode;
  const filterOnline = filters.isOnline;
  const filterQuery = filters.query;
  const filterTags = filters.tags ? filters.tags.join(',') : '';

  const fetchHackathons = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsFetching(true);
    setError(null);

    try {
      const res = await hackathonsApi.getAll({
        city: filterCity,
        mode: filterMode,
        isOnline: filterOnline,
        query: filterQuery,
        tags: filterTags ? filterTags.split(',') : undefined
      });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hackathons');
    } finally {
      setIsLoading(false);
      setIsFetching(false);
      setIsRefreshing(false);
    }
  }, [filterCity, filterMode, filterOnline, filterQuery, filterTags]);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      fetchHackathons();
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [fetchHackathons]);

  const refresh = useCallback(() => fetchHackathons(true), [fetchHackathons]);

  const mutate = useCallback((updater: (prev: SearchResultDTO | null) => SearchResultDTO | null) => {
    setData(updater);
  }, []);

  return {
    data,
    hackathons: data?.hackathons || [],
    total: data?.total || 0,
    error,
    isLoading,
    isFetching,
    isSubmitting: false,
    isRefreshing,
    refresh,
    mutate,
    invalidate: refresh,
    prefetch: () => {},
    reset: () => { setData(null); setError(null); }
  };
}
