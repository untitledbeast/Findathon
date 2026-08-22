'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CountdownTimer from '@/components/CountdownTimer';
import { hackathonsApi } from '@/lib/modules/hackathons';
import { normalizeHackathonDetail, NormalizedHackathonDetail } from '@/lib/utils/hackathon-normalizer';
import { DEFAULT_HACKATHON_COVER } from '@/lib/utils/formatters';
import {
  Calendar,
  MapPin,
  Trophy,
  Users,
  Clock,
  Share2,
  Bookmark,
  Star,
  ExternalLink,
  ShieldCheck,
  Award,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

export default function HackathonDetailClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [hackathon, setHackathon] = useState<NormalizedHackathonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    let isActive = true;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const raw = await hackathonsApi.getById(id);
        if (isActive) {
          if (raw) {
            setHackathon(normalizeHackathonDetail(raw));
          } else {
            setHackathon(null);
          }
        }
      } catch (err) {
        console.error('Failed to load hackathon:', err);
        if (isActive) {
          setError(err instanceof Error ? err.message : 'Failed to load hackathon details');
        }
      } finally {
        if (isActive) setLoading(false);
      }
    }
    loadData();
    return () => { isActive = false; };
  }, [id]);

  useEffect(() => {
    const handleScroll = () => {
      setShowStickyBar(window.scrollY > 400);
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

  // ─── 1. LOADING STATE ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#060816] text-[#F6F8FC] flex flex-col selection:bg-purple-600 selection:text-white">
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto w-full p-6 pt-24 space-y-8 animate-pulse">
          <div className="w-full h-80 bg-slate-900/80 rounded-3xl shimmer border border-purple-900/20" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 h-28 bg-slate-900/80 rounded-2xl shimmer border border-purple-900/20" />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
            <div className="h-96 bg-slate-900/80 rounded-3xl shimmer border border-purple-900/20" />
            <div className="h-96 bg-slate-900/80 rounded-3xl shimmer border border-purple-900/20" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ─── 2. ERROR STATE ──────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-[#060816] text-[#F6F8FC] flex flex-col selection:bg-purple-600 selection:text-white">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6 text-center pt-24">
          <div className="glass-card p-10 rounded-3xl max-w-md space-y-5 border border-rose-500/30">
            <div className="w-16 h-16 rounded-2xl bg-rose-950/80 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto shadow-lg">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">Unable to Load Hackathon</h2>
              <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-600 transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
              <Link href="/" className="py-2.5 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition-all">
                Back to Discover
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ─── 3. NOT FOUND STATE ──────────────────────────────────────────────
  if (!hackathon) {
    return (
      <div className="min-h-screen bg-[#060816] text-[#F6F8FC] flex flex-col selection:bg-purple-600 selection:text-white">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6 text-center pt-24">
          <div className="glass-card p-12 rounded-3xl max-w-md space-y-4 border border-purple-900/30">
            <div className="w-16 h-16 rounded-2xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-400 mx-auto shadow-lg">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white">Hackathon Not Found</h2>
            <p className="text-xs text-slate-400">The event you are looking for may have been moved or is no longer listed.</p>
            <Link href="/" className="inline-block py-3 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition-all">
              Back to Discover
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const coverUrl = (imgError || !hackathon.coverImageUrl) ? DEFAULT_HACKATHON_COVER : hackathon.coverImageUrl;

  // ─── 4. SUCCESSFUL DETAIL PAGE ───────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#060816] text-[#F6F8FC] flex flex-col selection:bg-purple-600 selection:text-white">
      <Navbar />

      {/* DESKTOP SCROLL-TRIGGERED STICKY ACTION BAR */}
      <div
        className={`fixed top-0 left-0 right-0 z-40 bg-[#0D1224]/95 backdrop-blur-xl border-b border-purple-900/40 py-3.5 px-6 transition-all duration-300 flex items-center justify-between shadow-2xl ${
          showStickyBar ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3 truncate max-w-xl">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <h4 className="text-sm font-bold text-white truncate">{hackathon.title}</h4>
          <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-500/30">
            {hackathon.prizeDisplay}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={toggleSave}
            title={isSaved ? 'Saved to bookmarks' : 'Save hackathon'}
            className="p-2.5 rounded-xl glass-card text-slate-300 hover:text-white border border-purple-900/40 transition-colors"
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-purple-400 text-purple-400' : ''}`} />
          </button>
          <button
            onClick={handleShare}
            title="Share hackathon"
            className="p-2.5 rounded-xl glass-card text-slate-300 hover:text-white border border-purple-900/40 transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <a
            href={hackathon.registerUrl}
            target={hackathon.hasValidRegisterUrl ? '_blank' : '_self'}
            rel={hackathon.hasValidRegisterUrl ? 'noopener noreferrer' : undefined}
            className="py-2 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5"
          >
            <span>Register Now</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <main className="flex-1 pb-16">
        {/* HERO SECTION */}
        <section className="relative w-full min-h-[420px] sm:min-h-[500px] bg-slate-950 overflow-hidden pt-20 flex flex-col justify-end">
          <div className="absolute inset-0 z-0">
            <Image
              src={coverUrl}
              alt={hackathon.title}
              fill
              onError={() => setImgError(true)}
              className="object-cover opacity-40 filter blur-[1px]"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#060816] via-[#060816]/75 to-[#060816]/30" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto p-6 sm:p-8 w-full space-y-4">
            {/* BREADCRUMB */}
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-purple-300 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Discover
            </Link>

            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 backdrop-blur-md flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {hackathon.deadlineStatus.isPast ? 'Event Ended' : 'Registration Open'}
              </span>

              {hackathon.isVerified && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-950/90 text-purple-300 border border-purple-500/40 backdrop-blur-md flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> Verified Event
                </span>
              )}

              {hackathon.isFeatured && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-950/90 text-amber-300 border border-amber-500/40 backdrop-blur-md flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-400" /> Featured
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight max-w-4xl">
              {hackathon.title}
            </h1>

            {hackathon.tagline && (
              <p className="text-base sm:text-lg text-purple-200/90 max-w-3xl font-medium">
                {hackathon.tagline}
              </p>
            )}

            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl">
              Hosted by <span className="font-bold text-white">{hackathon.organizer}</span>
              {hackathon.organization ? ` • ${hackathon.organization}` : ''}
            </p>
          </div>
        </section>

        {/* QUICK FACTS BAR */}
        <section className="max-w-7xl mx-auto px-6 -mt-4 relative z-20">
          <div className="glass-card p-6 rounded-3xl border border-purple-900/40 shadow-2xl grid grid-cols-2 sm:grid-cols-4 gap-6 bg-[#0D1224]/90 backdrop-blur-2xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <Calendar className="w-4 h-4 text-purple-400" /> Dates
              </div>
              <p className="text-sm font-bold text-white truncate">{hackathon.formattedDates}</p>
              <span className="text-[11px] font-semibold text-emerald-400 block">
                {hackathon.deadlineStatus.label}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-cyan-400" /> Location
              </div>
              <p className="text-sm font-bold text-white truncate">{hackathon.locationDisplay}</p>
              <span className="text-[11px] font-semibold text-slate-400 block truncate">
                {hackathon.venueDisplay}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <Trophy className="w-4 h-4 text-amber-400" /> Prize Pool
              </div>
              <p className="text-sm font-black text-amber-300 font-mono truncate">{hackathon.prizeDisplay}</p>
              <span className="text-[11px] font-semibold text-emerald-400 block">
                Registration: {hackathon.registrationFee}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <Users className="w-4 h-4 text-emerald-400" /> Team Size
              </div>
              <p className="text-sm font-bold text-white truncate">{hackathon.teamSizeDisplay}</p>
              <span className="text-[11px] font-semibold text-purple-300 block">
                {hackathon.soloAllowed ? 'Solo / Team' : 'Team Only'}
              </span>
            </div>
          </div>
        </section>

        {/* MAIN DETAIL GRID */}
        <section className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          {/* LEFT COLUMN: MAIN CONTENT */}
          <div className="space-y-8">
            {/* ABOUT SECTION */}
            <div className="glass-card p-8 rounded-3xl border border-purple-900/30 space-y-4">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <span>About this Hackathon</span>
              </h2>
              <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line space-y-3">
                {hackathon.description}
              </div>
            </div>

            {/* TRACKS & TECH STACK */}
            {hackathon.tags.length > 0 && (
              <div className="glass-card p-8 rounded-3xl border border-purple-900/30 space-y-4">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <span>🛠 Tracks & Focus Areas</span>
                </h2>
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {hackathon.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-purple-950/80 text-purple-200 border border-purple-500/30 shadow-sm"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* PRIZE BREAKDOWN */}
            <div className="glass-card p-8 rounded-3xl border border-purple-900/30 space-y-5">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span>Prizes & Awards</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl glass-card border border-amber-500/30 text-center space-y-1 bg-amber-950/20">
                  <span className="text-2xl">🥇</span>
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">Total Pool</h4>
                  <p className="text-xl font-black text-white font-mono">{hackathon.prizeDisplay}</p>
                </div>
                <div className="p-5 rounded-2xl glass-card border border-slate-400/30 text-center space-y-1 bg-slate-900/40">
                  <span className="text-2xl">📜</span>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Certificate</h4>
                  <p className="text-sm font-bold text-white mt-1">
                    {hackathon.hasCertificate ? 'Certificate of Participation' : 'Winners Certificate'}
                  </p>
                </div>
                <div className="p-5 rounded-2xl glass-card border border-purple-500/30 text-center space-y-1 bg-purple-950/20">
                  <span className="text-2xl">💼</span>
                  <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider">Opportunities</h4>
                  <p className="text-sm font-bold text-white mt-1">
                    {hackathon.isHiring ? 'Hiring & Interviews' : 'Mentorship & Network'}
                  </p>
                </div>
              </div>
            </div>

            {/* ELIGIBILITY & RULES */}
            <div className="glass-card p-8 rounded-3xl border border-purple-900/30 space-y-4">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Eligibility & Guidelines</span>
              </h2>
              <div className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-4 rounded-2xl border border-purple-900/20">
                {hackathon.eligibility}
              </div>
            </div>

            {/* EVENT TIMELINE */}
            <div className="glass-card p-8 rounded-3xl border border-purple-900/30 space-y-6">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-400" />
                <span>Event Milestones</span>
              </h2>

              <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-purple-900/40">
                <div className="flex items-start gap-4 pl-8 relative">
                  <div className="absolute left-1.5 top-1 w-3.5 h-3.5 rounded-full border-2 bg-purple-600 border-purple-400" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Event Announcement</h4>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">Registration Opened</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 pl-8 relative">
                  <div className={`absolute left-1.5 top-1 w-3.5 h-3.5 rounded-full border-2 ${
                    hackathon.deadlineStatus.isPast ? 'bg-purple-600 border-purple-400' : 'bg-emerald-400 border-white animate-pulse'
                  }`} />
                  <div>
                    <h4 className="text-sm font-bold text-white">Registration Deadline</h4>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">{hackathon.formattedDeadline}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 pl-8 relative">
                  <div className="absolute left-1.5 top-1 w-3.5 h-3.5 rounded-full border-2 bg-slate-900 border-slate-700" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Hackathon Period</h4>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">{hackathon.formattedDates}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* REVIEWS & COMMUNITY RATINGS */}
            <div className="glass-card p-8 rounded-3xl border border-purple-900/30 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <span>Community Ratings</span>
                </h2>
                <span className="text-xs font-bold text-slate-400">
                  {hackathon.formattedRating} / 5.0 ({hackathon.formattedReviewCount} reviews)
                </span>
              </div>

              <div className="p-5 rounded-2xl glass-card border border-purple-900/20 flex items-center gap-5">
                <div className="text-4xl font-black text-amber-300 font-mono">{hackathon.formattedRating}</div>
                <div className="space-y-1">
                  <div className="flex text-amber-400 gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">Verified participant feedback score</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: SIDEBAR CTAs */}
          <div className="space-y-6">
            <div className="glass-card p-6 rounded-3xl border border-purple-500/40 space-y-6 shadow-2xl sticky top-24 bg-[#0D1224]/90 backdrop-blur-2xl">
              {/* COUNTDOWN */}
              <div className="space-y-2 text-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Registration Closes In
                </span>
                <CountdownTimer targetDate={hackathon.registrationDeadline || hackathon.startDate} />
              </div>

              {/* REGISTER CTA BUTTON */}
              <a
                href={hackathon.registerUrl}
                target={hackathon.hasValidRegisterUrl ? '_blank' : '_self'}
                rel={hackathon.hasValidRegisterUrl ? 'noopener noreferrer' : undefined}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-purple-950/50 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <span>Register Now</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              {/* ACTION BUTTONS GRID */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={toggleSave}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isSaved
                      ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                      : 'glass-card border-purple-900/30 text-slate-300 hover:text-white'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-purple-400 text-purple-400' : ''}`} />
                  <span>{isSaved ? 'Saved' : 'Save'}</span>
                </button>

                <button
                  onClick={handleShare}
                  className="p-3 rounded-xl glass-card border border-purple-900/30 text-xs font-bold text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{copied ? 'Copied!' : 'Share'}</span>
                </button>
              </div>

              {/* ORGANIZER MINI CARD */}
              <div className="pt-4 border-t border-purple-900/30 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-500/40 flex items-center justify-center text-purple-300 font-black text-sm">
                    {hackathon.organizerInitial}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{hackathon.organizer}</h4>
                    <span className="text-[10px] text-cyan-400 font-semibold">Organizer</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsFollowing(prev => !prev)}
                  className={`w-full py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    isFollowing
                      ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                      : 'glass-card border-purple-900/30 text-slate-300 hover:text-white'
                  }`}
                >
                  {isFollowing ? '✓ Following Organizer' : '+ Follow Organizer'}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* MOBILE STICKY BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden glass-card border-t border-purple-900/40 p-4 flex items-center justify-between bg-[#060816]/95 backdrop-blur-2xl shadow-2xl">
        <div>
          <span className="text-xs font-black text-amber-300 font-mono">
            {hackathon.prizeDisplay}
          </span>
          <p className="text-[10px] text-slate-400">Registration: {hackathon.registrationFee}</p>
        </div>
        <a
          href={hackathon.registerUrl}
          target={hackathon.hasValidRegisterUrl ? '_blank' : '_self'}
          rel={hackathon.hasValidRegisterUrl ? 'noopener noreferrer' : undefined}
          className="py-3 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/40 transition-all flex items-center gap-1.5"
        >
          <span>Register Now</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <Footer />
    </div>
  );
}
