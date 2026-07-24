'use client';

import { useState } from 'react';
import { ReviewRepository } from '@/lib/domain/review.repository';
import { useAuth } from '@/lib/auth-context';

export function useDeleteReview(hackathonId: string) {
  const { user } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const deleteReview = async (): Promise<boolean> => {
    if (!user || !hackathonId) return false;
    setDeleting(true);

    try {
      await ReviewRepository.delete(hackathonId, user.id);
      return true;
    } catch (err) {
      console.error('Failed to delete review:', err);
      return false;
    } finally {
      setDeleting(false);
    }
  };

  return { deleteReview, deleting };
}
