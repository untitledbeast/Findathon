'use client';

import React from 'react';

export interface RecommendationEmptyStateProps {
  message?: string;
  onResetFilter?: () => void;
}

export default function RecommendationEmptyState({
  message = 'No hackathons found matching this filter.',
  onResetFilter
}: RecommendationEmptyStateProps) {
  return (
    <div className="glass-card rounded-3xl border border-purple-900/30 p-8 text-center space-y-3 max-w-md mx-auto">
      <p className="text-sm text-slate-400 font-medium">{message}</p>
      {onResetFilter && (
        <button
          onClick={onResetFilter}
          className="px-4 py-1.5 rounded-xl bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-bold hover:bg-purple-600/50 transition-all cursor-pointer"
        >
          View all tracks
        </button>
      )}
    </div>
  );
}
