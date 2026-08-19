'use client';

import React from 'react';
import { Info } from 'lucide-react';

export interface RecommendationErrorStateProps {
  error: string;
  onRetry?: () => void;
}

export default function RecommendationErrorState({
  error,
  onRetry
}: RecommendationErrorStateProps) {
  return (
    <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <Info className="w-4 h-4 text-rose-400 shrink-0" />
        <span>{error}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 rounded-xl text-rose-300 font-bold transition-all cursor-pointer shrink-0"
        >
          Retry
        </button>
      )}
    </div>
  );
}
