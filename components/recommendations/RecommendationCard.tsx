'use client';

import React from 'react';
import Link from 'next/link';
import {
  Globe,
  MapPin,
  Trophy,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { HackathonMatchResult } from '@/lib/domain/matching/hackathon-match-engine';

export interface RecommendationCardProps {
  hackathon: {
    id: string;
    title: string;
    slug: string;
    description: string;
    tagline: string | null;
    startDate: string;
    endDate: string;
    registrationDeadline: string | null;
    isOnline: boolean;
    locationCity: string | null;
    prizeAmount: number;
    tags: string[];
    coverImageUrl: string | null;
    isFeatured: boolean;
    isVerified: boolean;
  };
  match: HackathonMatchResult;
  onWhyMatchClick: () => void;
}

export default function RecommendationCard({
  hackathon,
  match,
  onWhyMatchClick
}: RecommendationCardProps) {
  const pct = match.matchPercentage;
  let scoreBadgeColor = 'from-purple-500/20 to-indigo-500/20 text-purple-300 border-purple-500/40';
  if (pct >= 85) scoreBadgeColor = 'from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/40';
  else if (pct >= 70) scoreBadgeColor = 'from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-500/40';
  else if (pct >= 50) scoreBadgeColor = 'from-amber-500/20 to-yellow-500/20 text-amber-300 border-amber-500/40';

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
    <div className="w-84 shrink-0 group relative overflow-hidden rounded-3xl border border-purple-900/40 bg-gradient-to-b from-[#0D1224]/90 to-[#070A18]/90 p-5 backdrop-blur-xl flex flex-col justify-between space-y-4 transition-all hover:border-purple-500/60 hover:shadow-2xl hover:shadow-purple-950/40">
      {/* TOP ROW: BADGES & MODE */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            {hackathon.isOnline ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-950/60 text-cyan-400 border border-cyan-500/20">
                <Globe className="w-3 h-3" /> Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-700/40">
                <MapPin className="w-3 h-3" /> {hackathon.locationCity || 'In-Person'}
              </span>
            )}
            {hackathon.prizeAmount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/60 text-amber-300 border border-amber-500/20 font-mono">
                <Trophy className="w-3 h-3 text-amber-400" /> ${hackathon.prizeAmount.toLocaleString()}
              </span>
            )}
          </div>

          {/* MATCH BADGE */}
          <div className={`px-2.5 py-1 rounded-xl border bg-gradient-to-r ${scoreBadgeColor} text-center shrink-0 shadow-md`}>
            <span className="text-xs font-black font-mono tracking-tight">{pct}% Match</span>
          </div>
        </div>

        {/* TITLE & DESCRIPTION */}
        <div>
          <Link
            href={`/hackathons/${hackathon.slug || hackathon.id}`}
            className="text-base font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-1 block"
          >
            {hackathon.title}
          </Link>
          <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
            {hackathon.tagline || hackathon.description}
          </p>
        </div>

        {/* TOP MATCHING EVIDENCE BULLETS */}
        <div className="p-3 rounded-2xl bg-slate-950/60 border border-purple-900/20 space-y-1.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-400" />
              Key Matches
            </span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${getConfidenceBadge(match.confidence).color}`}>
              {match.confidence}
            </span>
          </div>

          {match.strengths.length > 0 ? (
            match.strengths.slice(0, 2).map((s, idx) => (
              <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span className="line-clamp-1">{s.text}</span>
              </div>
            ))
          ) : (
            <p className="text-[11px] text-slate-500 italic">Open track compatible with all skill levels</p>
          )}
        </div>
      </div>

      {/* CARD FOOTER */}
      <div className="pt-3 border-t border-purple-900/20 space-y-3">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            {hackathon.registrationDeadline
              ? `Closes ${new Date(hackathon.registrationDeadline).toLocaleDateString()}`
              : 'Open registration'}
          </span>
          <button
            type="button"
            onClick={onWhyMatchClick}
            className="text-purple-400 hover:text-purple-300 font-semibold cursor-pointer text-[11px] underline underline-offset-2"
          >
            Why this match?
          </button>
        </div>

        <Link
          href={`/hackathons/${hackathon.slug || hackathon.id}`}
          className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-purple-950/40"
        >
          <span>View Hackathon</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
