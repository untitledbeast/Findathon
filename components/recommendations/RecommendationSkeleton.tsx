'use client';

import React from 'react';

export default function RecommendationSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex gap-6 overflow-hidden py-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-84 h-96 glass-card rounded-3xl p-5 animate-pulse space-y-4 shrink-0 bg-slate-900/30 border border-purple-900/20"
        >
          <div className="w-full h-40 bg-slate-900/80 rounded-2xl shimmer" />
          <div className="h-5 w-3/4 bg-slate-900/80 rounded shimmer" />
          <div className="h-4 w-1/2 bg-slate-900/80 rounded shimmer" />
          <div className="h-12 w-full bg-slate-900/80 rounded-xl shimmer" />
        </div>
      ))}
    </div>
  );
}
