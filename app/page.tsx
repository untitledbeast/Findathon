'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HackathonCard from '@/components/HackathonCard';
import HomepageRecommendations from '@/components/recommendations/HomepageRecommendations';
import { SpotlightProvider, useSpotlight } from '@/components/SpotlightSearch';
import { useHomepageData } from '@/hooks/useHomepageData';
import { useSearch } from '@/hooks/useSearch';
import {
  Search,
  Sparkles,
  MapPin,
  Trophy,
  ArrowRight,
  Grid,
  List
} from 'lucide-react';

function AnimatedCounter({ endValue, prefix = '', suffix = '' }: { endValue: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          let startTime: number | null = null;
          const duration = 2000;

          const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 2);
            setCount(Math.floor(easeOut * endValue));

            if (progress < 1) {
              requestAnimationFrame(step);
            }
          };

          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [endValue]);

  const formatNum = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${num.toLocaleString()}`;
    return num.toString();
  };

  return (
    <span ref={ref} className="font-mono font-bold">
      {prefix}{formatNum(count)}{suffix}
    </span>
  );
}

function HeroSection() {
  const { openSpotlight } = useSpotlight();

  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center pt-24 pb-16 px-4 text-center overflow-hidden">
      <div className="max-w-4xl mx-auto space-y-6 z-10">
        
        {/* BADGE */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-purple-950/80 text-purple-300 border border-purple-500/30 shadow-lg shadow-purple-900/30 animate-fade-in-up">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>✦ The #1 Hackathon Discovery Platform</span>
        </div>

        {/* HEADLINE */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-[#F6F8FC] leading-tight animate-fade-in-up">
          Discover the world&apos;s <br />
          <span className="glow-text">best hackathons</span>
        </h1>

        {/* SUBTITLE */}
        <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-400 font-medium animate-fade-in-up">
          Search 2,450+ hackathons by city, college, technology, or prize. Find your next big win.
        </p>

        {/* SEARCH TRIGGER INPUT */}
        <div className="max-w-2xl mx-auto pt-4 animate-fade-in-up">
          <div
            onClick={openSpotlight}
            className="w-full p-4 rounded-2xl glass-card aurora-border border border-purple-500/40 hover:border-purple-400 transition-all cursor-pointer flex items-center justify-between shadow-2xl group"
          >
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
              <span className="text-sm sm:text-base text-slate-400">Search hackathons, technologies, prizes...</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="hidden sm:inline-block px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-900 text-slate-400 border border-purple-900/40">⌘K</kbd>
              <div className="w-9 h-9 rounded-xl bg-purple-600 group-hover:bg-purple-500 text-white flex items-center justify-center transition-colors shadow-lg shadow-purple-600/40">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* CATEGORY CHIPS */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-2 animate-fade-in-up">
          {[
            { name: '🤖 AI/ML', slug: 'ai' },
            { name: '⛓ Web3', slug: 'web3' },
            { name: '🛡 Cybersecurity', slug: 'cybersecurity' },
            { name: '☁ Cloud', slug: 'cloud' },
            { name: '📱 Mobile', slug: 'mobile' },
          ].map((cat) => (
            <Link
              key={cat.slug}
              href={`/categories/${cat.slug}`}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold glass-card text-slate-300 border border-purple-900/30 hover:bg-purple-600/20 hover:border-purple-500/40 transition-all"
            >
              {cat.name}
            </Link>
          ))}
          <Link href="/categories" className="text-xs font-bold text-purple-400 hover:text-purple-300 ml-1">
            View all →
          </Link>
        </div>

        {/* CTA BUTTONS ROW */}
        <div className="pt-6 flex flex-wrap items-center justify-center gap-4 animate-fade-in-up">
          <Link
            href="/map"
            className="py-3.5 px-6 rounded-2xl aurora-border glass-card text-white font-bold text-sm flex items-center gap-2 hover:scale-[1.02] transition-transform"
          >
            <MapPin className="w-4 h-4 text-cyan-400" /> Explore Map
          </Link>
          <Link
            href="/submit"
            className="py-3.5 px-6 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-xl shadow-purple-600/30 flex items-center gap-2 hover:scale-[1.02] transition-transform"
          >
            <Trophy className="w-4 h-4" /> Submit Hackathon
          </Link>
        </div>

      </div>
    </section>
  );
}

function LiveStatsSection({ stats }: { stats?: { hackathons: number; users: number; prizes: string; cities: number } }) {
  return (
    <section className="py-12 px-4 border-y border-purple-900/20 bg-slate-950/40">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="glass-card p-6 rounded-2xl border border-purple-500/20 text-center space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-purple-400">
              <AnimatedCounter endValue={stats?.hackathons || 2450} suffix="+" />
            </div>
            <p className="text-xs font-bold text-slate-400">Active Hackathons</p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-cyan-500/20 text-center space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-cyan-400">
              <AnimatedCounter endValue={1200000} suffix="+" />
            </div>
            <p className="text-xs font-bold text-slate-400">Global Developers</p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-emerald-500/20 text-center space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
              $45M+
            </div>
            <p className="text-xs font-bold text-slate-400">Total Prizes</p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-amber-500/20 text-center space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-amber-400">
              <AnimatedCounter endValue={stats?.cities || 150} suffix="+" />
            </div>
            <p className="text-xs font-bold text-slate-400">Cities Covered</p>
          </div>
        </div>

        {/* TRUSTED BY ROW */}
        <div className="flex flex-wrap items-center justify-center gap-8 text-xs font-bold text-slate-500 uppercase tracking-widest">
          <span>Trusted by Developers from:</span>
          <span className="text-slate-400 hover:text-white transition-colors">Google</span>
          <span className="text-slate-400 hover:text-white transition-colors">Microsoft</span>
          <span className="text-slate-400 hover:text-white transition-colors">AWS</span>
          <span className="text-slate-400 hover:text-white transition-colors">GitHub</span>
          <span className="text-slate-400 hover:text-white transition-colors">MLH</span>
        </div>
      </div>
    </section>
  );
}

function mapDtoToHackathon(input: unknown) {
  const dto = (input || {}) as Record<string, unknown>;
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    start_date: dto.startDate || dto.start_date || new Date().toISOString(),
    end_date: dto.endDate || dto.end_date || new Date().toISOString(),
    registration_deadline: dto.registrationDeadline || dto.registration_deadline,
    is_online: dto.isOnline !== undefined ? dto.isOnline : Boolean(dto.is_online),
    register_url: dto.registrationUrl || dto.register_url || `/hackathons/${dto.id}`,
    prize_pool: dto.prizePool || dto.prize_pool || '$10,000',
    organizer: dto.organizer || 'Community Host',
    cover_image: dto.coverImage || dto.cover_image,
    location_city: dto.locationCity || dto.location_city,
    location_college: dto.locationCollege || dto.location_college,
    tags: dto.tags || [],
    avg_rating: dto.avgRating || dto.avg_rating || 5.0,
    reviews_count: dto.reviewsCount || dto.reviews_count || 0
  } as unknown as import('@/lib/supabase').Hackathon;
}

function MainAppContent() {
  const { data: homeData } = useHomepageData();
  const searchHook = useSearch();

  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'online' | 'offline' | 'ai' | 'web3'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const handleFilterTab = (tab: 'all' | 'online' | 'offline' | 'ai' | 'web3') => {
    setActiveFilterTab(tab);
    if (tab === 'all') searchHook.setFilters({});
    else if (tab === 'online') searchHook.updateFilter('isOnline', true);
    else if (tab === 'offline') searchHook.updateFilter('isOnline', false);
    else if (tab === 'ai') searchHook.updateFilter('tags', ['ai']);
    else if (tab === 'web3') searchHook.updateFilter('tags', ['web3']);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#060816] text-[#F6F8FC] selection:bg-purple-600 selection:text-white">
      <Navbar />

      <main className="flex-1">
        {/* SECTION 1: HERO */}
        <HeroSection />

        {/* SECTION 2: LIVE STATS */}
        <LiveStatsSection stats={homeData?.stats} />

        {/* SECTION 3: INTELLIGENT RECOMMENDATIONS */}
        <HomepageRecommendations />

        {/* SECTION 4: TRENDING TAGS */}
        <section className="py-12 px-4 max-w-7xl mx-auto space-y-6">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            🏷 Trending Technologies This Week
          </h2>
          <div className="flex flex-wrap gap-3">
            {(homeData?.trendingTags || []).map((t) => (
              <Link
                key={t.slug}
                href={`/categories/${t.slug}`}
                className="px-4 py-2.5 rounded-2xl glass-card border border-purple-900/30 hover:border-purple-500/50 hover:scale-105 transition-all flex items-center gap-2.5 text-xs font-bold text-slate-200"
              >
                <span>{t.icon}</span>
                <span>{t.name}</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 text-[10px] font-mono border border-purple-500/20">
                  {t.count}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* SECTION 6: CURATED COLLECTIONS */}
        <section className="py-16 px-4 max-w-7xl mx-auto space-y-6">
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            ✨ Explore Curated Collections
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(homeData?.collections || []).map((col) => (
              <Link
                key={col.id}
                href={`/categories/${col.id}`}
                className="glass-card p-5 rounded-2xl border border-purple-900/30 hover:border-purple-500/40 hover:-translate-y-1 transition-all group"
              >
                <div className="text-3xl mb-2">{col.emoji}</div>
                <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">{col.title}</h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{col.description}</p>
                <span className="inline-block mt-3 text-[11px] font-mono font-bold text-purple-400">
                  Explore collection →
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* SECTION 7: HOW IT WORKS */}
        <section className="py-16 px-4 border-y border-purple-900/20 bg-slate-950/30">
          <div className="max-w-6xl mx-auto space-y-10 text-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">How Findathon Works</h2>
              <p className="text-xs text-slate-400 mt-1">Four simple steps from discovery to winning global recognition</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
              {[
                { step: '01', title: '🔍 Discover', desc: 'Search 2,450+ hackathons by city, technology, or prize' },
                { step: '02', title: '📋 Register', desc: 'Join in one click. Save your spot instantly.' },
                { step: '03', title: '🛠 Build', desc: 'Create something amazing with your team' },
                { step: '04', title: '🏆 Win', desc: 'Win prizes and get recognized globally' },
              ].map((item) => (
                <div key={item.step} className="glass-card p-6 rounded-2xl border border-purple-900/30 text-center space-y-3">
                  <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center mx-auto shadow-md shadow-purple-600/40">
                    {item.step}
                  </div>
                  <h4 className="text-sm font-bold text-white">{item.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 8: MAIN HACKATHON GRID */}
        <section className="py-16 px-4 max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-purple-900/20">
            <div>
              <h2 className="text-2xl font-black text-white">All Hackathons</h2>
              <p className="text-xs text-slate-400 mt-1">
                Showing {searchHook.results.length} of {searchHook.total} hackathons
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* FILTER TAB CHIPS */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl glass-card border border-purple-900/30 text-xs font-bold">
                <button
                  onClick={() => handleFilterTab('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${activeFilterTab === 'all' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  All
                </button>
                <button
                  onClick={() => handleFilterTab('online')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${activeFilterTab === 'online' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Online
                </button>
                <button
                  onClick={() => handleFilterTab('offline')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${activeFilterTab === 'offline' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  In-Person
                </button>
              </div>

              {/* VIEW TOGGLE */}
              <div className="flex items-center gap-1 p-1 rounded-xl glass-card border border-purple-900/30 text-slate-400">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-purple-600 text-white' : 'hover:text-white'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-purple-600 text-white' : 'hover:text-white'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* HACKATHON CARDS GRID */}
          {searchHook.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-96 glass-card rounded-3xl p-4 animate-pulse space-y-4">
                  <div className="w-full h-44 bg-slate-900/80 rounded-2xl shimmer" />
                  <div className="h-4 w-3/4 bg-slate-900/80 rounded shimmer" />
                  <div className="h-4 w-1/2 bg-slate-900/80 rounded shimmer" />
                </div>
              ))}
            </div>
          ) : searchHook.results.length > 0 ? (
            <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
              {searchHook.results.map((h: unknown, idx: number) => {
                const item = (h || {}) as Record<string, unknown>;
                return <HackathonCard key={String(item.id || idx)} hackathon={mapDtoToHackathon(item)} />;
              })}
            </div>
          ) : (
            <div className="py-16 text-center space-y-4 glass-card p-12 rounded-3xl border border-purple-900/30">
              <div className="w-16 h-16 rounded-full bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">No hackathons match current filters</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">Try clearing search parameters or adjusting location filters.</p>
              <button
                onClick={() => searchHook.reset()}
                className="py-2.5 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg"
              >
                Reset All Filters
              </button>
            </div>
          )}

          {/* LOAD MORE BUTTON */}
          {searchHook.hasMore && (
            <div className="text-center pt-6">
              <button
                disabled={searchHook.isFetching}
                onClick={searchHook.loadMore}
                className="py-3 px-8 rounded-2xl glass-card border border-purple-500/40 hover:bg-purple-600 text-white font-bold text-xs shadow-xl transition-all disabled:opacity-50"
              >
                {searchHook.isFetching ? 'Loading more...' : 'Load More Hackathons'}
              </button>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default function HomePage() {
  return (
    <SpotlightProvider>
      <React.Suspense fallback={<div className="min-h-screen bg-[#060816] text-white flex items-center justify-center">Loading...</div>}>
        <MainAppContent />
      </React.Suspense>
    </SpotlightProvider>
  );
}
