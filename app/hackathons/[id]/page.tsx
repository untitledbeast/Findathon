'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CountdownTimer from '@/components/CountdownTimer';
import { useAuth } from '@/lib/auth-context';
import { useAuthModal } from '@/components/AuthModal';
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
  Clock,
  Navigation,
  Mail,
  Phone,
  MessageSquare,
  UserCheck,
  DollarSign
} from 'lucide-react';

function TwitterIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedinIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.74a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2z" />
    </svg>
  );
}

export default function HackathonDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();

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

      // Check local saved state
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
      } catch (e) {}
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
    if (!user) {
      openAuthModal();
      return;
    }

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

  const formatDate = (dateStr?: string | null) => {
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
  const deadlineDate = hackathon.registration_deadline || hackathon.start_date;

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
            <div className="space-y-2 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md border ${
                  hackathon.is_online
                    ? 'bg-purple-950/80 text-purple-300 border-purple-500/40'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                }`}>
                  {hackathon.is_online ? <Globe className="w-3.5 h-3.5 text-purple-400" /> : <MapPin className="w-3.5 h-3.5 text-emerald-400" />}
                  {hackathon.mode || (hackathon.is_online ? 'Online' : 'In-Person')}
                </span>

                {hackathon.prize_pool && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/40 backdrop-blur-md">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    Prize Pool: {hackathon.prize_pool}
                  </span>
                )}

                {hackathon.registration_fee && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-900/80 text-slate-300 border border-purple-900/40 backdrop-blur-md">
                    <DollarSign className="w-3.5 h-3.5 text-purple-400" />
                    {hackathon.registration_fee === 'Free' ? 'Free Entry' : hackathon.registration_fee_amount || 'Paid Entry'}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                {hackathon.title}
              </h1>

              {hackathon.tagline && (
                <p className="text-sm text-purple-200/90 font-medium italic">{hackathon.tagline}</p>
              )}

              <div className="flex items-center gap-2 text-xs sm:text-sm text-purple-300 font-medium pt-1">
                <Building2 className="w-4 h-4 text-purple-400" />
                <span>Hosted by {hackathon.organizer || hackathon.organization || 'Community Host'}</span>
              </div>
            </div>

            {/* Quick Actions */}
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

        {/* MAIN LAYOUT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT CONTENT COLUMN */}
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

            {/* TEAM & ELIGIBILITY REQUIREMENTS */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-purple-900/30 space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Team & Eligibility Guidelines
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-purple-900/20 space-y-1">
                  <span className="text-purple-400 font-semibold uppercase text-[11px]">Team Size Allowed</span>
                  <p className="text-white font-bold">
                    {hackathon.min_team_size || 1} to {hackathon.max_team_size || 4} Members
                    {hackathon.solo_allowed ? ' (Solo builders welcome)' : ''}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-purple-900/20 space-y-1">
                  <span className="text-purple-400 font-semibold uppercase text-[11px]">Eligibility Criteria</span>
                  <p className="text-white font-bold">
                    {Array.isArray(hackathon.eligibility)
                      ? hackathon.eligibility.join(', ')
                      : hackathon.eligibility || 'Open to All'}
                  </p>
                </div>
              </div>

              {hackathon.requirements && (
                <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-800/40 text-xs text-purple-200">
                  <span className="font-bold block text-purple-300 mb-1">Additional Requirements:</span>
                  <p className="leading-relaxed">{hackathon.requirements}</p>
                </div>
              )}
            </div>

            {/* VENUE & MAP DIRECTIONS */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-purple-900/30 space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-purple-400" />
                Venue & Address Details
              </h2>

              <div className="space-y-3 text-sm">
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-purple-900/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-purple-400 font-bold uppercase">Location</span>
                    <span className="text-xs font-semibold text-slate-300">
                      {hackathon.is_online ? 'Worldwide Virtual' : hackathon.location_city || 'On-Campus'}
                    </span>
                  </div>
                  <p className="text-white font-bold">{hackathon.location_college || (hackathon.is_online ? 'Discord & Devpost Portal' : 'Main Campus')}</p>

                  {hackathon.full_address && (
                    <p className="text-xs text-slate-400 pt-1 border-t border-purple-900/20">{hackathon.full_address}</p>
                  )}
                </div>

                {hackathon.full_address && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hackathon.full_address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-purple-300 border border-purple-900/40 transition-colors"
                  >
                    <Navigation className="w-4 h-4 text-purple-400" />
                    <span>Get Directions on Google Maps</span>
                  </a>
                )}
              </div>
            </div>

            {/* ORGANIZER CONTACT SECTION */}
            {(hackathon.contact_name || hackathon.contact_email || hackathon.contact_phone) && (
              <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-purple-900/30 space-y-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-purple-400" />
                  Organizer Contact & Support
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                  {hackathon.contact_name && (
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-purple-900/20 space-y-1">
                      <span className="text-xs text-purple-400 font-semibold uppercase">Contact Person</span>
                      <p className="text-white font-bold">{hackathon.contact_name}</p>
                    </div>
                  )}

                  {hackathon.contact_email && (
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-purple-900/20 space-y-1">
                      <span className="text-xs text-purple-400 font-semibold uppercase">Official Email</span>
                      <a href={`mailto:${hackathon.contact_email}`} className="text-purple-300 font-bold hover:underline block truncate">
                        {hackathon.contact_email}
                      </a>
                    </div>
                  )}

                  {hackathon.contact_phone && (
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-purple-900/20 space-y-1 sm:col-span-2">
                      <span className="text-xs text-purple-400 font-semibold uppercase">Phone / WhatsApp</span>
                      <div className="flex items-center gap-4 pt-1">
                        <a href={`tel:${hackathon.contact_phone}`} className="text-white font-bold hover:underline">
                          {hackathon.contact_phone}
                        </a>
                        <a
                          href={`https://wa.me/${hackathon.contact_phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                        >
                          Chat on WhatsApp
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Social query links */}
                <div className="flex flex-wrap gap-3 pt-2">
                  {hackathon.social_twitter && (
                    <a href={`https://twitter.com/${hackathon.social_twitter}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 text-xs font-semibold text-slate-300 border border-purple-900/30">
                      <TwitterIcon className="w-3.5 h-3.5 text-purple-400" />
                      @{hackathon.social_twitter}
                    </a>
                  )}
                  {hackathon.social_linkedin && (
                    <a href={hackathon.social_linkedin.startsWith('http') ? hackathon.social_linkedin : `https://${hackathon.social_linkedin}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 text-xs font-semibold text-slate-300 border border-purple-900/30">
                      <LinkedinIcon className="w-3.5 h-3.5 text-purple-400" />
                      LinkedIn
                    </a>
                  )}
                  {hackathon.social_discord && (
                    <a href={hackathon.social_discord.startsWith('http') ? hackathon.social_discord : `https://discord.gg/${hackathon.social_discord}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 text-xs font-semibold text-slate-300 border border-purple-900/30">
                      <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                      Discord Server
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Tags */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-purple-900/30 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400">Categories & Tech Stack</h3>
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

          </div>

          {/* RIGHT SIDEBAR COLUMN */}
          <div className="space-y-6">
            
            {/* COUNTDOWN TIMER */}
            <CountdownTimer
              targetDate={deadlineDate}
              label={hackathon.registration_deadline ? 'Registration Deadline' : 'Event Start'}
            />

            {/* REGISTER NOW CTA */}
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
                <span>Verified Official Registration Link</span>
              </div>
            </div>

            {/* EVENT TIMELINE CARD */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-purple-900/30 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-purple-900/20">
                <span className="text-slate-400">Reg. Deadline</span>
                <span className="font-bold text-amber-300">{formatDate(hackathon.registration_deadline || hackathon.start_date)}</span>
              </div>
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
                <span className="font-bold text-purple-300">{hackathon.organizer || 'Host'}</span>
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
