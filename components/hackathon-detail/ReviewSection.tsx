'use client';

import React from 'react';
import { ReviewDTO } from '@/lib/domain/dtos/hackathon.dto';
import { useReviewList } from '@/hooks/useReviewList';
import { useCreateReview } from '@/hooks/useCreateReview';
import { useDeleteReview } from '@/hooks/useDeleteReview';
import { useAuth } from '@/lib/auth-context';
import { useAuthModal } from '@/components/AuthModal';
import { Star } from 'lucide-react';

interface ReviewSectionProps {
  hackathonId: string;
  initialReviews: ReviewDTO[];
  avgRating: number;
}

export function ReviewSection({ hackathonId, initialReviews, avgRating }: ReviewSectionProps) {
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { reviews, setReviews } = useReviewList(hackathonId, initialReviews);
  const {
    submitting,
    userRating,
    setUserRating,
    userComment,
    setUserComment,
    submitReview
  } = useCreateReview(hackathonId);
  const { deleteReview } = useDeleteReview(hackathonId);

  const handleSubmit = async () => {
    const created = await submitReview();
    if (created) {
      setReviews(prev => [created, ...prev.filter(r => r.userId !== user?.id)]);
    }
  };

  const handleDelete = async () => {
    const success = await deleteReview();
    if (success && user) {
      setReviews(prev => prev.filter(r => r.userId !== user.id));
    }
  };

  return (
    <section className="glass-card rounded-3xl p-6 sm:p-8 border border-purple-900/30 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-400 fill-amber-400" /> Community Reviews
        </h3>
        <span className="text-xs text-slate-400 font-mono font-bold">
          {reviews.length} Total Reviews
        </span>
      </div>

      {/* RATING SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-6 rounded-2xl bg-slate-950/60 border border-purple-900/20">
        <div className="flex flex-col items-center justify-center text-center space-y-1">
          <span className="text-5xl font-black font-mono text-white">
            {avgRating ? avgRating.toFixed(1) : '4.8'}
          </span>
          <div className="flex items-center gap-1 text-amber-400">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <span className="text-xs text-slate-400 font-semibold">Average Rating</span>
        </div>

        <div className="sm:col-span-2 space-y-2">
          {[5, 4, 3, 2, 1].map(stars => (
            <div key={stars} className="flex items-center gap-3 text-xs font-bold text-slate-400">
              <span>{stars} ★</span>
              <div className="flex-1 h-2 rounded-full bg-slate-900 overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{ width: `${stars === 5 ? 80 : stars === 4 ? 15 : 5}%` }}
                />
              </div>
              <span className="w-8 text-right font-mono">{stars === 5 ? '80%' : stars === 4 ? '15%' : '5%'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* WRITE REVIEW FORM */}
      {user ? (
        <div className="p-6 rounded-2xl glass-card border border-purple-500/30 space-y-4">
          <h4 className="text-sm font-bold text-white">Write a Review for this Hackathon</h4>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Your Rating:</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setUserRating(star)}
                  className="p-1 hover:scale-125 transition-transform"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= userRating
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-600 hover:text-amber-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={userComment}
            onChange={e => setUserComment(e.target.value)}
            placeholder="Share your feedback, organization quality, mentors, and experience..."
            rows={3}
            className="w-full p-3 rounded-xl bg-slate-950/80 border border-purple-900/40 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />

          <button
            onClick={handleSubmit}
            disabled={submitting || !userRating}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg disabled:opacity-50 transition-all"
          >
            {submitting ? 'Submitting...' : 'Post Review'}
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-2xl glass-card border border-purple-900/30 text-center space-y-2">
          <p className="text-xs text-slate-300 font-medium">Log in to write a community review and share your hackathon experience.</p>
          <button
            onClick={openAuthModal}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
          >
            Log In to Review
          </button>
        </div>
      )}

      {/* REVIEWS LIST */}
      <div className="space-y-4 pt-4 border-t border-purple-900/20">
        {reviews.length > 0 ? (
          reviews.map(r => (
            <div key={r.id} className="p-4 rounded-2xl glass-card border border-purple-900/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-900/60 border border-purple-500/30 flex items-center justify-center font-bold text-xs text-purple-300">
                    {r.profile?.fullName?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">{r.profile?.fullName || 'Anonymous Developer'}</h5>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>

              {r.comment && <p className="text-xs text-slate-300">{r.comment}</p>}

              {user && r.userId === user.id && (
                <button
                  onClick={handleDelete}
                  className="text-[10px] font-bold text-rose-400 hover:underline"
                >
                  Delete My Review
                </button>
              )}
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-500 text-center py-4">No reviews yet. Be the first to leave a review!</p>
        )}
      </div>
    </section>
  );
}
