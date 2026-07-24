'use client';

import React from 'react';
import { Trophy } from 'lucide-react';

interface PrizeSectionProps {
  prizePool: string | null;
  prizeAmount: number;
  prizeBreakdown: { title?: string; amount?: string }[];
}

export function PrizeSection({ prizePool, prizeAmount, prizeBreakdown }: PrizeSectionProps) {
  if (!prizePool && (!prizeBreakdown || prizeBreakdown.length === 0)) {
    return null;
  }

  return (
    <section className="glass-card rounded-3xl p-6 sm:p-8 border border-purple-900/30 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" /> Prize Breakdown
        </h3>
        <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/80 px-3 py-1 rounded-full border border-amber-500/30">
          Total: {prizePool || `₹${prizeAmount.toLocaleString()}`}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-amber-500/40 bg-amber-950/20 text-center space-y-2">
          <div className="text-3xl">🥇</div>
          <h4 className="text-sm font-bold text-amber-300">1st Place Winner</h4>
          <p className="text-xl font-black text-white">
            {prizeBreakdown?.[0]?.amount || '₹25,000'}
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-400/30 bg-slate-900/40 text-center space-y-2">
          <div className="text-3xl">🥈</div>
          <h4 className="text-sm font-bold text-slate-300">2nd Place Runner-Up</h4>
          <p className="text-xl font-black text-white">
            {prizeBreakdown?.[1]?.amount || '₹15,000'}
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-amber-700/30 bg-amber-950/10 text-center space-y-2">
          <div className="text-3xl">🥉</div>
          <h4 className="text-sm font-bold text-amber-600">3rd Place</h4>
          <p className="text-xl font-black text-white">
            {prizeBreakdown?.[2]?.amount || '₹10,000'}
          </p>
        </div>
      </div>
    </section>
  );
}
