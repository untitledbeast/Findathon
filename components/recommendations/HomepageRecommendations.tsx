'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Code2,
  BrainCircuit,
  Zap,
  Info
} from 'lucide-react';
import { RecommendationResponse } from '@/lib/services/hackathon-recommendation.service';
import { HackathonMatchResult } from '@/lib/domain/matching/hackathon-match-engine';
import RecommendationCard from './RecommendationCard';
import WhyMatchModal from './WhyMatchModal';
import RecommendationSkeleton from './RecommendationSkeleton';
import RecommendationEmptyState from './RecommendationEmptyState';
import RecommendationErrorState from './RecommendationErrorState';

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
  const handleRefresh = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (activeDomain !== 'all') params.set('domain', activeDomain);
    params.set('limit', '8');

    fetch(`/api/v1/developer-profile/recommendations?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setData(json.data);
        } else {
          setError(json.error?.message || 'Failed to load recommendations');
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Network error loading recommendations');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeDomain]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const load = async () => {
      try {
        const params = new URLSearchParams();
        if (activeDomain !== 'all') params.set('domain', activeDomain);
        params.set('limit', '8');

        const res = await fetch(`/api/v1/developer-profile/recommendations?${params.toString()}`, {
          signal: controller.signal
        });
        const json = await res.json();

        if (isMounted) {
          if (json.success && json.data) {
            setData(json.data);
            setError(null);
          } else {
            setError(json.error?.message || 'Failed to load recommendations');
          }
        }
      } catch (err: unknown) {
        if (isMounted && !(err instanceof Error && err.name === 'AbortError')) {
          setError(err instanceof Error ? err.message : 'Network error loading recommendations');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [activeDomain]);

  const scroll = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -360 : 360;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
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
            <span>{isPersonalized ? 'Recommended for You' : 'Discover Hackathons'}</span>
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
            onClick={handleRefresh}
            disabled={loading}
            className="p-2.5 rounded-full glass-card border border-purple-900/40 text-slate-400 hover:text-white hover:border-purple-500 transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh recommendations"
            aria-label="Refresh recommendations"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          <button
            onClick={() => scroll('left')}
            className="p-2.5 rounded-full glass-card border border-purple-900/40 text-slate-400 hover:text-white hover:border-purple-500 transition-colors cursor-pointer"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2.5 rounded-full glass-card border border-purple-900/40 text-slate-400 hover:text-white hover:border-purple-500 transition-colors cursor-pointer"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <RecommendationErrorState
          error={error}
          onRetry={handleRefresh}
        />
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
        <RecommendationSkeleton count={3} />
      ) : recommendations.length > 0 ? (
        <div
          ref={carouselRef}
          className="flex gap-6 overflow-x-auto scrollbar-none py-4 px-1"
        >
          {recommendations.map(({ hackathon, match }) => (
            <RecommendationCard
              key={hackathon.id}
              hackathon={hackathon}
              match={match}
              onWhyMatchClick={() => setSelectedMatch({
                hackathonTitle: hackathon.title,
                hackathonSlug: hackathon.slug || hackathon.id,
                match,
                isOnline: hackathon.isOnline,
                locationCity: hackathon.locationCity,
                prizeAmount: hackathon.prizeAmount,
                deadline: hackathon.registrationDeadline
              })}
            />
          ))}
        </div>
      ) : (
        <RecommendationEmptyState
          message="No hackathons found matching this filter."
          onResetFilter={() => setActiveDomain('all')}
        />
      )}

      {/* "WHY THIS MATCH?" EXPLANATION MODAL */}
      {selectedMatch && (
        <WhyMatchModal
          isOpen={Boolean(selectedMatch)}
          onClose={() => setSelectedMatch(null)}
          hackathonTitle={selectedMatch.hackathonTitle}
          hackathonSlug={selectedMatch.hackathonSlug}
          match={selectedMatch.match}
          isOnline={selectedMatch.isOnline}
          locationCity={selectedMatch.locationCity}
          prizeAmount={selectedMatch.prizeAmount}
          deadline={selectedMatch.deadline}
        />
      )}
    </section>
  );
}
