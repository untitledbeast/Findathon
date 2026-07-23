'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HackathonCard from '@/components/HackathonCard';
import { SpotlightProvider, useSpotlight } from '@/components/SpotlightSearch';
import { useDiscovery } from '@/hooks/useDiscovery';
import { storageService } from '@/lib/storage-service';
import { CURATED_COLLECTIONS } from '@/lib/collections';
import { Hackathon } from '@/lib/supabase';
import {
  Search,
  Filter,
  Sparkles,
  Globe,
  MapPin,
  Command,
  Layers,
  RotateCcw
} from 'lucide-react';



function AnimatedCounter({ endValue, prefix = '', suffix = '' }: { endValue: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !hasAnimated.current) {
        hasAnimated.current = true;
        let startTime: number | null = null;
        const duration = 2000;

        const step = (timestamp: number) => {
          if (!startTime) startTime = timestamp;
          const progress = Math.min((timestamp - startTime) / duration, 1);
          const easeOut = 1 - (1 - progress) * (1 - progress);
          setCount(Math.floor(easeOut * endValue));

          if (progress < 1) {
            requestAnimationFrame(step);
          }
        };

        requestAnimationFrame(step);
      }
    }, { threshold: 0.3 });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [endValue]);

  const formatNum = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${num.toLocaleString()}`;
    return num.toString();
  };

  return (
    <span ref={ref} className="font-mono-num">
      {prefix}{formatNum(count)}{suffix}
    </span>
  );
}

function HeroContent() {
  const { openSpotlight } = useSpotlight();
  const heroRef = useRef<HTMLDivElement>(null);

  return (
    <section
      ref={heroRef}
      className="relative min-h-[85vh] flex flex-col items-center justify-center pt-20 pb-12 px-4 overflow-hidden"
    >
      <div className="max-w-5xl mx-auto text-center space-y-6 z-10">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-purple-950/80 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-900/30 animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Unified Discovery Engine for Hackathons</span>
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-tight">
          Find Your Next <br />
          <span className="text-gradient">Hackathon Breakthrough</span>
        </h1>

        <p className="max-w-2xl mx-auto text-slate-400 text-sm sm:text-base md:text-lg">
          Discover, compare, and compete in premier artificial intelligence, Web3, and cloud hackathons worldwide.
        </p>

        {/* Spotlight Trigger Search Bar */}
        <div className="max-w-2xl mx-auto pt-4">
          <div
            onClick={openSpotlight}
            className="w-full p-4 rounded-2xl glass-card border border-purple-500/40 hover:border-purple-400 transition-all cursor-pointer flex items-center justify-between shadow-[0_10px_40px_rgba(0,0,0,0.5),0_0_20px_rgba(139,92,246,0.2)] group"
          >
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
              <span className="text-sm text-slate-400 font-medium">
                Search AI, Web3, Bangalore, or type &apos;prize over 10k&apos;...
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/80 border border-purple-900/40 text-slate-400 text-xs font-mono font-bold">
              <Command className="w-3 h-3 text-purple-400" /> K
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="pt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
          <div className="glass-card rounded-2xl p-4 border border-purple-500/20">
            <div className="text-xl sm:text-2xl font-black text-white">
              <AnimatedCounter endValue={2450} suffix="+" />
            </div>
            <p className="text-xs text-slate-400 font-medium">Active Hackathons</p>
          </div>

          <div className="glass-card rounded-2xl p-4 border border-purple-500/20">
            <div className="text-xl sm:text-2xl font-black text-white">
              <AnimatedCounter endValue={1200000} suffix="+" />
            </div>
            <p className="text-xs text-slate-400 font-medium">Global Developers</p>
          </div>

          <div className="glass-card rounded-2xl p-4 border border-purple-500/20">
            <div className="text-xl sm:text-2xl font-black text-white">
              <AnimatedCounter endValue={45000000} prefix="$" suffix="+" />
            </div>
            <p className="text-xs text-slate-400 font-medium">Total Prize Pool</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function MainDiscoveryContent() {
  const { results, loading, error, filters, updateFilters, resetFilters } = useDiscovery({
    autoFetch: true,
    source: 'home'
  });

  const [savedIds, setSavedIds] = useState<string[]>(() => storageService.getSavedIds());
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  const handleToggleSave = (id: string) => {
    const updated = storageService.toggleSavedId(id);
    setSavedIds(updated);
  };

  const displayedResults = useMemo(() => {
    if (showSavedOnly) {
      return results.filter(h => savedIds.includes(h.id));
    }
    return results;
  }, [results, showSavedOnly, savedIds]);

  return (
    <div className="min-h-screen flex flex-col bg-[#060816] text-[#F6F8FC] selection:bg-purple-600 selection:text-white">
      <Navbar
        savedCount={savedIds.length}
        onOpenSaved={() => setShowSavedOnly(!showSavedOnly)}
      />

      <HeroContent />

      <main id="discover" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        
        {/* CURATED COLLECTIONS SECTION */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-purple-900/30 pb-3">
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" /> Curated Collections
            </h3>
            <span className="text-xs text-purple-400 font-mono font-bold">Featured Explorer</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {CURATED_COLLECTIONS.map((coll) => (
              <div
                key={coll.id}
                onClick={() => updateFilters(prev => ({ ...prev, ...coll.query }))}
                className="p-4 rounded-2xl glass-card border border-purple-900/30 hover:border-purple-500/50 hover:bg-purple-950/40 transition-all cursor-pointer space-y-2 group"
              >
                <div className="text-2xl group-hover:scale-110 transition-transform">{coll.emoji}</div>
                <h4 className="text-xs font-bold text-white">{coll.title}</h4>
                <p className="text-[10px] text-slate-400 line-clamp-2">{coll.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FILTER BAR SECTION */}
        <section className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-purple-900/30 pb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto scrollbar-none">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline-flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-purple-400" /> Mode:
            </span>

            <button
              onClick={() => updateFilters(prev => ({ ...prev, isOnline: undefined }))}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
                filters.isOnline === undefined
                  ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                  : 'glass-card text-slate-300 border-purple-900/30 hover:text-white'
              }`}
            >
              All Events
            </button>

            <button
              onClick={() => updateFilters(prev => ({ ...prev, isOnline: true }))}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
                filters.isOnline === true
                  ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                  : 'glass-card text-slate-300 border-purple-900/30 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5 inline mr-1 text-purple-300" /> Online
            </button>

            <button
              onClick={() => updateFilters(prev => ({ ...prev, isOnline: false }))}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
                filters.isOnline === false
                  ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                  : 'glass-card text-slate-300 border-purple-900/30 hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 inline mr-1 text-emerald-300" /> In-Person
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <span className="text-xs font-bold text-slate-400 font-mono-num">
              {displayedResults.length} Events Found
            </span>

            <button
              onClick={resetFilters}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold glass-card border border-purple-900/30 text-slate-400 hover:text-white flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
            </button>
          </div>
        </section>

        {/* HACKATHON CARDS GRID */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-80 rounded-2xl bg-slate-950/60 border border-purple-900/20 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="py-16 text-center space-y-4">
            <p className="text-sm font-bold text-rose-400">{error}</p>
            <button
              onClick={resetFilters}
              className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold"
            >
              Retry Search
            </button>
          </div>
        ) : displayedResults.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedResults.map((h) => (
              <HackathonCard
                key={h.id}
                hackathon={h as unknown as Hackathon}
                isSaved={savedIds.includes(h.id)}
                onToggleSave={handleToggleSave}
              />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center space-y-4 glass-card rounded-3xl border border-purple-900/30 max-w-lg mx-auto">
            <h4 className="text-base font-bold text-white">No Hackathons Found</h4>
            <p className="text-xs text-slate-400">Try adjusting your category tags or search criteria.</p>
            <button
              onClick={resetFilters}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function HomePage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-[#060816]" />}>
      <SpotlightProvider>
        <MainDiscoveryContent />
      </SpotlightProvider>
    </React.Suspense>
  );
}
