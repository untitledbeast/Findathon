'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CountdownTimer from '@/components/CountdownTimer';
import HackathonCard from '@/components/HackathonCard';
import { hackathonsApi, HackathonDTO } from '@/lib/modules/hackathons';
import { useAuth } from '@/lib/auth-context';
import {
  Calendar,
  MapPin,
  Trophy,
  Users,
  Clock,
  Globe,
  Share2,
  Bookmark,
  Check,
  Star,
  ChevronDown,
  Building,
  Mail,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  Flag,
  Award,
  Briefcase
} from 'lucide-react';

export default function HackathonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();

  const [hackathon, setHackathon] = useState<HackathonDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    let isActive = true;
    async function loadData() {
      try {
        const data = await hackathonsApi.getById(id);
        if (isActive) setHackathon(data);
      } catch (err) {
        console.error('Failed to load hackathon:', err);
      } finally {
        if (isActive) setLoading(false);
      }
    }
    loadData();
    return () => { isActive = false; };
  }, [id]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowStickyBar(true);
      } else {
        setShowStickyBar(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleSave = () => {
    setIsSaved(prev => !prev);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060816] text-[#F6F8FC] flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto w-full p-6 space-y-6 animate-pulse">
          <div className="w-full h-80 bg-slate-900/80 rounded-3xl shimmer" />
          <div className="grid grid-cols-4 gap-4 h-24 bg-slate-900/80 rounded-2xl shimmer" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!hackathon) {
    return (
      <div className="min-h-screen bg-[#060816] text-[#F6F8FC] flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="glass-card p-12 rounded-3xl max-w-md space-y-4">
            <h2 className="text-2xl font-black text-white">Hackathon Not Found</h2>
            <p className="text-xs text-slate-400">The event you are looking for may have been moved or archived.</p>
            <Link href="/" className="inline-block py-3 px-6 rounded-xl bg-purple-600 text-white font-bold text-xs">
              Back to Discover
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const startDate = new Date(hackathon.startDate);
  const deadline = new Date(hackathon.registrationDeadline || hackathon.startDate);
  const now = new Date();
  const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen bg-[#060816] text-[#F6F8FC] flex flex-col selection:bg-purple-600 selection:text-white">
      <Navbar />

      {/* DESKTOP SCROLL-TRIGGERED STICKY ACTION BAR */}
      <div
        className={`fixed top-14 left-0 right-0 z-40 bg-[#0D1224]/90 backdrop-blur-md border-b border-purple-900/30 py-3 px-6 transition-all duration-300 flex items-center justify-between ${
          showStickyBar ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3 truncate max-w-xl">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <h4 className="text-sm font-bold text-white truncate">{hackathon.title}</h4>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={toggleSave} className="p-2 rounded-xl glass-card text-slate-300 hover:text-white">
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-purple-400 text-purple-400' : ''}`} />
          </button>
          <button onClick={handleShare} className="p-2 rounded-xl glass-card text-slate-300 hover:text-white">
            <Share2 className="w-4 h-4" />
          </button>
          <a
            href={hackathon.registrationDeadline || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30"
          >
            Register Now →
          </a>
        </div>
      </div>

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative w-full h-[400px] sm:h-[480px] bg-slate-950 overflow-hidden">
          {hackathon.coverImage ? (
            <Image
              src={hackathon.coverImage}
              alt={hackathon.title}
              fill
              className="object-cover opacity-60"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-purple-900 via-slate-900 to-cyan-900 opacity-80" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-[#060816] via-[#060816]/60 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto p-6 sm:p-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 backdrop-blur-md">
                  🟢 Registration Open
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-950/90 text-purple-300 border border-purple-500/40 backdrop-blur-md flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> Verified Host
                </span>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-950/90 text-amber-300 border border-amber-500/40 backdrop-blur-md">
                ⭐ Quality Event
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">{hackathon.title}</h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-3xl line-clamp-2">
              Organized by <span className="font-bold text-purple-300">{hackathon.organizer}</span>
            </p>
          </div>
        </section>

        {/* QUICK FACTS BAR */}
        <section className="max-w-7xl mx-auto px-6 py-6">
          <div className="glass-card p-6 rounded-3xl border border-purple-900/30 grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
                <Calendar className="w-4 h-4 text-purple-400" /> Dates
              </div>
              <p className="text-sm font-bold text-white">
                {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
              <span className="text-[11px] font-semibold text-emerald-400">
                {diffDays > 0 ? `Starts in ${diffDays} days` : 'Happening Now'}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
                <MapPin className="w-4 h-4 text-cyan-400" /> Location
              </div>
              <p className="text-sm font-bold text-white">
                {hackathon.isOnline ? 'Worldwide 🌐' : hackathon.locationCity || 'In-Person'}
              </p>
              <span className="text-[11px] font-semibold text-slate-400">
                {hackathon.isOnline ? 'Virtual' : hackathon.locationCollege || 'Venue details inside'}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
                <Trophy className="w-4 h-4 text-amber-400" /> Prize Pool
              </div>
              <p className="text-sm font-black text-amber-300 font-mono">
                {hackathon.prizePool || `$${hackathon.prizeAmount.toLocaleString()}`}
              </p>
              <span className="text-[11px] font-semibold text-emerald-400">Registration: Free</span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
                <Users className="w-4 h-4 text-emerald-400" /> Team Size
              </div>
              <p className="text-sm font-bold text-white">1 - 4 Members</p>
              <span className="text-[11px] font-semibold text-purple-300">Open to All</span>
            </div>
          </div>
        </section>

        {/* TWO COLUMN CONTENT */}
        <section className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
          {/* LEFT COLUMN */}
          <div className="space-y-8">
            {/* ABOUT */}
            <div className="glass-card p-8 rounded-3xl border border-purple-900/30 space-y-4">
              <h2 className="text-xl font-black text-white">About this Hackathon</h2>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {hackathon.description}
              </p>
            </div>

            {/* PRIZE BREAKDOWN */}
            <div className="glass-card p-8 rounded-3xl border border-purple-900/30 space-y-4">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" /> Prize Breakdown
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl glass-card border border-amber-500/30 text-center space-y-1">
                  <span className="text-2xl">🥇</span>
                  <h4 className="text-xs font-bold text-amber-300 uppercase">1st Place</h4>
                  <p className="text-lg font-black text-white font-mono">$5,000</p>
                </div>
                <div className="p-4 rounded-2xl glass-card border border-slate-400/30 text-center space-y-1">
                  <span className="text-2xl">🥈</span>
                  <h4 className="text-xs font-bold text-slate-300 uppercase">2nd Place</h4>
                  <p className="text-lg font-black text-white font-mono">$3,000</p>
                </div>
                <div className="p-4 rounded-2xl glass-card border border-amber-700/30 text-center space-y-1">
                  <span className="text-2xl">🥉</span>
                  <h4 className="text-xs font-bold text-amber-600 uppercase">3rd Place</h4>
                  <p className="text-lg font-black text-white font-mono">$1,500</p>
                </div>
              </div>
            </div>

            {/* EVENT TIMELINE */}
            <div className="glass-card p-8 rounded-3xl border border-purple-900/30 space-y-6">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-400" /> Event Timeline
              </h2>
              <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-purple-900/40">
                {[
                  { step: 'Registration Opens', date: 'Jul 15, 2026', done: true },
                  { step: 'Registration Deadline', date: deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), current: true },
                  { step: 'Hackathon Starts', date: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) },
                  { step: 'Submission Deadline', date: 'Aug 15, 2026' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-4 pl-8 relative">
                    <div className={`absolute left-1.5 top-1 w-3.5 h-3.5 rounded-full border-2 ${
                      item.done ? 'bg-purple-600 border-purple-400' : item.current ? 'bg-emerald-400 border-white animate-ping' : 'bg-slate-900 border-slate-700'
                    }`} />
                    <div>
                      <h4 className="text-sm font-bold text-white">{item.step}</h4>
                      <p className="text-xs font-mono text-slate-400 mt-0.5">{item.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* REVIEWS & RATINGS */}
            <div className="glass-card p-8 rounded-3xl border border-purple-900/30 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" /> Community Reviews
                </h2>
                <span className="text-xs font-bold text-slate-400">
                  {hackathon.avgRating.toFixed(1)} / 5.0 ({hackathon.reviewsCount} reviews)
                </span>
              </div>

              <div className="p-4 rounded-2xl glass-card border border-purple-900/20 flex items-center gap-4">
                <div className="text-4xl font-black text-amber-300 font-mono">{hackathon.avgRating.toFixed(1)}</div>
                <div className="space-y-1">
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-4 h-4 fill-amber-400" />)}
                  </div>
                  <p className="text-xs text-slate-400">Based on participant feedback</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="space-y-6">
            {/* CTA CARD WITH COUNTDOWN */}
            <div className="glass-card p-6 rounded-3xl border border-purple-500/40 space-y-6 shadow-2xl sticky top-24">
              <div className="space-y-2 text-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registration Closes In</span>
                <CountdownTimer targetDate={hackathon.registrationDeadline || hackathon.startDate} />
              </div>

              <a
                href={hackathon.registrationDeadline || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 px-6 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
              >
                Register Now <ExternalLink className="w-4 h-4" />
              </a>

              {/* ACTION BUTTONS GRID */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={toggleSave}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    isSaved ? 'bg-purple-600/20 border-purple-500 text-purple-300' : 'glass-card border-purple-900/30 text-slate-300 hover:text-white'
                  }`}
                >
                  <Bookmark className="w-4 h-4" /> {isSaved ? 'Saved' : 'Save'}
                </button>
                <button
                  onClick={handleShare}
                  className="p-3 rounded-xl glass-card border border-purple-900/30 text-xs font-bold text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-all"
                >
                  <Share2 className="w-4 h-4" /> {copied ? 'Copied!' : 'Share'}
                </button>
              </div>

              {/* ORGANIZER MINI CARD */}
              <div className="pt-4 border-t border-purple-900/30 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold">
                    {hackathon.organizer.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{hackathon.organizer}</h4>
                    <span className="text-[10px] text-slate-400">Verified Organizer</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsFollowing(prev => !prev)}
                  className={`w-full py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    isFollowing ? 'bg-purple-600 text-white border-purple-400' : 'glass-card border-purple-900/30 text-slate-300 hover:text-white'
                  }`}
                >
                  {isFollowing ? '✓ Following' : '+ Follow Organizer'}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* MOBILE STICKY BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden glass-card border-t border-purple-900/30 p-4 flex items-center justify-between bg-[#060816]/95 backdrop-blur-md">
        <div>
          <span className="text-xs font-black text-amber-300 font-mono">
            {hackathon.prizePool || `$${hackathon.prizeAmount.toLocaleString()}`}
          </span>
          <p className="text-[10px] text-slate-400">Free Registration</p>
        </div>
        <a
          href={hackathon.registrationDeadline || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="py-3 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30"
        >
          Register Now →
        </a>
      </div>

      <Footer />
    </div>
  );
}
