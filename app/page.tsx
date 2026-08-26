'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HackathonCard from '@/components/HackathonCard';
import HomepageRecommendations from '@/components/recommendations/HomepageRecommendations';
import GlobalIntelligenceVisual from '@/components/home/GlobalIntelligenceVisual';
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
  List,
  Users,
  ShieldCheck,
  Cpu,
  Layers,
  ArrowUpRight,
  CheckCircle2,
  Code2
} from 'lucide-react';

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
    cover_image_url: dto.coverImageUrl || dto.cover_image_url || dto.coverImage || dto.cover_image,
    location_city: dto.locationCity || dto.location_city,
    location_college: dto.locationCollege || dto.location_college,
    tags: dto.tags || [],
    status: dto.status || 'approved',
    avg_rating: dto.avgRating || dto.avg_rating || 5.0,
    reviews_count: dto.reviewsCount || dto.reviews_count || 0
  } as unknown as import('@/lib/supabase').Hackathon;
}

function HeroSection() {
  const { openSpotlight } = useSpotlight();

  return (
    <section className="relative pt-24 sm:pt-28 pb-16 px-4 max-w-7xl mx-auto overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center z-10 relative">
        
        {/* LEFT COLUMN: VALUE PROPOSITION & SEARCH */}
        <div className="lg:col-span-7 space-y-6 text-left">
          
          {/* BADGE */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-purple-950/70 text-purple-300 border border-purple-500/30 shadow-lg shadow-purple-900/20">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Findathon Intelligence · Verified Developer Platform</span>
          </div>

          {/* HEADLINE */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#F6F8FC] leading-[1.12]">
            Discover Hackathons. <br />
            Build Squads. <br />
            <span className="glow-text">Win Together.</span>
          </h1>

          {/* SUBTITLE */}
          <p className="text-base sm:text-lg text-slate-300/90 font-medium max-w-xl leading-relaxed">
            Find verified global competitions, benchmark your technical capability profile, and assemble balanced squads with deterministic team intelligence.
          </p>

          {/* PRIMARY SEARCH BAR (Spotlight Trigger) */}
          <div className="pt-2 max-w-xl">
            <div
              onClick={openSpotlight}
              className="w-full p-3.5 sm:p-4 rounded-2xl glass-card aurora-border border border-purple-500/40 hover:border-purple-400 transition-all cursor-pointer flex items-center justify-between shadow-2xl group"
            >
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform shrink-0" />
                <span className="text-xs sm:text-sm text-slate-400 font-medium">
                  Search by tech stack, city, university, prize...
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <kbd className="hidden sm:inline-block px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-900/90 text-slate-400 border border-purple-900/50 shadow-inner">
                  ⌘K
                </kbd>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-600 group-hover:bg-purple-500 text-white flex items-center justify-center transition-colors shadow-lg shadow-purple-600/40">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* CATEGORY CHIPS */}
          <div className="pt-1 flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-semibold text-slate-400 mr-1">Trending:</span>
            {[
              { name: '🤖 AI & ML', slug: 'ai' },
              { name: '⛓ Web3', slug: 'web3' },
              { name: '⚙️ Cloud & APIs', slug: 'backend' },
              { name: '🛡 Cybersecurity', slug: 'cybersecurity' },
              { name: '📱 Mobile', slug: 'mobile' },
            ].map((cat) => (
              <Link
                key={cat.slug}
                href={`/categories/${cat.slug}`}
                className="px-3 py-1 rounded-full text-xs font-bold glass-card text-slate-300 border border-purple-900/30 hover:bg-purple-600/20 hover:border-purple-500/40 hover:text-white transition-all"
              >
                {cat.name}
              </Link>
            ))}
            <Link href="/categories" className="text-xs font-bold text-purple-400 hover:text-purple-300 ml-1 inline-flex items-center gap-0.5">
              <span>All tracks</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {/* CTA BUTTONS ROW */}
          <div className="pt-3 flex flex-wrap items-center gap-3">
            <a
              href="#explore-hackathons"
              className="py-3 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-purple-600/30 flex items-center gap-2 hover:scale-[1.02] transition-all"
            >
              <Trophy className="w-4 h-4" />
              <span>Explore Hackathons</span>
            </a>
            <Link
              href="/teamspace"
              className="py-3 px-5 rounded-xl aurora-border glass-card text-white font-bold text-xs sm:text-sm flex items-center gap-2 hover:scale-[1.02] transition-all"
            >
              <Users className="w-4 h-4 text-cyan-400" />
              <span>TeamSpace Hub</span>
            </Link>
            <Link
              href="/map"
              className="py-3 px-5 rounded-xl glass-card border border-purple-900/40 text-slate-300 hover:text-white font-bold text-xs sm:text-sm flex items-center gap-2 hover:border-purple-500/50 transition-all"
            >
              <MapPin className="w-4 h-4 text-purple-400" />
              <span>Interactive Map</span>
            </Link>
          </div>

        </div>

        {/* RIGHT COLUMN: INTERACTIVE TELEMETRY NETWORK VISUAL */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end">
          <GlobalIntelligenceVisual />
        </div>

      </div>
    </section>
  );
}

function TrustPillarsSection() {
  const pillars = [
    {
      icon: ShieldCheck,
      iconColor: 'text-emerald-400',
      bgColor: 'bg-emerald-950/30',
      borderColor: 'border-emerald-500/20',
      title: 'Verified Hackathons',
      description: 'Every listed competition is verified for accurate timelines, venue details, and registration links.'
    },
    {
      icon: Cpu,
      iconColor: 'text-cyan-400',
      bgColor: 'bg-cyan-950/30',
      borderColor: 'border-cyan-500/20',
      title: 'Deterministic Match Engine',
      description: 'Transparent skill compatibility scoring grounded in verified GitHub repositories and LeetCode performance.'
    },
    {
      icon: Users,
      iconColor: 'text-purple-400',
      bgColor: 'bg-purple-950/30',
      borderColor: 'border-purple-500/20',
      title: 'Team Intelligence & Gap Engine',
      description: 'Automatic squad capability analysis that highlights missing skills and recommends complementary partners.'
    },
    {
      icon: MapPin,
      iconColor: 'text-amber-400',
      bgColor: 'bg-amber-950/30',
      borderColor: 'border-amber-500/20',
      title: 'Real-World Map Intelligence',
      description: 'Live venue, college, and city geocoding with interactive map discovery across global tech hubs.'
    }
  ];

  return (
    <section className="py-12 px-4 max-w-7xl mx-auto border-y border-purple-900/20 bg-slate-950/40">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {pillars.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <div
              key={pillar.title}
              className={`p-5 rounded-2xl glass-card border ${pillar.borderColor} ${pillar.bgColor} space-y-2.5 transition-all hover:scale-[1.02]`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl bg-slate-900/80 border border-slate-800 ${pillar.iconColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white tracking-tight">{pillar.title}</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{pillar.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TeamSpaceSpotlightSection() {
  return (
    <section className="py-16 px-4 max-w-7xl mx-auto">
      <div className="relative rounded-3xl overflow-hidden border border-purple-500/30 bg-gradient-to-r from-purple-950/50 via-slate-950/80 to-indigo-950/50 p-6 sm:p-10 backdrop-blur-xl shadow-2xl">
        
        {/* Ambient background blur */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          <div className="lg:col-span-7 space-y-4 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 shadow-md">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Findathon TeamSpace Release 1</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              Assemble Balanced Hackathon Teams with Team Intelligence
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              Stop competing solo or with unbalanced skills. Findathon evaluates your squad&apos;s capability coverage across Frontend, Backend, AI/ML, and DevOps, highlighting critical skill gaps and finding complementary partners.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Deterministic Fit Scoring</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Squad Gap Matrix</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Opt-In Privacy Model</span>
              </div>
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-3">
              <Link
                href="/teamspace"
                className="py-3 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-purple-900/40 flex items-center gap-2 hover:scale-[1.02] transition-all"
              >
                <span>Enter TeamSpace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/teamspace/discover"
                className="py-3 px-6 rounded-xl glass-card border border-cyan-500/30 text-cyan-300 hover:text-white hover:border-cyan-400 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all"
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Find Teammates</span>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-sm p-5 rounded-2xl glass-card border border-purple-500/30 bg-slate-900/80 space-y-4">
              <div className="flex items-center justify-between border-b border-purple-900/30 pb-3">
                <span className="text-xs font-mono font-bold text-purple-300">Squad Compatibility</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 text-[11px] font-mono font-bold border border-emerald-500/30">
                  92% Team Fit
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-mono text-slate-300">
                  <span>AI & Algorithms</span>
                  <span className="text-emerald-400 font-bold">100%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-full" />
                </div>

                <div className="flex justify-between text-[11px] font-mono text-slate-300 pt-1">
                  <span>Fullstack API</span>
                  <span className="text-cyan-400 font-bold">90%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full w-[90%]" />
                </div>

                <div className="flex justify-between text-[11px] font-mono text-slate-300 pt-1">
                  <span>UI & Product</span>
                  <span className="text-purple-400 font-bold">85%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full w-[85%]" />
                </div>
              </div>

              <div className="pt-2 border-t border-purple-900/30 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">Critical Gaps:</span>
                <span className="text-[11px] font-mono font-bold text-emerald-400">0 Missing Required</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

function MainHackathonDirectory() {
  const { data: homeData } = useHomepageData();
  const searchHook = useSearch();

  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'online' | 'offline' | 'ai' | 'web3'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const handleFilterTab = (tab: 'all' | 'online' | 'offline' | 'ai' | 'web3') => {
    setActiveFilterTab(tab);
    if (tab === 'all') {
      const updated = { ...searchHook.filters };
      delete updated.isOnline;
      delete updated.cursor;
      searchHook.setFilters(updated);
    } else if (tab === 'online') {
      searchHook.updateFilter('isOnline', true);
    } else if (tab === 'offline') {
      searchHook.updateFilter('isOnline', false);
    } else if (tab === 'ai') {
      searchHook.updateFilter('tags', ['ai']);
    } else if (tab === 'web3') {
      searchHook.updateFilter('tags', ['web3']);
    }
  };

  return (
    <section id="explore-hackathons" className="py-16 px-4 max-w-7xl mx-auto space-y-8 scroll-mt-20">
      
      {/* DIRECTORY HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-purple-900/20">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-purple-400 shrink-0" />
            <span>Active & Upcoming Hackathons</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Showing {searchHook.results.length} of {searchHook.total} verified competitions
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* FILTER TAB CHIPS */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl glass-card border border-purple-900/30 text-xs font-bold">
            <button
              onClick={() => handleFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeFilterTab === 'all' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              All
            </button>
            <button
              onClick={() => handleFilterTab('online')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeFilterTab === 'online' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              Online
            </button>
            <button
              onClick={() => handleFilterTab('offline')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeFilterTab === 'offline' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              In-Person
            </button>
            <button
              onClick={() => handleFilterTab('ai')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeFilterTab === 'ai' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              AI/ML
            </button>
          </div>

          {/* VIEW MODE TOGGLE */}
          <div className="flex items-center gap-1 p-1 rounded-xl glass-card border border-purple-900/30 text-slate-400">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-purple-600 text-white' : 'hover:text-white'}`}
              aria-label="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-purple-600 text-white' : 'hover:text-white'}`}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* CARDS GRID */}
      {searchHook.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-96 glass-card rounded-3xl p-4 animate-pulse space-y-4 border border-purple-900/20">
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
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting technology tags, format filters, or clearing search criteria.
          </p>
          <button
            onClick={() => searchHook.reset()}
            className="py-2.5 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg cursor-pointer"
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
            className="py-3 px-8 rounded-2xl glass-card border border-purple-500/40 hover:bg-purple-600 text-white font-bold text-xs shadow-xl transition-all disabled:opacity-50 cursor-pointer"
          >
            {searchHook.isFetching ? 'Loading more...' : 'Load More Hackathons'}
          </button>
        </div>
      )}

      {/* CURATED COLLECTIONS */}
      <div className="pt-12 space-y-6">
        <h3 className="text-xl font-black text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          <span>Explore Curated Collections</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(homeData?.collections || []).map((col) => (
            <Link
              key={col.id}
              href={`/categories/${col.id}`}
              className="glass-card p-5 rounded-2xl border border-purple-900/30 hover:border-purple-500/40 hover:-translate-y-1 transition-all group block"
            >
              <div className="text-3xl mb-2">{col.emoji}</div>
              <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">{col.title}</h4>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{col.description}</p>
              <span className="inline-flex items-center gap-1 mt-3 text-[11px] font-mono font-bold text-purple-400">
                <span>Explore</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          ))}
        </div>
      </div>

    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      step: '01',
      icon: Code2,
      title: 'Connect & Benchmark',
      desc: 'Link your GitHub and LeetCode accounts to build a verified developer capability profile with zero manual exaggeration.'
    },
    {
      step: '02',
      icon: Sparkles,
      title: 'Deterministic Matching',
      desc: 'Discover competitions ranked with mathematical fit scores against your languages, frameworks, and domain strengths.'
    },
    {
      step: '03',
      icon: Users,
      title: 'Squad Formation',
      desc: 'Use TeamSpace to identify missing team roles (AI, Backend, Frontend) and invite complementary developers.'
    },
    {
      step: '04',
      icon: Trophy,
      title: 'Build & Win',
      desc: 'Register directly with verified organizer links, build high-impact software, and claim prizes.'
    }
  ];

  return (
    <section className="py-16 px-4 border-t border-purple-900/20 bg-slate-950/30">
      <div className="max-w-6xl mx-auto space-y-10 text-center">
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">How Findathon Works</h2>
          <p className="text-xs sm:text-sm text-slate-400">Four deterministic steps from developer benchmarking to winning teams</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="glass-card p-6 rounded-2xl border border-purple-900/30 text-center space-y-3 relative group hover:border-purple-500/40 transition-all">
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center mx-auto shadow-md shadow-purple-600/40">
                  {item.step}
                </div>
                <div className="flex justify-center text-purple-400">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">{item.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MainAppContent() {
  return (
    <div className="min-h-screen flex flex-col bg-[#060816] text-[#F6F8FC] selection:bg-purple-600 selection:text-white">
      <Navbar />

      <main className="flex-1">
        {/* SECTION 1: HERO */}
        <HeroSection />

        {/* SECTION 2: PLATFORM TRUST PILLARS */}
        <TrustPillarsSection />

        {/* SECTION 3: PERSONALIZED DEVELOPER RECOMMENDATIONS */}
        <HomepageRecommendations />

        {/* SECTION 4: TEAMSPACE SPOTLIGHT FEATURE */}
        <TeamSpaceSpotlightSection />

        {/* SECTION 5: LIVE HACKATHONS DIRECTORY & COLLECTIONS */}
        <MainHackathonDirectory />

        {/* SECTION 6: HOW IT WORKS */}
        <HowItWorksSection />
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
