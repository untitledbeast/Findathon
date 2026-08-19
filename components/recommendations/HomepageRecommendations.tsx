'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  Globe,
  MapPin,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Trophy,
  Code2,
  BrainCircuit,
  ArrowUpRight,
  X,
  Zap,
  Info
} from 'lucide-react';
import { RecommendationResponse } from '@/lib/services/hackathon-recommendation.service';
import { HackathonMatchResult } from '@/lib/domain/matching/hackathon-match-engine';

interface HomepageRecommendationsProps {
  initialData?: RecommendationResponse | null;
}

const DOMAIN_FILTER_OPTIONS = [
  { id: 'all', label: 'All Tracks' },
  { id: 'ai_ml', label: '🤖 AI & ML' },
  { id: 'frontend', label: '🎨 Frontend & UI' },
  { id: 'backend', label: '⚙️ Backend & APIs' },
  { id: 'web3', label: '⛓ Web3 & Crypto' },
  { id: 'mobile', label: '📱 Mobile' }
];

export default function HomepageRecommendations({ initialData }: HomepageRecommendationsProps) {
  const [data, setData] = useState<RecommendationResponse | null>(initialData || null);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [activeDomain, setActiveDomain] = useState<string>('all');
  const [selectedMatch, setSelectedMatch] = useState<{
    hackathonTitle: string;
    hackathonSlug: string;
    match: HackathonMatchResult;
    isOnline: boolean;
    locationCity: string | null;
    prizeAmount: number;
    deadline: string | null;
  } | null>(null);

  const carouselRef = useRef<HTMLDivElement>(null);

  const loadRecommendations = useCallback(async (domain = activeDomain) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (domain !== 'all') params.set('domain', domain);
      params.set('limit', '8');

      const res = await fetch(`/api/v1/developer-profile/recommendations?${params.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        setData(json.data);
      } else {
        setError(json.error?.message || 'Failed to load recommendations');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error loading recommendations');
    } finally {
      setLoading(false);
    }
  }, [activeDomain]);

  useEffect(() => {
    let isMounted = true;
    const execute = async () => {
      try {
        const params = new URLSearchParams();
        if (activeDomain !== 'all') params.set('domain', activeDomain);
        params.set('limit', '8');

        const res = await fetch(`/api/v1/developer-profile/recommendations?${params.toString()}`);
        const json = await res.json();

        if (isMounted) {
          if (json.success && json.data) {
            setData(json.data);
          } else {
            setError(json.error?.message || 'Failed to load recommendations');
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
    return () => { isMounted = false; };
  }, [activeDomain]);

  const scroll = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -360 : 360;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

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

  const recommendations = data?.recommendations || [];
  const isPersonalized = data?.isPersonalized ?? false;
  const isStale = data?.isStale ?? false;

  return (
    <section className="py-16 px-4 max-w-7xl mx-auto space-y-8 relative">
      {/* SECTION HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-purple-950/80 text-purple-300 border border-purple-500/30 shadow-md">
            <BrainCircuit className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {isPersonalized ? 'Personalized Developer Intelligence' : 'Intelligent Event Discovery'}
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <span>Recommended for You</span>
            {isPersonalized && (
              <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                Live Matched
              </span>
            )}
          </h2>

          <p className="text-sm text-slate-400 max-w-2xl">
            {isPersonalized
              ? 'Hackathons dynamically ranked against your verified code repositories, DSA benchmarks, and technical domains.'
              : 'Discover top upcoming competitions matched to global industry tracks. Connect GitHub or LeetCode to unlock personalized scoring.'}
          </p>
        </div>

        {/* CONTROLS & REFRESH */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => loadRecommendations(activeDomain)}
            disabled={loading}
            className="p-2.5 rounded-full glass-card border border-purple-900/40 text-slate-400 hover:text-white hover:border-purple-500 transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh recommendations"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          <button
            onClick={() => scroll('left')}
            className="p-2.5 rounded-full glass-card border border-purple-900/40 text-slate-400 hover:text-white hover:border-purple-500 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2.5 rounded-full glass-card border border-purple-900/40 text-slate-400 hover:text-white hover:border-purple-500 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadRecommendations(activeDomain)}
            className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 rounded-xl text-rose-300 font-bold transition-all cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* STALE INTELLIGENCE BANNER */}
      {isStale && (
        <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{data?.staleMessage}</span>
          </div>
          <Link
            href="/account?tab=intelligence"
            className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-xl text-amber-300 font-bold transition-all shrink-0"
          >
            Sync Now →
          </Link>
        </div>
      )}

      {/* COLD START CALLOUT (For logged-out or unverified developers) */}
      {!isPersonalized && !loading && (
        <div className="relative overflow-hidden rounded-3xl border border-purple-500/30 bg-gradient-to-r from-purple-950/60 via-indigo-950/40 to-slate-950/60 p-6 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Unlock Exact Compatibility Matching</h3>
            </div>
            <p className="text-xs text-slate-400 max-w-xl">
              Connect your GitHub and LeetCode accounts to generate deterministic match scores, track-by-track strengths, and gap analysis.
            </p>
          </div>
          <Link
            href="/account?tab=intelligence"
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold border border-purple-500/40 shadow-lg shadow-purple-950/50 transition-all cursor-pointer inline-flex items-center gap-2 shrink-0"
          >
            <Code2 className="w-4 h-4" />
            <span>Connect Accounts</span>
          </Link>
        </div>
      )}

      {/* TRACK FILTERS */}
      <div className="flex flex-wrap items-center gap-2">
        {DOMAIN_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setActiveDomain(opt.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
              activeDomain === opt.id
                ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-900/40'
                : 'glass-card text-slate-300 border-purple-900/30 hover:border-purple-500/40 hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* RECOMMENDATION CAROUSEL */}
      {loading ? (
        <div className="flex gap-6 overflow-hidden py-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-84 h-96 glass-card rounded-3xl p-5 animate-pulse space-y-4 shrink-0 bg-slate-900/30 border border-purple-900/20">
              <div className="w-full h-40 bg-slate-900/80 rounded-2xl shimmer" />
              <div className="h-5 w-3/4 bg-slate-900/80 rounded shimmer" />
              <div className="h-4 w-1/2 bg-slate-900/80 rounded shimmer" />
              <div className="h-12 w-full bg-slate-900/80 rounded-xl shimmer" />
            </div>
          ))}
        </div>
      ) : recommendations.length > 0 ? (
        <div
          ref={carouselRef}
          className="flex gap-6 overflow-x-auto scrollbar-none py-4 px-1"
        >
          {recommendations.map(({ hackathon, match }) => {
            const pct = match.matchPercentage;
            let scoreBadgeColor = 'from-purple-500/20 to-indigo-500/20 text-purple-300 border-purple-500/40';
            if (pct >= 85) scoreBadgeColor = 'from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/40';
            else if (pct >= 70) scoreBadgeColor = 'from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-500/40';
            else if (pct >= 50) scoreBadgeColor = 'from-amber-500/20 to-yellow-500/20 text-amber-300 border-amber-500/40';

            return (
              <div
                key={hackathon.id}
                className="w-84 shrink-0 group relative overflow-hidden rounded-3xl border border-purple-900/40 bg-gradient-to-b from-[#0D1224]/90 to-[#070A18]/90 p-5 backdrop-blur-xl flex flex-col justify-between space-y-4 transition-all hover:border-purple-500/60 hover:shadow-2xl hover:shadow-purple-950/40"
              >
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
                      <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${getConfidenceBadge(match.confidence).color}`}>
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
                      onClick={() => setSelectedMatch({
                        hackathonTitle: hackathon.title,
                        hackathonSlug: hackathon.slug || hackathon.id,
                        match,
                        isOnline: hackathon.isOnline,
                        locationCity: hackathon.locationCity,
                        prizeAmount: hackathon.prizeAmount,
                        deadline: hackathon.registrationDeadline
                      })}
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
          })}
        </div>
      ) : (
        <div className="glass-card rounded-3xl border border-purple-900/30 p-8 text-center space-y-3 max-w-md mx-auto">
          <p className="text-sm text-slate-400 font-medium">No hackathons found matching this filter.</p>
          <button
            onClick={() => setActiveDomain('all')}
            className="px-4 py-1.5 rounded-xl bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-bold hover:bg-purple-600/50 transition-all cursor-pointer"
          >
            View all tracks
          </button>
        </div>
      )}

      {/* "WHY THIS MATCH?" EXPLANATION MODAL */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-purple-500/40 bg-[#0B0F24] p-6 sm:p-8 space-y-6 shadow-2xl shadow-purple-950/50">
            {/* CLOSE BUTTON */}
            <button
              onClick={() => setSelectedMatch(null)}
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
              <h3 className="text-xl font-black text-white">{selectedMatch.hackathonTitle}</h3>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono pt-1">
                <span className="font-bold text-purple-300">{selectedMatch.match.matchPercentage}% Compatibility</span>
                <span>•</span>
                <span className={`px-2 py-0.2 rounded-full border text-[10px] ${getConfidenceBadge(selectedMatch.match.confidence).color}`}>
                  {selectedMatch.match.confidence} Confidence
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
                {selectedMatch.match.strengths.length > 0
                  ? `Your verified development signals strongly match this event's focus on ${selectedMatch.match.strengths.map(s => s.label).join(', ')}.`
                  : 'This event provides an open technical track suitable for your verified experience level.'}
              </p>
            </div>

            {/* STRONG MATCHES LIST */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Strong Matches
              </h4>
              {selectedMatch.match.strengths.length > 0 ? (
                <div className="space-y-1.5">
                  {selectedMatch.match.strengths.map((s, idx) => (
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
            {selectedMatch.match.gaps.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Potential Growth Areas
                </h4>
                <div className="space-y-1.5">
                  {selectedMatch.match.gaps.map((g, idx) => (
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

            {/* MODAL ACTION */}
            <div className="pt-2 border-t border-purple-900/30 flex items-center justify-between gap-4">
              <button
                onClick={() => setSelectedMatch(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 text-xs font-bold hover:text-white transition-colors cursor-pointer"
              >
                Close
              </button>
              <Link
                href={`/hackathons/${selectedMatch.hackathonSlug}`}
                className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-lg shadow-purple-950/50 flex items-center gap-1.5"
              >
                <span>View Event Details</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
