'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CountdownTimer from '@/components/CountdownTimer';
import { fetchHackathonById, Hackathon } from '@/lib/supabase';
import {
  Calendar,
  MapPin,
  Globe,
  Building2,
  Share2,
  ExternalLink,
  ArrowLeft,
  Bookmark,
  Check,
  Sparkles,
  Trophy,
  Users,
  ShieldCheck,
  Clock
} from 'lucide-react';

export default function HackathonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    async function loadDetail() {
      if (!id) return;
      setLoading(true);
      const data = await fetchHackathonById(id);
      setHackathon(data);
      setLoading(false);

      // Check saved state
      try {
        const stored = localStorage.getItem('findathon_saved_ids');
        if (stored) {
          const ids: string[] = JSON.parse(stored);
          setIsSaved(ids.includes(id));
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadDetail();
  }, [id]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: hackathon?.title || 'Findathon',
          text: `Check out ${hackathon?.title} on Findathon!`,
          url: url
        });
        return;
      } catch (e) {
        // Fallback to clipboard if user cancels or share API fails
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleBookmark = () => {
    if (!id) return;
    try {
      const stored = localStorage.getItem('findathon_saved_ids');
      let ids: string[] = stored ? JSON.parse(stored) : [];
      if (ids.includes(id)) {
        ids = ids.filter(item => item !== id);
        setIsSaved(false);
      } else {
        ids.push(id);
        setIsSaved(true);
      }
      localStorage.setItem('findathon_saved_ids', JSON.stringify(ids));
    } catch (e) {
      console.error(e);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-16 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-purple-300">Loading hackathon details...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!hackathon) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-16 text-center space-y-4">
          <h2 className="text-2xl font-bold text-slate-200">Hackathon Not Found</h2>
          <p className="text-slate-400">The hackathon you are looking for does not exist or has been removed.</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Hackathons
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const defaultCover = 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1200&auto=format&fit=crop';
  const coverUrl = hackathon.cover_image_url || defaultCover;

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19] text-slate-100 selection:bg-purple-600 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Back Link */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-purple-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to all hackathons
          </Link>
        </div>

        {/* HERO COVER BANNER */}
        <div className="relative rounded-3xl bg-slate-900 border border-purple-900/40 overflow-hidden shadow-2xl">
          <div className="relative w-full h-64 sm:h-80 md:h-96">
            <img
              src={coverUrl}
              alt={hackathon.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          </div>

          {/* Banner Overlays */}
          <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 z-10">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md border ${
                  hackathon.is_online
                    ? 'bg-purple-950/80 text-purple-300 border-purple-500/40'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                }`}>
                  {hackathon.is_online ? <Globe className="w-3.5 h-3.5 text-purple-400" /> : <MapPin className="w-3.5 h-3.5 text-emerald-400" />}
                  {hackathon.is_online ? 'Online Event' : 'In-Person'}
                </span>

                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs uppercase tracking-wider font-bold bg-purple-500/20 text-purple-200 border border-purple-500/30">
                  <Sparkles className="w-3 h-3" />
                  {hackathon.status || 'Active'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                {hackathon.title}
              </h1>

              <div className="flex items-center gap-2 text-xs sm:text-sm text-purple-300 font-medium">
                <Building2 className="w-4 h-4 text-purple-400" />
                <span>Hosted by {hackathon.organizer || 'Community Host'}</span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-purple-900/50 backdrop-blur-md transition-all"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-purple-400" />}
                <span>{copied ? 'Link Copied!' : 'Share'}</span>
              </button>

              <button
                onClick={handleToggleBookmark}
                className={`p-2.5 rounded-xl backdrop-blur-md transition-all border ${
                  isSaved
                    ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-900/50'
                    : 'bg-slate-900/90 text-slate-300 hover:text-purple-300 border-purple-900/50'
                }`}
                title={isSaved ? 'Saved' : 'Save'}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* TWO COLUMN CONTENT LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT MAIN COLUMN: Description & Overview */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Description */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-purple-900/30 space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                About this Hackathon
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                {hackathon.description}
              </p>
            </div>

            {/* Tags */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-purple-900/30 space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-purple-400">Categories & Tech Stack</h3>
              <div className="flex flex-wrap gap-2">
                {hackathon.tags && hackathon.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-950/80 text-purple-300 border border-purple-800/50"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Venue & Location Details */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-purple-900/30 space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-purple-400" />
                Venue & Location Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-purple-900/20 space-y-1">
                  <span className="text-xs text-purple-400 font-semibold uppercase">Event Format</span>
                  <p className="text-white font-bold">{hackathon.is_online ? 'Online Virtual Hackathon' : 'In-Person On-Campus'}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-purple-900/20 space-y-1">
                  <span className="text-xs text-purple-400 font-semibold uppercase">City / Region</span>
                  <p className="text-white font-bold">{hackathon.location_city || 'Worldwide'}</p>
                </div>
                {hackathon.location_college && (
                  <div className="sm:col-span-2 p-4 rounded-2xl bg-slate-950/60 border border-purple-900/20 space-y-1">
                    <span className="text-xs text-purple-400 font-semibold uppercase">College / Campus Venue</span>
                    <p className="text-white font-bold">{hackathon.location_college}</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT SIDEBAR COLUMN: Countdown Timer & CTA */}
          <div className="space-y-6">
            
            {/* COUNTDOWN TIMER */}
            <CountdownTimer
              targetDate={hackathon.start_date}
              label="Registration Deadline / Event Start"
            />

            {/* REGISTER NOW PRIMARY CTA */}
            <div className="p-6 rounded-3xl bg-gradient-to-b from-purple-950/70 to-slate-900 border border-purple-700/50 space-y-4 shadow-xl text-center">
              <h3 className="text-lg font-bold text-white">Ready to Hack & Build?</h3>
              <p className="text-xs text-slate-300">
                Registration is open. Secure your team spot on the official portal!
              </p>

              <a
                href={hackathon.register_url || '#'}
                target={hackathon.register_url?.startsWith('http') ? '_blank' : '_self'}
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-sm font-bold bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Register Now</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verified Official Link</span>
              </div>
            </div>

            {/* EVENT METADATA CARD */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-purple-900/30 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-purple-900/20">
                <span className="text-slate-400">Start Date</span>
                <span className="font-bold text-white">{formatDate(hackathon.start_date)}</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-purple-900/20">
                <span className="text-slate-400">End Date</span>
                <span className="font-bold text-white">{formatDate(hackathon.end_date)}</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-purple-900/20">
                <span className="text-slate-400">Organizer</span>
                <span className="font-bold text-purple-300">{hackathon.organizer || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Status</span>
                <span className="font-bold text-emerald-400 capitalize">{hackathon.status || 'Active'}</span>
              </div>
            </div>

          </div>

        </div>

      </main>

      <Footer />
    </div>
  );
}
