'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HackathonCard from '@/components/HackathonCard';
import { fetchHackathons, Hackathon } from '@/lib/supabase';
import { Search, Filter, Sparkles, Globe, MapPin, X, Bookmark, Trophy, Flame } from 'lucide-react';

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

    // Load saved IDs from localStorage
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
      // Saved filter toggle
      if (showSavedOnly && !savedIds.includes(item.id)) {
        return false;
      }

      // Search Query matching (city, college, title, description, tags)
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

      // Filter Buttons: All / Online / Offline / AI / Web3
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
    <div className="min-h-screen flex flex-col bg-[#0b0f19] text-slate-100 selection:bg-purple-600 selection:text-white">
      
      {/* Navbar */}
      <Navbar
        savedCount={savedIds.length}
        onOpenSaved={() => setShowSavedOnly(!showSavedOnly)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        
        {/* HERO SECTION */}
        <section className="relative rounded-3xl bg-gradient-to-b from-purple-950/60 via-slate-900/80 to-slate-950 p-8 sm:p-12 border border-purple-900/40 overflow-hidden mb-12 shadow-2xl">
          {/* Subtle purple background glow elements */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-10 w-72 h-72 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
            
            {/* Header Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-900/50 border border-purple-500/30 text-purple-300 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Discover 100+ Global & Local Hackathons</span>
            </div>

            {/* Main Hero Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Find Hackathons <span className="text-gradient">Near You</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">
              Search top offline college hackathons, city tech fests, and global online prize pools. Filter by AI, Web3, city, or university.
            </p>

            {/* SEARCH BAR */}
            <div className="pt-2 max-w-2xl mx-auto">
              <div className="relative flex items-center">
                <Search className="absolute left-4 w-5 h-5 text-purple-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by city (e.g. San Francisco, Bengaluru), college, AI, or keyword..."
                  className="w-full pl-12 pr-12 py-4 rounded-2xl bg-slate-950/90 border border-purple-800/60 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base shadow-xl backdrop-blur-xl transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 text-slate-400 hover:text-white p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Stats highlight */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-medium text-slate-300">
              <div className="flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-purple-400" />
                <span>$250K+ Total Prize Pool</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-purple-400" />
                <span>Online & In-Person Events</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-purple-400" />
                <span>50+ Top Tech Campuses</span>
              </div>
            </div>

          </div>
        </section>

        {/* FILTER BAR SECTION */}
        <section className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          
          {/* Category Filter Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto scrollbar-none">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline flex items-center gap-1">
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
                    : 'bg-slate-900/80 text-slate-300 border-purple-900/30 hover:border-purple-500/40 hover:bg-slate-800'
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
                  : 'bg-slate-900/80 text-slate-300 border-purple-900/30 hover:border-purple-500/40 hover:bg-slate-800'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${showSavedOnly ? 'fill-current' : 'text-purple-400'}`} />
              Saved ({savedIds.length})
            </button>
          </div>

          {/* Results count */}
          <div className="text-xs font-semibold text-slate-400 self-end md:self-auto">
            Showing <span className="text-purple-300 font-bold">{filteredHackathons.length}</span> hackathons
          </div>

        </section>

        {/* Saved Filter Active Banner */}
        {showSavedOnly && (
          <div className="mb-6 p-4 rounded-2xl bg-purple-950/50 border border-purple-600/40 flex items-center justify-between">
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
              <div key={n} className="h-96 rounded-2xl bg-slate-900/50 animate-pulse border border-purple-900/20" />
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
          <div className="py-16 text-center space-y-4 rounded-3xl bg-slate-900/40 border border-purple-900/20">
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
  );
}
