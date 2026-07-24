'use client';

import { useState } from 'react';
import { ReviewRepository } from '@/lib/domain/review.repository';
import { Review } from '@/lib/domain/hackathon.repository';
import { useAuth } from '@/lib/auth-context';

export function useReviews(hackathonId: string, initialReviews: Review[] = []) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [submitting, setSubmitting] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState('');

  const submitReview = async () => {
    if (!user || !userRating || !hackathonId) return;
    setSubmitting(true);
    const { data, error } = await ReviewRepository.create(
      hackathonId, user.id, userRating, userComment
    );
    if (!error && data) {
      const newReview: Review = {
        ...data,
        profile: { full_name: user.email?.split('@')[0] || 'You', avatar_url: null }
      };
      setReviews(prev => [newReview, ...prev.filter(r => r.user_id !== user.id)]);
      setUserComment('');
    }
    setSubmitting(false);
  };

  const deleteReview = async () => {
    if (!user || !hackathonId) return;
    await ReviewRepository.delete(hackathonId, user.id);
    setReviews(prev => prev.filter(r => r.user_id !== user.id));
  };

  return {
    reviews,
    submitReview,
    deleteReview,
    submitting,
    userRating,
    setUserRating,
    userComment,
    setUserComment
  };
}
