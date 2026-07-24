'use client';

import { useState } from 'react';
import { ReviewRepository } from '@/lib/domain/review.repository';
import { ReviewDTO } from '@/lib/domain/dtos/hackathon.dto';
import { useAuth } from '@/lib/auth-context';

export function useCreateReview(hackathonId: string) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState('');

  const submitReview = async (): Promise<ReviewDTO | null> => {
    if (!user || !userRating || !hackathonId) return null;
    setSubmitting(true);

    try {
      const { data, error } = await ReviewRepository.create(
        hackathonId,
        user.id,
        userRating,
        userComment
      );

      if (!error && data) {
        const created: ReviewDTO = {
          id: data.id,
          rating: data.rating,
          comment: data.comment,
          createdAt: data.created_at,
          userId: user.id,
          profile: {
            fullName: user.email?.split('@')[0] || 'You',
            avatarUrl: null
          }
        };
        setUserComment('');
        setUserRating(0);
        return created;
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
    } finally {
      setSubmitting(false);
    }

    return null;
  };

  return {
    submitting,
    userRating,
    setUserRating,
    userComment,
    setUserComment,
    submitReview
  };
}
