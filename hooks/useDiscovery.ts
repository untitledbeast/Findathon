'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { discoveryEngine } from '@/lib/discovery-engine';
import { SearchFilters } from '@/lib/types/search';
import { HackathonCard } from '@/lib/types/hackathon';

interface UseDiscoveryOptions {
  initialFilters?: SearchFilters;
  autoFetch?: boolean;
  pageSize?: number;
  source?: 'home' | 'map' | 'spotlight' | 'categories';
}

// 5-Minute In-Memory Client Search Cache
const searchCache = new Map<string, { data: HackathonCard[]; total: number; tookMs: number; timestamp: number }>();
const CACHE_TTL_MS = 300000;

export function useDiscovery(options: UseDiscoveryOptions = {}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const pageSize = options.pageSize || 20;
  const source = options.source || 'home';

  // Read initial filters from URL params or options
  const [filters, setFiltersState] = useState<SearchFilters>(() => {
    const qParam = searchParams.get('q') || searchParams.get('search');
    const cityParam = searchParams.get('city');
    const onlineParam = searchParams.get('online');
    const diffParam = searchParams.get('difficulty');
    const prizeParam = searchParams.get('prize') || searchParams.get('prizeMin');
    const statusParam = searchParams.get('status');
    const tagsParam = searchParams.get('tags') || searchParams.get('tag');
    const compareParam = searchParams.get('compare');

    return {
      query: qParam || options.initialFilters?.query || '',
      city: cityParam || options.initialFilters?.city || undefined,
      isOnline: onlineParam === 'true' ? true : onlineParam === 'false' ? false : options.initialFilters?.isOnline,
      difficulty: (diffParam as SearchFilters['difficulty']) || options.initialFilters?.difficulty,
      prizeMin: prizeParam ? Number(prizeParam) : options.initialFilters?.prizeMin,
      statusFilter: (statusParam as SearchFilters['statusFilter']) || options.initialFilters?.statusFilter || 'all',
      tags: tagsParam ? tagsParam.split(',') : options.initialFilters?.tags || [],
      compare: compareParam ? compareParam.split(',') : options.initialFilters?.compare || [],
      ...options.initialFilters
    };
  });

  const [results, setResults] = useState<HackathonCard[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [tookMs, setTookMs] = useState<number>(0);
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Synchronize state to URL parameters
  const syncFiltersToUrl = useCallback((newFilters: SearchFilters) => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams();
    if (newFilters.query) params.set('q', newFilters.query);
    if (newFilters.city) params.set('city', newFilters.city);
    if (newFilters.isOnline !== undefined) params.set('online', String(newFilters.isOnline));
    if (newFilters.difficulty) params.set('difficulty', newFilters.difficulty);
    if (newFilters.prizeMin) params.set('prize', String(newFilters.prizeMin));
    if (newFilters.statusFilter && newFilters.statusFilter !== 'all') params.set('status', newFilters.statusFilter);
    if (newFilters.tags && newFilters.tags.length > 0) params.set('tags', newFilters.tags.join(','));
    if (newFilters.compare && newFilters.compare.length > 0) params.set('compare', newFilters.compare.join(','));

    const queryString = params.toString();
    const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;
    window.history.replaceState(null, '', targetUrl);
  }, [pathname]);

  // Master fetch function with In-Memory Cache and AbortController request cancellation
  const executeSearch = useCallback(async (
    targetFilters: SearchFilters,
    targetPage: number = 0,
    append: boolean = false
  ) => {
    // Cancel previous inflight search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const cacheKey = JSON.stringify({ filters: targetFilters, page: targetPage, limit: pageSize });
    const cached = searchCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      setResults(prev => append ? [...prev, ...cached.data] : cached.data);
      setTotal(cached.total);
      setTookMs(cached.tookMs);
      setHasMore(cached.data.length === pageSize);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await discoveryEngine.discover({
        ...targetFilters,
        limit: pageSize,
        offset: targetPage * pageSize
      }, source);

      setResults(prev => append ? [...prev, ...response.results] : response.results);
      setTotal(response.total);
      setTookMs(response.tookMs);
      setHasMore(response.results.length === pageSize);

      // Save to client in-memory cache
      searchCache.set(cacheKey, {
        data: response.results,
        total: response.total,
        tookMs: response.tookMs,
        timestamp: Date.now()
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Search execution failed:', err);
        setError('Unable to load hackathons. Please check your connection and retry.');
      }
    } finally {
      setLoading(false);
    }
  }, [pageSize, source]);

  // Update filters & trigger search
  const updateFilters = useCallback((updater: (prev: SearchFilters) => SearchFilters) => {
    setFiltersState(prev => {
      const next = updater(prev);
      setPage(0);
      syncFiltersToUrl(next);
      executeSearch(next, 0, false);
      return next;
    });
  }, [executeSearch, syncFiltersToUrl]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    executeSearch(filters, nextPage, true);
  }, [executeSearch, filters, hasMore, loading, page]);

  const resetFilters = useCallback(() => {
    const empty: SearchFilters = { statusFilter: 'all' };
    setFiltersState(empty);
    setPage(0);
    syncFiltersToUrl(empty);
    executeSearch(empty, 0, false);
  }, [executeSearch, syncFiltersToUrl]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (options.autoFetch === false) return;
    let isMounted = true;
    Promise.resolve().then(() => {
      if (isMounted) {
        executeSearch(filters, 0, false);
      }
    });
    return () => { isMounted = false; };
  }, []); // eslint-disable-line

  return {
    results,
    loading,
    error,
    total,
    tookMs,
    filters,
    page,
    hasMore,
    updateFilters,
    loadMore,
    resetFilters,
    refetch: () => executeSearch(filters, page, false)
  };
}
