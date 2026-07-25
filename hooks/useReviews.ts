'use client';

import { useState, useEffect, useCallback } from 'react';
import { ReviewDTO } from '@/types';
import { reviewsApi } from '@/lib/api/reviews';
import { useAuth } from '@/lib/auth-context';

export function useReviews(hackathonId: string) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ReviewDTO[]>([]);
  const [average, setAverage] = useState<number>(5.0);
  const [total, setTotal] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchReviews = useCallback(async () => {
    if (!hackathonId) return;
    setIsFetching(true);
    setError(null);
    try {
      const res = await reviewsApi.getByHackathon(hackathonId);
      setReviews(res.reviews);
      setAverage(res.average);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [hackathonId]);

  useEffect(() => {
    let isMounted = true;
    if (hackathonId) {
      reviewsApi.getByHackathon(hackathonId).then(res => {
        if (isMounted) {
          setReviews(res.reviews);
          setAverage(res.average);
          setTotal(res.total);
          setIsLoading(false);
        }
      }).catch(err => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load reviews');
          setIsLoading(false);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [hackathonId]);

  const submitReview = useCallback(async (reviewData: {
    rating: number;
    title: string;
    body: string;
    organizationQuality: number;
    prizeTransparency: number;
    mentorship: number;
  }) => {
    if (!user) throw new Error('Authentication required');
    setIsSubmitting(true);
    try {
      const res = await reviewsApi.create({
        hackathonId,
        ...reviewData
      });
      await fetchReviews();
      return res;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [user, hackathonId, fetchReviews]);

  const canReview = Boolean(user && !reviews.some(r => r.userId === user.id));

  return {
    data: reviews,
    reviews,
    average,
    total,
    error,
    isLoading,
    isFetching,
    isSubmitting,
    isRefreshing: false,
    canReview,
    submitReview,
    refresh: fetchReviews,
    mutate: (updater: (prev: ReviewDTO[]) => ReviewDTO[]) => setReviews(updater),
    invalidate: fetchReviews,
    prefetch: () => {},
    reset: () => { setReviews([]); setError(null); }
  };
}
