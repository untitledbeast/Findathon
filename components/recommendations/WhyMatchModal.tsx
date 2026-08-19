'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { X, BrainCircuit, Sparkles, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { HackathonMatchResult } from '@/lib/domain/matching/hackathon-match-engine';

export interface WhyMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  hackathonTitle: string;
  hackathonSlug: string;
  match: HackathonMatchResult;
  isOnline: boolean;
  locationCity: string | null;
  prizeAmount: number;
  deadline: string | null;
}

export default function WhyMatchModal({
  isOpen,
  onClose,
  hackathonTitle,
  hackathonSlug,
  match,
  isOnline,
  locationCity,
  prizeAmount,
  deadline
}: WhyMatchModalProps) {
  // Focus trapping and escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getConfidenceBadge = (confidence?: string) => {
    switch (confidence) {
      case 'high':
        return { label: 'High Confidence', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' };
      case 'medium':
        return { label: 'Medium Confidence', color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' };
      default:
        return { label: 'Baseline Fit', color: 'bg-slate-800/80 text-slate-400 border-slate-700/50' };
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="why-match-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-lg rounded-3xl border border-purple-500/40 bg-[#0B0F24] p-6 sm:p-8 space-y-6 shadow-2xl shadow-purple-950/50">
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          aria-label="Close why this match dialog"
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* MODAL HEADER */}
        <div className="space-y-1 pr-8">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-950/80 text-purple-300 border border-purple-500/30">
            <BrainCircuit className="w-3.5 h-3.5 text-cyan-400" />
            <span>Deterministic Explainability</span>
          </div>
          <h3 id="why-match-title" className="text-xl font-black text-white">{hackathonTitle}</h3>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono pt-1">
            <span className="font-bold text-purple-300">{match.matchPercentage}% Compatibility</span>
            <span>•</span>
            <span className={`px-2 py-0.5 rounded-full border text-[10px] ${getConfidenceBadge(match.confidence).color}`}>
              {match.confidence} Confidence
            </span>
          </div>
        </div>

        {/* WHY WE RECOMMEND IT */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-purple-900/30 space-y-1.5">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Why We Recommend It
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            {match.strengths.length > 0
              ? `Your verified development signals strongly match this event's focus on ${match.strengths.map(s => s.label).join(', ')}.`
              : 'This event provides an open technical track suitable for your verified experience level.'}
          </p>
        </div>

        {/* STRONG MATCHES LIST */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Strong Matches
          </h4>
          {match.strengths.length > 0 ? (
            <div className="space-y-1.5">
              {match.strengths.map((s, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-200 p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-white">{s.label}</div>
                    <div className="text-slate-300 text-[11px]">{s.text}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">No specific language matches detected.</p>
          )}
        </div>

        {/* POTENTIAL GAPS & RECOMMENDATIONS */}
        {match.gaps.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Potential Growth Areas
            </h4>
            <div className="space-y-1.5">
              {match.gaps.map((g, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/20">
                  <span className="text-amber-400 font-bold mt-0.5">△</span>
                  <div>
                    <div className="font-bold text-amber-200">{g.label}</div>
                    <div className="text-slate-400 text-[11px]">{g.suggestion}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ELIGIBILITY & EVENT DETAILS */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Eligibility & Event Status
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-purple-900/20 flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span className="text-slate-300">{isOnline ? 'Online Competition' : (locationCity || 'In-Person Event')}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-purple-900/20 flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span className="text-slate-300">
                {deadline ? `Closes ${new Date(deadline).toLocaleDateString()}` : 'Registration Open'}
              </span>
            </div>
            {prizeAmount > 0 && (
              <div className="col-span-2 p-2.5 rounded-xl bg-slate-950/60 border border-purple-900/20 flex items-center gap-2">
                <span className="text-amber-400 font-bold">★</span>
                <span className="text-amber-200 font-mono font-bold">${prizeAmount.toLocaleString()} Prize Pool</span>
              </div>
            )}
          </div>
        </div>

        {/* MODAL ACTION */}
        <div className="pt-2 border-t border-purple-900/30 flex items-center justify-between gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 text-xs font-bold hover:text-white transition-colors cursor-pointer"
          >
            Close
          </button>
          <Link
            href={`/hackathons/${hackathonSlug}`}
            className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-lg shadow-purple-950/50 flex items-center gap-1.5"
          >
            <span>View Event Details</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
