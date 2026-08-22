'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Globe,
  MapPin,
  ChevronRight,
  RefreshCw,
  Trophy,
  Code2,
  BrainCircuit,
  ArrowUpRight
} from 'lucide-react';
import { RecommendationResponse } from '@/lib/services/hackathon-recommendation.service';

interface HackathonRecommendationsProps {
  onOpenIntelligenceTab?: () => void;
}

const DOMAIN_FILTER_OPTIONS = [
  { id: 'all', label: 'All Tracks' },
  { id: 'ai_ml', label: 'AI & ML' },
  { id: 'frontend', label: 'Frontend & UI' },
  { id: 'backend', label: 'Backend & APIs' },
  { id: 'web3', label: 'Web3 & Blockchain' },
  { id: 'mobile', label: 'Mobile' }
];

export default function HackathonRecommendations({ onOpenIntelligenceTab }: HackathonRecommendationsProps) {
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<'all' | 'online' | 'in-person'>('all');
  const [activeDomain, setActiveDomain] = useState<string>('all');
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeMode !== 'all') params.set('mode', activeMode);
      if (activeDomain !== 'all') params.set('domain', activeDomain);
      params.set('limit', '6');

      const res = await fetch(`/api/v1/developer-profile/recommendations?${params.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        setData(json.data);
      } else {
        setError(json.error?.message || 'Failed to load personalized recommendations');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error loading recommendations');
    } finally {
      setLoading(false);
    }
  }, [activeMode, activeDomain]);

  useEffect(() => {
    let isMounted = true;
    const execute = async () => {
      try {
        const params = new URLSearchParams();
        if (activeMode !== 'all') params.set('mode', activeMode);
        if (activeDomain !== 'all') params.set('domain', activeDomain);
        params.set('limit', '6');

        const res = await fetch(`/api/v1/developer-profile/recommendations?${params.toString()}`);
        const json = await res.json();

        if (isMounted) {
          if (json.success && json.data) {
            setData(json.data);
          } else {
            setError(json.error?.message || 'Failed to load personalized recommendations');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Network error loading recommendations');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    execute();

    return () => {
      isMounted = false;
    };
  }, [activeMode, activeDomain]);

  const getConfidenceBadge = (confidence?: string) => {
    switch (confidence) {
      case 'high':
        return { label: 'High Confidence', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' };
      case 'medium':
        return { label: 'Medium Confidence', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30' };
      default:
        return { label: 'Baseline Confidence', color: 'bg-slate-800/80 text-slate-400 border-slate-700/50' };
    }
  };

  const recommendations = data?.recommendations || [];
  const capability = data?.developerCapability;
  const hasEvidence = (capability?.evidenceCount || 0) > 0;

  return (
    <div className="space-y-6">
      {/* Recommendation Header Card */}
      <div className="relative overflow-hidden rounded-3xl border border-purple-900/40 bg-gradient-to-br from-[#0D1224]/90 via-[#0a0f29]/80 to-[#060816]/90 p-6 md:p-8 backdrop-blur-2xl shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
              <BrainCircuit className="w-3.5 h-3.5 text-cyan-400" />
              <span>Deterministic Match Engine • Verified Evidence</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Recommended for You
            </h2>
            <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
              Matched against your verified programming languages, DSA problem-solving benchmarks, and project tracks.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {capability && (
              <div className="hidden lg:flex flex-col items-end text-xs">
                <span className="text-slate-400">Profile Confidence</span>
                <span className={`font-bold mt-0.5 px-2.5 py-0.5 rounded-full border text-[11px] ${getConfidenceBadge(capability.confidence).color}`}>
                  {getConfidenceBadge(capability.confidence).label}
                </span>
              </div>
            )}
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-200 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-500 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="pt-6 border-t border-purple-900/20 mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Mode Filters */}
            <div className="inline-flex p-1 rounded-xl bg-slate-950/60 border border-slate-800">
              {(['all', 'online', 'in-person'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setActiveMode(mode)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all capitalize cursor-pointer ${
                    activeMode === mode
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {mode === 'all' ? 'All Modes' : mode}
                </button>
              ))}
            </div>

            {/* Domain Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              {DOMAIN_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setActiveDomain(opt.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                    activeDomain === opt.id
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-slate-900/40 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {!hasEvidence && onOpenIntelligenceTab && (
            <button
              onClick={onOpenIntelligenceTab}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Connect GitHub/LeetCode for higher accuracy</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-200 flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadData}
            className="px-3 py-1 bg-rose-900/40 hover:bg-rose-800/50 border border-rose-600/40 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="glass-card rounded-3xl p-6 h-64 animate-pulse bg-slate-900/40 border border-purple-900/20" />
          <div className="glass-card rounded-3xl p-6 h-64 animate-pulse bg-slate-900/40 border border-purple-900/20" />
          <div className="glass-card rounded-3xl p-6 h-64 animate-pulse bg-slate-900/40 border border-purple-900/20" />
        </div>
      ) : recommendations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.map(({ hackathon, match }) => {
            const isExpanded = expandedMatchId === hackathon.id;
            const pct = match.matchPercentage;

            let scoreBadgeColor = 'from-purple-500/20 to-indigo-500/20 text-purple-300 border-purple-500/40';
            if (pct >= 85) scoreBadgeColor = 'from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/40';
            else if (pct >= 70) scoreBadgeColor = 'from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-500/40';
            else if (pct >= 50) scoreBadgeColor = 'from-amber-500/20 to-yellow-500/20 text-amber-300 border-amber-500/40';

            return (
              <div
                key={hackathon.id}
                className="group relative overflow-hidden rounded-3xl border border-purple-900/30 bg-[#0D1224]/80 p-6 backdrop-blur-xl flex flex-col justify-between space-y-5 transition-all hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-950/30"
              >
                <div className="space-y-4">
                  {/* Top Metadata & Score Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap text-[11px] font-semibold text-slate-400">
                        {hackathon.isOnline ? (
                          <span className="flex items-center gap-1 text-cyan-400">
                            <Globe className="w-3 h-3" /> Online
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-400">
                            <MapPin className="w-3 h-3" /> {hackathon.locationCity || 'In-Person'}
                          </span>
                        )}
                        <span>•</span>
                        {(hackathon.prizeAmount || 0) > 0 && (
                          <span className="text-amber-400 font-mono flex items-center gap-0.5">
                            <Trophy className="w-3 h-3" /> ${(hackathon.prizeAmount || 0).toLocaleString()}
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/hackathons/${hackathon.slug || hackathon.id}`}
                        className="text-base font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-1 block"
                      >
                        {hackathon.title}
                      </Link>
                    </div>

                    {/* Match Score Badge */}
                    <div className={`px-3 py-1.5 rounded-2xl border bg-gradient-to-r ${scoreBadgeColor} text-center shrink-0 shadow-md`}>
                      <div className="text-sm font-black font-mono tracking-tight">{pct}%</div>
                      <div className="text-[9px] uppercase tracking-wider font-bold opacity-80">Match</div>
                    </div>
                  </div>

                  {/* Description / Tagline */}
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {hackathon.tagline || hackathon.description}
                  </p>

                  {/* Explainable Reasons & Strengths */}
                  <div className="space-y-2 pt-2 border-t border-purple-900/20">
                    <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        Why it matches you
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedMatchId(isExpanded ? null : hackathon.id)}
                        className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
                      >
                        {isExpanded ? 'Less' : 'Details'}
                      </button>
                    </div>

                    {match.strengths.length > 0 ? (
                      <div className="space-y-1.5">
                        {match.strengths.slice(0, isExpanded ? 4 : 2).map((s, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span className="leading-tight text-[11px]">{s.text}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">General algorithmic & technical compatibility</p>
                    )}

                    {/* Expanded Gaps / Considerations */}
                    {isExpanded && match.gaps.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-purple-900/10">
                        <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                          Areas for Growth
                        </div>
                        {match.gaps.map((g, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-400">
                            <span className="text-amber-400 font-bold">△</span>
                            <span>{g.suggestion}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: Deadline & Action */}
                <div className="pt-3 border-t border-purple-900/20 flex items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {hackathon.registrationDeadline
                        ? `Ends ${new Date(hackathon.registrationDeadline).toLocaleDateString()}`
                        : 'Open registration'}
                    </span>
                  </div>

                  <Link
                    href={`/hackathons/${hackathon.slug || hackathon.id}`}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 text-xs font-bold transition-all cursor-pointer shadow-md group-hover:scale-105"
                  >
                    <span>View Event</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="glass-card rounded-3xl border border-purple-900/30 p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h4 className="text-lg font-bold text-white">No Matching Hackathons Found</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {hasEvidence
                ? 'Try adjusting your track or mode filters to view more upcoming events.'
                : 'Connect your GitHub or LeetCode account in Developer Intelligence to generate personalized compatibility scores.'}
            </p>
          </div>
          {onOpenIntelligenceTab && !hasEvidence && (
            <button
              onClick={onOpenIntelligenceTab}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold border border-purple-500/40 shadow-lg shadow-purple-950/40 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Code2 className="w-4 h-4" />
              <span>Connect Developer Accounts</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
