'use client';

import React from 'react';

export default function SkeletonCard() {
  return (
    <div className="glass-card rounded-2xl p-5 w-full md:w-64 flex-shrink-0 flex flex-col justify-between border border-purple-500/10 bg-[#0D1224]/50 animate-pulse space-y-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-full bg-slate-800" />
          <div className="w-16 h-5 rounded-full bg-slate-800" />
        </div>
        <div className="space-y-1.5">
          <div className="w-3/4 h-4 rounded bg-slate-800" />
          <div className="w-1/2 h-3 rounded bg-slate-800/80" />
        </div>
        <div className="flex gap-1.5 pt-1">
          <div className="w-14 h-4 rounded bg-slate-800/60" />
          <div className="w-14 h-4 rounded bg-slate-800/60" />
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-slate-800/60">
        <div className="space-y-1">
          <div className="w-10 h-2.5 rounded bg-slate-800/50" />
          <div className="w-full h-3.5 rounded bg-slate-800/70" />
        </div>
        <div className="space-y-1">
          <div className="w-10 h-2.5 rounded bg-slate-800/50" />
          <div className="w-3/4 h-3.5 rounded bg-slate-800/70" />
        </div>
      </div>

      <div className="pt-2 border-t border-slate-800/60 flex gap-2">
        <div className="flex-1 h-7 rounded-xl bg-slate-800" />
        <div className="flex-1 h-7 rounded-xl bg-slate-800" />
      </div>
    </div>
  );
}
