'use client';

import { useState, useEffect } from 'react';
import { ReviewRepository } from '@/lib/domain/review.repository';
import { ReviewDTO } from '@/lib/domain/dtos/hackathon.dto';
import { mapReviewToDTO } from '@/lib/domain/mappers/hackathon.mapper';

export function useReviewList(hackathonId: string, initialReviews: ReviewDTO[] = []) {
  const [reviews, setReviews] = useState<ReviewDTO[]>(initialReviews);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hackathonId || initialReviews.length > 0) return;
    let isMounted = true;

    ReviewRepository.getForHackathon(hackathonId).then(raw => {
      if (isMounted) {
        setReviews(raw.map(item => mapReviewToDTO(item as unknown as Record<string, unknown>)));
        setLoading(false);
      }
    });

    return () => { isMounted = false; };
  }, [hackathonId, initialReviews.length]);

  return { reviews, setReviews, loading };
}
