'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/lib/auth-context';
import { useAuthModal } from '@/components/AuthModal';
import { useHackathonDetail } from '@/hooks/useHackathonDetail';
import { useBookmark } from '@/hooks/useBookmark';
import { useCompareStore } from '@/lib/stores/compare-store';
import { MetadataService } from '@/lib/services/metadata.service';
import { HackathonHero } from '@/components/hackathon-detail/HackathonHero';
import { QuickFacts } from '@/components/hackathon-detail/QuickFacts';
import { AboutSection } from '@/components/hackathon-detail/AboutSection';
import { PrizeSection } from '@/components/hackathon-detail/PrizeSection';
import { TimelineSection } from '@/components/hackathon-detail/TimelineSection';
import { RequirementsSection } from '@/components/hackathon-detail/RequirementsSection';
import { GallerySection } from '@/components/hackathon-detail/GallerySection';
import { ReviewSection } from '@/components/hackathon-detail/ReviewSection';
import { FAQSection } from '@/components/hackathon-detail/FAQSection';
import { RelatedSection } from '@/components/hackathon-detail/RelatedSection';
import { CountdownCard } from '@/components/hackathon-detail/CountdownCard';
import { OrganizerCard } from '@/components/hackathon-detail/OrganizerCard';
import { ContactCard } from '@/components/hackathon-detail/ContactCard';

import {
  Bookmark,
  Share2,
  Scale,
  MapPin,
  X
} from 'lucide-react';

export default function HackathonDetailPage() {
  const params = useParams();
  const id = (params?.id as string) || '';

  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { data: hackathon, loading, error } = useHackathonDetail(id);
  const { isSaved, toggle: toggleSave } = useBookmark(id);
  const { compareIds, toggleCompare } = useCompareStore();

  const [copied, setCopied] = useState(false);
  const [cityFollowed, setCityFollowed] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: hackathon?.title || 'Findathon Hackathon',
          url
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleFollowCity = () => {
    if (!user) {
      openAuthModal();
      return;
    }
    setCityFollowed(prev => !prev);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060816] text-[#F6F8FC]">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 pt-28 pb-16 space-y-8">
          <div className="h-8 w-48 bg-slate-900 rounded-xl animate-pulse" />
          <div className="h-80 w-full bg-slate-900 rounded-3xl animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-slate-900 rounded-2xl animate-pulse" />
              <div className="h-48 bg-slate-900 rounded-2xl animate-pulse" />
            </div>
            <div className="h-96 bg-slate-900 rounded-2xl animate-pulse" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !hackathon) {
    return (
      <div className="min-h-screen bg-[#060816] text-[#F6F8FC] flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-950/80 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <X className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white">Hackathon Not Found</h2>
          <p className="text-sm text-slate-400 max-w-md">
            The hackathon event you are looking for may have been moved, removed, or is private.
          </p>
          <Link
            href="/"
            className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg transition-all"
          >
            Explore All Hackathons
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const mainTag = hackathon.tags?.[0] || 'General';
  const isCompared = compareIds.includes(hackathon.id);
  const jsonLd = MetadataService.generateJsonLd(hackathon);

  return (
    <div className="min-h-screen flex flex-col bg-[#060816] text-[#F6F8FC] selection:bg-purple-600 selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 space-y-8">

        {/* BREADCRUMB */}
        <nav className="flex items-center gap-2 text-xs font-bold text-slate-400">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <span className="text-slate-600">/</span>
          <Link href={`/categories/${mainTag.toLowerCase()}`} className="hover:text-white transition-colors">{mainTag}</Link>
          <span className="text-slate-600">/</span>
          <span className="text-purple-300 truncate max-w-xs">{hackathon.title}</span>
        </nav>

        {/* SECTION 1: HERO */}
        <HackathonHero hackathon={hackathon} />

        {/* SECTION 2: QUICK FACTS BAR */}
        <QuickFacts hackathon={hackathon} />

        {/* SECTION 3: TWO-COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-8">
            <AboutSection description={hackathon.description} />

            <PrizeSection
              prizePool={hackathon.prizePool}
              prizeAmount={hackathon.prizeAmount}
              prizeBreakdown={hackathon.prizeBreakdown}
            />

            <TimelineSection
              timeline={hackathon.timeline}
              registrationDeadline={hackathon.registrationDeadline}
              startDate={hackathon.startDate}
            />

            <RequirementsSection hackathon={hackathon} />

            <GallerySection media={hackathon.media} />

            <ReviewSection
              hackathonId={hackathon.id}
              initialReviews={hackathon.reviews}
              avgRating={hackathon.avgRating}
            />

            <FAQSection faq={hackathon.faq} />

            <RelatedSection related={hackathon.related} />
          </div>

          {/* RIGHT STICKY SIDEBAR */}
          <div className="space-y-6 lg:sticky lg:top-24">
            <CountdownCard hackathon={hackathon} />

            {/* ACTION BUTTONS GRID */}
            <div className="glass-card rounded-2xl p-4 border border-purple-900/30 grid grid-cols-2 gap-2">
              <button
                onClick={toggleSave}
                className={`p-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all ${
                  isSaved
                    ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                    : 'glass-card text-slate-300 border-purple-900/30 hover:text-white'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-white' : ''}`} /> {isSaved ? 'Saved' : 'Save'}
              </button>

              <button
                onClick={handleShare}
                className="p-3 rounded-xl text-xs font-bold glass-card text-slate-300 border border-purple-900/30 hover:text-white flex items-center justify-center gap-2 transition-all"
              >
                <Share2 className="w-4 h-4 text-cyan-400" /> {copied ? 'Copied!' : 'Share'}
              </button>

              <button
                onClick={() => toggleCompare(hackathon.id)}
                className={`p-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all ${
                  isCompared
                    ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                    : 'glass-card text-slate-300 border-purple-900/30 hover:text-white'
                }`}
              >
                <Scale className="w-4 h-4 text-purple-400" /> {isCompared ? 'Comparing' : 'Compare'}
              </button>

              <button
                onClick={handleFollowCity}
                className={`p-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all ${
                  cityFollowed
                    ? 'bg-emerald-600 text-white border-emerald-400'
                    : 'glass-card text-slate-300 border-purple-900/30 hover:text-white'
                }`}
              >
                <MapPin className="w-4 h-4 text-amber-400" /> {cityFollowed ? 'Following' : 'Follow City'}
              </button>
            </div>

            <OrganizerCard hackathon={hackathon} />

            <ContactCard
              contactEmail={hackathon.organizerProfile?.slug}
              contactPhone={undefined}
            />
          </div>

        </div>

      </main>

      {/* MOBILE STICKY BOTTOM BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 glass-card border-t border-purple-500/30 bg-[#060816]/90 backdrop-blur-md z-40 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black text-amber-300">{hackathon.prizePool || 'Swag & Certificates'}</p>
          <p className="text-[10px] text-slate-400 font-mono">
            {hackathon.isOnline ? 'Online' : (hackathon.locationCity || 'In-Person')}
          </p>
        </div>
        <a
          href={hackathon.registerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg"
        >
          Register Now ↗
        </a>
      </div>

      <Footer />
    </div>
  );
}
