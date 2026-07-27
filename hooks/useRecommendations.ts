'use client';

import { useState, useEffect, useCallback } from 'react';
import { transportClient } from '@/lib/transport/http-client';
import { HackathonDTO } from '@/lib/modules/hackathons';
import { useAuth } from '@/lib/auth-context';
import { BaseError } from '@/lib/errors';

export interface RecommendedHackathon extends HackathonDTO {
  recommendationReason: string;
}

export function useRecommendations() {
  const { user } = useAuth();
  const [data, setData] = useState<RecommendedHackathon[]>([]);
  const [error, setError] = useState<BaseError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchRecommendations = useCallback(async () => {
    if (!user) {
      setData([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await transportClient<RecommendedHackathon[]>('/api/v1/hackathons/recommended');
      setData(res);
    } catch (err) {
      setError(err instanceof BaseError ? err : new BaseError('Failed to fetch recommendations'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let isActive = true;
    Promise.resolve().then(async () => {
      if (isActive && user) {
        await fetchRecommendations();
      }
    });
    return () => { isActive = false; };
  }, [fetchRecommendations, user]);

  return {
    data,
    error,
    isLoading,
    refresh: fetchRecommendations
  };
}
