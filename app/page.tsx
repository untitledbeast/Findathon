'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HackathonCard from '@/components/HackathonCard';
import { SpotlightProvider, useSpotlight } from '@/components/SpotlightSearch';
import { fetchHackathons, Hackathon } from '@/lib/supabase';
import {
  Search,
  Filter,
  Sparkles,
  Globe,
  MapPin,
  X,
  Bookmark,
  Trophy,
  ArrowRight,
  Command,
  TrendingUp,
  Users,
  DollarSign
} from 'lucide-react';

const CATEGORY_CHIPS = [
  { label: '🤖 AI/ML', id: 'ai-ml' },
  { label: '⛓ Web3', id: 'web3' },
  { label: '🛡 Cybersecurity', id: 'cybersecurity' },
  { label: '☁ Cloud', id: 'cloud' },
  { label: '🤖 Robotics', id: 'robotics' },
];

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
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  // Mouse Parallax Listener
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const moveX = ((e.clientX - centerX) / rect.width) * -20;
      const moveY = ((e.clientY - centerY) / rect.height) * -20;
      setMouseOffset({ x: moveX, y: moveY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative min-h-[92vh] flex flex-col items-center justify-center pt-24 pb-16 px-4 overflow-hidden"
    >
      
      {/* 3D FLOATING SPHERES (MOUSE PARALLAX) */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          transform: `translate3d(${mouseOffset.x}px, ${mouseOffset.y}px, 0px)`,
          transition: 'transform 0.1s ease-out'
        }}
      >
        {/* Large Central Glowing Sphere */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full bg-radial from-purple-600/20 via-indigo-600/10 to-transparent blur-2xl animate-float" />
        
        {/* Small Orbiting Sphere 1 */}
        <div className="absolute top-1/4 left-1/3 w-32 h-32 rounded-full bg-radial from-cyan-400/20 to-transparent blur-xl animate-float" style={{ animationDelay: '2s' }} />

        {/* Small Orbiting Sphere 2 */}
        <div className="absolute bottom-1/4 right-1/3 w-40 h-40 rounded-full bg-radial from-emerald-400/15 to-transparent blur-xl animate-float" style={{ animationDelay: '4s' }} />

        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(#8B5CF6_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* CENTER CONTENT (MAX-WIDTH 800PX) */}
      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
        
        {/* Glass Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card border border-purple-500/30 text-purple-300 text-xs font-semibold shadow-lg animate-fade-in-up">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>✦ Discover. Build. Win.</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-[#F6F8FC] tracking-tight leading-tight">
          Discover the world&apos;s{' '}
          <span className="glow-text">best hackathons</span>
        </h1>

        {/* Subtext */}
        <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          Find hackathons that inspire you, challenge you, and help you build the future. Filter by AI, Web3, city, or campus.
        </p>

        {/* SPOTLIGHT SEARCH TRIGGER BAR */}
        <div
          onClick={openSpotlight}
          className="max-w-2xl w-full mx-auto glass-card rounded-full p-2.5 sm:p-3.5 cursor-pointer hover:border-purple-500/50 transition-all shadow-2xl flex items-center justify-between gap-3 animate-fade-in-up group"
          style={{ animationDelay: '0.5s' }}
        >
          <div className="flex items-center gap-3 pl-3 text-slate-400 text-sm overflow-hidden">
            <Search className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform shrink-0" />
            <span className="truncate">Search hackathons, technologies, prizes...</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-900 text-slate-400 border border-purple-900/40 font-mono-num">
              <Command className="w-3 h-3" /> K
            </span>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* CATEGORY CHIPS ROW */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
          {CATEGORY_CHIPS.map((chip, idx) => (
            <Link
              key={chip.id}
              href={`/categories/${chip.id}`}
              className="glass-card hover:bg-purple-600 hover:text-white transition-all duration-300 rounded-full px-4 py-2 text-xs font-semibold text-slate-300 border border-purple-500/20 hover:border-purple-400 shadow-md animate-cascade"
              style={{ animationDelay: `${0.1 * idx}s` }}
            >
              {chip.label}
            </Link>
          ))}
          <Link
            href="/categories"
            className="text-xs font-bold text-purple-400 hover:text-purple-300 underline underline-offset-4 px-2"
          >
            View all →
          </Link>
        </div>

        {/* STATS CARDS ROW */}
        <div className="pt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
          
          <div className="glass-card rounded-2xl p-4 flex items-center justify-between border border-purple-500/20">
            <div className="text-left space-y-0.5">
              <div className="text-xl sm:text-2xl font-black text-white">
                <AnimatedCounter endValue={2450} suffix="+" />
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Active Hackathons</p>
            </div>
            <svg className="w-12 h-6 text-purple-400 shrink-0 opacity-70" viewBox="0 0 50 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M0 15 Q 12 5, 25 12 T 50 3" />
            </svg>
          </div>

          <div className="glass-card rounded-2xl p-4 flex items-center justify-between border border-purple-500/20">
            <div className="text-left space-y-0.5">
              <div className="text-xl sm:text-2xl font-black text-white">
                <AnimatedCounter endValue={1200000} suffix="+" />
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Global Developers</p>
            </div>
            <svg className="w-12 h-6 text-cyan-400 shrink-0 opacity-70" viewBox="0 0 50 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M0 18 Q 15 8, 30 14 T 50 2" />
            </svg>
          </div>

          <div className="glass-card rounded-2xl p-4 flex items-center justify-between border border-purple-500/20">
            <div className="text-left space-y-0.5">
              <div className="text-xl sm:text-2xl font-black text-white">
                <AnimatedCounter endValue={45000000} prefix="$" suffix="+" />
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Total Prize Funds</p>
            </div>
            <svg className="w-12 h-6 text-emerald-400 shrink-0 opacity-70" viewBox="0 0 50 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M0 12 Q 10 18, 25 6 T 50 2" />
            </svg>
          </div>

        </div>

      </div>
    </section>
  );
}

export default function HomePage() {
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await fetchHackathons();
      setHackathons(data);
      setLoading(false);
    }
    loadData();

    try {
      const stored = localStorage.getItem('findathon_saved_ids');
      if (stored) {
        setSavedIds(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleToggleSave = (id: string) => {
    setSavedIds(prev => {
      const next = prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id];
      try {
        localStorage.setItem('findathon_saved_ids', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  // Filtering Logic
  const filteredHackathons = useMemo(() => {
    return hackathons.filter(item => {
      if (showSavedOnly && !savedIds.includes(item.id)) {
        return false;
      }

      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesCity = item.location_city?.toLowerCase().includes(q) || false;
        const matchesCollege = item.location_college?.toLowerCase().includes(q) || false;
        const matchesOrganizer = item.organizer?.toLowerCase().includes(q) || false;
        const matchesTags = item.tags?.some(tag => tag.toLowerCase().includes(q)) || false;

        if (!matchesTitle && !matchesCity && !matchesCollege && !matchesOrganizer && !matchesTags) {
          return false;
        }
      }

      if (activeFilter === 'Online') {
        return item.is_online === true;
      }
      if (activeFilter === 'Offline') {
        return item.is_online === false;
      }
      if (activeFilter === 'AI') {
        return item.tags?.some(tag => tag.toLowerCase().includes('ai') || tag.toLowerCase().includes('machine learning'));
      }
      if (activeFilter === 'Web3') {
        return item.tags?.some(tag => tag.toLowerCase().includes('web3') || tag.toLowerCase().includes('crypto') || tag.toLowerCase().includes('blockchain'));
      }

      return true;
    });
  }, [hackathons, searchQuery, activeFilter, showSavedOnly, savedIds]);

  const filterOptions = ['All', 'Online', 'Offline', 'AI', 'Web3'];

  return (
    <SpotlightProvider>
      <div className="min-h-screen flex flex-col bg-[#060816] text-[#F6F8FC] selection:bg-purple-600 selection:text-white">
        
        {/* Navbar */}
        <Navbar
          savedCount={savedIds.length}
          onOpenSaved={() => setShowSavedOnly(!showSavedOnly)}
        />

        {/* HERO SECTION */}
        <HeroContent />

        {/* HACKATHON DISCOVERY & FILTERING SECTION */}
        <main id="discover" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
          
          {/* FILTER BAR SECTION */}
          <section className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            
            {/* Category Filter Buttons */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto scrollbar-none">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline-flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>
              {filterOptions.map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    setActiveFilter(filter);
                    setShowSavedOnly(false);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap border ${
                    !showSavedOnly && activeFilter === filter
                      ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-900/50 scale-105'
                      : 'glass-card text-slate-300 border-purple-900/30 hover:border-purple-500/40 hover:bg-slate-800'
                  }`}
                >
                  {filter === 'Online' && <Globe className="w-3.5 h-3.5 inline mr-1.5 text-purple-300" />}
                  {filter === 'Offline' && <MapPin className="w-3.5 h-3.5 inline mr-1.5 text-emerald-300" />}
                  {filter}
                </button>
              ))}

              {/* Saved Toggle Button */}
              <button
                onClick={() => setShowSavedOnly(!showSavedOnly)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap border flex items-center gap-1.5 ${
                  showSavedOnly
                    ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-900/50 scale-105'
                    : 'glass-card text-slate-300 border-purple-900/30 hover:border-purple-500/40 hover:bg-slate-800'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${showSavedOnly ? 'fill-current' : 'text-purple-400'}`} />
                Saved ({savedIds.length})
              </button>
            </div>

            {/* Results count */}
            <div className="text-xs font-semibold text-slate-400 self-end md:self-auto">
              Showing <span className="text-purple-300 font-bold font-mono-num">{filteredHackathons.length}</span> hackathons
            </div>

          </section>

          {/* Saved Filter Active Banner */}
          {showSavedOnly && (
            <div className="mb-6 p-4 rounded-2xl glass-card border border-purple-500/40 flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-200 text-sm">
                <Bookmark className="w-4 h-4 text-purple-400 fill-current" />
                <span>Viewing your bookmarked hackathons</span>
              </div>
              <button
                onClick={() => setShowSavedOnly(false)}
                className="text-xs font-bold text-purple-400 hover:text-white underline"
              >
                Clear Filter
              </button>
            </div>
          )}

          {/* HACKATHON CARDS GRID */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-96 rounded-2xl glass-card animate-pulse border border-purple-900/20" />
              ))}
            </div>
          ) : filteredHackathons.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredHackathons.map((hackathon) => (
                <HackathonCard
                  key={hackathon.id}
                  hackathon={hackathon}
                  isSaved={savedIds.includes(hackathon.id)}
                  onToggleSave={handleToggleSave}
                />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center space-y-4 rounded-3xl glass-card border border-purple-900/20">
              <div className="w-16 h-16 mx-auto rounded-full bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-200">No hackathons found</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                We couldn&apos;t find any hackathons matching your search query or selected filter.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveFilter('All');
                  setShowSavedOnly(false);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white"
              >
                Reset Filters
              </button>
            </div>
          )}

        </main>

        {/* Footer */}
        <Footer />

      </div>
    </SpotlightProvider>
  );
}
