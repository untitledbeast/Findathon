'use client';

import { useState, useEffect, useCallback } from 'react';
import { HackathonDTO } from '@/types';
import { hackathonsApi } from '@/lib/api/hackathons';

export function useHackathon(id: string) {
  const [data, setData] = useState<HackathonDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchHackathon = useCallback(async () => {
    if (!id) return;
    setIsFetching(true);
    setError(null);
    try {
      const res = await hackathonsApi.getById(id);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hackathon details');
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    if (id) {
      hackathonsApi.getById(id).then(res => {
        if (isMounted) {
          setData(res);
          setIsLoading(false);
        }
      }).catch(err => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load hackathon details');
          setIsLoading(false);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [id]);

  const update = useCallback(async (updatedFields: Partial<HackathonDTO>) => {
    if (!id) return null;
    setIsSubmitting(true);
    try {
      const res = await hackathonsApi.update(id, updatedFields);
      setData(res);
      return res;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [id]);

  return {
    data,
    hackathon: data,
    error,
    isLoading,
    isFetching,
    isSubmitting,
    isRefreshing: false,
    refresh: fetchHackathon,
    mutate: (updater: (prev: HackathonDTO | null) => HackathonDTO | null) => setData(updater),
    update,
    invalidate: fetchHackathon,
    prefetch: () => {},
    reset: () => { setData(null); setError(null); }
  };
}
