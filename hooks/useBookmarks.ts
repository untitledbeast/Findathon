'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookmarkDTO } from '@/types';
import { bookmarksApi } from '@/lib/api/bookmarks';
import { useAuth } from '@/lib/auth-context';

export function useBookmarks() {
  const { user } = useAuth();
  const [data, setData] = useState<BookmarkDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(user));
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchBookmarks = useCallback(async () => {
    if (!user) return;
    setIsFetching(true);
    setError(null);
    try {
      const res = await bookmarksApi.getUserBookmarks();
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load saved hackathons');
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    if (!user) return;

    bookmarksApi.getUserBookmarks().then(res => {
      if (isMounted) {
        setData(res);
        setIsLoading(false);
      }
    }).catch(err => {
      if (isMounted) {
        setError(err instanceof Error ? err.message : 'Failed to load saved hackathons');
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [user]);

  const isSaved = useCallback((hackathonId: string) => {
    return data.some(b => b.hackathonId === hackathonId);
  }, [data]);

  const toggle = useCallback(async (hackathonId: string) => {
    if (!user) throw new Error('Authentication required');

    const alreadySaved = data.some(b => b.hackathonId === hackathonId);
    const previous = [...data];

    if (alreadySaved) {
      setData(prev => prev.filter(b => b.hackathonId !== hackathonId));
    } else {
      setData(prev => [...prev, { id: `temp-${Date.now()}`, userId: user.id, hackathonId, savedAt: new Date().toISOString() }]);
    }

    setIsSubmitting(true);
    try {
      const res = await bookmarksApi.toggle(hackathonId);
      await fetchBookmarks();
      return res;
    } catch (err) {
      setData(previous);
      setError(err instanceof Error ? err.message : 'Failed to update bookmark');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [user, data, fetchBookmarks]);

  return {
    data,
    bookmarks: data,
    savedIds: data.map(b => b.hackathonId),
    error,
    isLoading: user ? isLoading : false,
    isFetching,
    isSubmitting,
    isRefreshing: false,
    isSaved,
    toggle,
    refresh: fetchBookmarks,
    mutate: (updater: (prev: BookmarkDTO[]) => BookmarkDTO[]) => setData(updater),
    invalidate: fetchBookmarks,
    prefetch: () => {},
    reset: () => { setData([]); setError(null); }
  };
}
