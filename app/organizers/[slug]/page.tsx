'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HackathonCard from '@/components/HackathonCard';
import { useOrganizer } from '@/hooks/useOrganizer';
import { storageService } from '@/lib/storage-service';
import { Hackathon } from '@/lib/supabase';
import {
  ShieldCheck,
  Users,
  Calendar,
  Star,
  Trophy,
  ArrowLeft,
  ExternalLink
} from 'lucide-react';

export default function OrganizerDetailPage() {
  const params = useParams();
  const slug = (params?.slug as string) || '';

  const { organizer, hackathons, isFollowing, toggleFollow, loading } = useOrganizer(slug);
  const [activeTab, setActiveTab] = useState<'events' | 'about' | 'stats'>('events');
  const [eventFilter, setEventFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [savedIds, setSavedIds] = useState<string[]>(() => storageService.getSavedIds());

  const handleToggleSave = (hId: string) => {
    const updated = storageService.toggleSavedId(hId);
    setSavedIds(updated);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060816] text-[#F6F8FC]">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 pt-28 pb-16 space-y-8">
          <div className="h-64 bg-slate-900 rounded-3xl animate-pulse" />
          <div className="h-40 bg-slate-900 rounded-2xl animate-pulse" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!organizer) {
    return (
      <div className="min-h-screen bg-[#060816] text-[#F6F8FC] flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
          <h2 className="text-2xl font-black text-white">Organizer Not Found</h2>
          <p className="text-sm text-slate-400">The organizer profile you are looking for does not exist.</p>
          <Link href="/" className="px-6 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs">
            Return to Home
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const filteredHackathons = hackathons.filter(h => {
    if (eventFilter === 'upcoming') {
      return new Date(h.end_date) >= new Date();
    }
    if (eventFilter === 'past') {
      return new Date(h.end_date) < new Date();
    }
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#060816] text-[#F6F8FC] selection:bg-purple-600 selection:text-white">
      <Navbar savedCount={savedIds.length} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 space-y-8">

        {/* BREADCRUMB */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-purple-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        {/* HERO BANNER CARD */}
        <div className="glass-card rounded-3xl overflow-hidden border border-purple-500/30 shadow-2xl relative">
          <div className="h-48 sm:h-56 w-full relative bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-950">
            {organizer.banner_url && (
              <img src={organizer.banner_url} alt={organizer.name} className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#060816] via-transparent to-transparent" />
          </div>

          <div className="px-6 sm:px-8 pb-8 pt-0 relative space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-16">
              <div className="flex items-end gap-4">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-purple-950 border-4 border-purple-500 shadow-2xl flex items-center justify-center text-3xl font-black text-purple-300 overflow-hidden shrink-0">
                  {organizer.logo_url ? (
                    <img src={organizer.logo_url} alt={organizer.name} className="w-full h-full object-cover" />
                  ) : (
                    organizer.name.charAt(0)
                  )}
                </div>

                <div className="space-y-1">
                  <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
                    {organizer.name}
                    {organizer.is_verified && <ShieldCheck className="w-6 h-6 text-purple-400" />}
                  </h1>
                  <p className="text-xs text-slate-400 font-mono">@{organizer.slug} • {organizer.country || 'India'}</p>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleFollow}
                  className={`px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all ${
                    isFollowing
                      ? 'bg-purple-950 text-purple-300 border border-purple-500/40 hover:bg-rose-950 hover:text-rose-300 hover:border-rose-500/40'
                      : 'bg-purple-600 hover:bg-purple-500 text-white'
                  }`}
                >
                  {isFollowing ? 'Following' : '+ Follow Organizer'}
                </button>

                {organizer.website && (
                  <a
                    href={organizer.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl glass-card text-slate-300 hover:text-white border border-purple-900/40"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* DESCRIPTION & STATS ROW */}
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              {organizer.description || 'Premier hackathon organization supporting developers and builders globally.'}
            </p>

            <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-purple-900/30 text-xs font-mono font-bold">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                <span className="text-white">{organizer.hackathon_count || hackathons.length}</span>
                <span className="text-slate-400">Events Hosted</span>
              </div>

              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span className="text-white">{organizer.follower_count}</span>
                <span className="text-slate-400">Followers</span>
              </div>

              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-white">{organizer.avg_rating ? organizer.avg_rating.toFixed(1) : '4.9'}</span>
                <span className="text-slate-400">Rating</span>
              </div>
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-4 border-b border-purple-900/30 pb-2">
          <button
            onClick={() => setActiveTab('events')}
            className={`pb-2 px-1 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'events'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Hackathon Events ({hackathons.length})
          </button>

          <button
            onClick={() => setActiveTab('about')}
            className={`pb-2 px-1 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'about'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            About Organizer
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`pb-2 px-1 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'stats'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Analytics & Impact
          </button>
        </div>

        {/* TAB 1: EVENTS */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEventFilter('all')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  eventFilter === 'all' ? 'bg-purple-600 text-white' : 'glass-card text-slate-400 hover:text-white'
                }`}
              >
                All Events ({hackathons.length})
              </button>
              <button
                onClick={() => setEventFilter('upcoming')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  eventFilter === 'upcoming' ? 'bg-purple-600 text-white' : 'glass-card text-slate-400 hover:text-white'
                }`}
              >
                Upcoming / Live
              </button>
              <button
                onClick={() => setEventFilter('past')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  eventFilter === 'past' ? 'bg-purple-600 text-white' : 'glass-card text-slate-400 hover:text-white'
                }`}
              >
                Past Events
              </button>
            </div>

            {filteredHackathons.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredHackathons.map(h => (
                  <HackathonCard
                    key={h.id}
                    hackathon={h as unknown as Hackathon}
                    isSaved={savedIds.includes(h.id)}
                    onToggleSave={handleToggleSave}
                  />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400">
                <p>No hackathons found matching this filter.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ABOUT */}
        {activeTab === 'about' && (
          <div className="glass-card rounded-3xl p-8 border border-purple-900/30 space-y-6 max-w-3xl">
            <h3 className="text-xl font-bold text-white">About {organizer.name}</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              {organizer.description || 'Verified organization bringing world-class developer events, hackathons, and innovation challenges.'}
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-purple-900/20 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 font-semibold">Location:</span>
                <p className="font-bold text-white">{organizer.country || 'India'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-semibold">Verification:</span>
                <p className="font-bold text-purple-300">{organizer.is_verified ? 'Official Verified Partner' : 'Standard'}</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: STATS */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-card rounded-2xl p-6 border border-purple-500/20 text-center space-y-2">
                <Trophy className="w-8 h-8 text-amber-400 mx-auto" />
                <span className="text-xs font-semibold text-slate-400">Total Prize Awarded</span>
                <p className="text-2xl font-black text-white">₹{((organizer.total_prize_amount || 150000)).toLocaleString()}</p>
              </div>

              <div className="glass-card rounded-2xl p-6 border border-purple-500/20 text-center space-y-2">
                <Users className="w-8 h-8 text-purple-400 mx-auto" />
                <span className="text-xs font-semibold text-slate-400">Total Participants</span>
                <p className="text-2xl font-black text-white">{(organizer.total_participants || 4500).toLocaleString()}+</p>
              </div>

              <div className="glass-card rounded-2xl p-6 border border-purple-500/20 text-center space-y-2">
                <Star className="w-8 h-8 text-cyan-400 mx-auto" />
                <span className="text-xs font-semibold text-slate-400">Average Event Rating</span>
                <p className="text-2xl font-black text-white">{organizer.avg_rating ? organizer.avg_rating.toFixed(1) : '4.9'} / 5.0</p>
              </div>
            </div>

            {/* BAR CHART SIMULATION FOR POPULAR TAGS */}
            <div className="glass-card rounded-3xl p-8 border border-purple-900/30 space-y-4">
              <h4 className="text-sm font-bold text-white">Popular Event Technology Categories</h4>
              <div className="space-y-3">
                {[
                  { tag: 'AI / Machine Learning', pct: 85 },
                  { tag: 'Web3 & Blockchain', pct: 60 },
                  { tag: 'Cloud & DevOps', pct: 45 },
                  { tag: 'Open Source', pct: 30 }
                ].map(item => (
                  <div key={item.tag} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-300">
                      <span>{item.tag}</span>
                      <span>{item.pct}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-900 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-600 to-cyan-500 rounded-full" style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}
