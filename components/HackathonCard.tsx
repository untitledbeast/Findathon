'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Hackathon } from '@/lib/supabase';
import { formatDateRange, getSafeImageUrl, DEFAULT_HACKATHON_COVER } from '@/lib/utils/formatters';
import { Calendar, MapPin, Globe, Bookmark, ExternalLink, Sparkles, Building2, X, Star } from 'lucide-react';
import { useEventTracker } from '@/lib/recommendation/use-event-tracker';

export interface HackathonCardProps {
  hackathon: Hackathon;
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
  // Recommendation Engine V2 optional props
  match_score?: number;
  recommendation_reason?: string;
  confidence?: 'very_high' | 'high' | 'medium' | 'low' | string;
  was_recommended?: boolean;
  position?: number;
  on_dismiss?: () => void;
}

export default function HackathonCard({
  hackathon,
  isSaved = false,
  onToggleSave,
  match_score,
  recommendation_reason,
  confidence,
  was_recommended,
  position,
  on_dismiss,
}: HackathonCardProps) {
  const [saved, setSaved] = useState(isSaved);
  const [imgError, setImgError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { track } = useEventTracker();

  // Track viewport impression if card is a recommendation
  useEffect(() => {
    if (!was_recommended) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          track(hackathon.id, 'view', { position, wasRecommended: was_recommended, score: match_score });
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }
    return () => observer.disconnect();
  }, [hackathon.id, position, was_recommended, match_score, track]);

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newSaved = !saved;
    setSaved(newSaved);
    track(hackathon.id, newSaved ? 'save' : 'unsave', {
      position,
      wasRecommended: was_recommended,
      score: match_score,
    });
    if (onToggleSave) {
      onToggleSave(hackathon.id);
    }
  };

  const coverUrl = imgError
    ? DEFAULT_HACKATHON_COVER
    : getSafeImageUrl(hackathon.cover_image_url);

  const getPlatformSource = () => {
    if (hackathon.source && hackathon.source !== 'Manual' && hackathon.source !== 'Community') {
      return hackathon.source;
    }
    const url = (hackathon.register_url || '').toLowerCase();
    if (url.includes('devfolio.co')) return 'Devfolio';
    if (url.includes('unstop.com')) return 'Unstop';
    if (url.includes('devpost.com')) return 'Devpost';
    if (url.includes('mlh.io')) return 'MLH';
    if (url.includes('lu.ma') || url.includes('luma')) return 'Luma';
    if (url.includes('eventbrite')) return 'Eventbrite';
    if (url.includes('hackalist')) return 'Hackalist';
    return null;
  };
  const platformSource = getPlatformSource();

  return (
    <div
      ref={cardRef}
      className="group relative flex flex-col rounded-2xl bg-slate-900/80 border border-purple-900/30 hover:border-purple-500/60 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_12px_35px_-10px_rgba(124,58,237,0.3)] overflow-hidden"
    >
      {/* Dismiss Button (for recommended items, top-right overlay on hover) */}
      {on_dismiss && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            track(hackathon.id, 'dismiss', { position, wasRecommended: was_recommended, score: match_score });
            on_dismiss();
          }}
          title="Not interested (Hide)"
          className="absolute top-2 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 rounded-full bg-slate-950/80 hover:bg-red-950/90 text-slate-400 hover:text-red-400 border border-slate-700/60 hover:border-red-500/50 backdrop-blur-md shadow-lg"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Cover Image Container */}
      <div className="relative w-full h-48 overflow-hidden bg-slate-950">
        <Image
          src={coverUrl}
          alt={hackathon.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onError={() => setImgError(true)}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Online / Offline badge */}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md border ${
              hackathon.is_online 
                ? 'bg-purple-950/80 text-purple-300 border-purple-500/40' 
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
            }`}>
              {hackathon.is_online ? <Globe className="w-3.5 h-3.5 text-purple-400" /> : <MapPin className="w-3.5 h-3.5 text-emerald-400" />}
              {hackathon.is_online ? 'Online Event' : 'In-Person'}
            </span>
            {/* Source Attribution Badge */}
            {platformSource && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide backdrop-blur-md bg-indigo-950/90 text-indigo-200 border border-indigo-500/50 shadow-sm">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                Source: {platformSource}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Match Score Badge (if recommended) */}
            {typeof match_score === 'number' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-purple-950/90 text-purple-300 border border-purple-500/50 shadow-sm backdrop-blur-md">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                {match_score}% Match
              </span>
            )}

            {/* Bookmark Button */}
            <button
              onClick={handleSave}
              title={saved ? 'Remove bookmark' : 'Save hackathon'}
              className={`p-2 rounded-full backdrop-blur-md transition-all duration-200 border ${
                saved 
                  ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_12px_rgba(124,58,237,0.5)]' 
                  : 'bg-slate-900/70 text-slate-300 hover:text-purple-300 border-purple-900/40 hover:bg-purple-950/80'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Status Badge */}
        {hackathon.status && (
          <div className="absolute bottom-3 left-3 z-10">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] uppercase tracking-wider font-bold ${
              hackathon.status === 'pending'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-purple-500/20 text-purple-200 border border-purple-500/30'
            }`}>
              <Sparkles className="w-3 h-3" />
              {hackathon.status}
            </span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="flex flex-col flex-1 p-5 space-y-4">
        
        {/* Organizer */}
        <div className="text-xs font-medium text-purple-400 tracking-wide uppercase flex items-center gap-1">
          <Building2 className="w-3.5 h-3.5" />
          <span className="truncate">{hackathon.organizer || 'Community Host'}</span>
        </div>

        {/* Title */}
        <Link href={`/hackathons/${hackathon.id}`}>
          <h3 className="text-lg font-bold text-slate-100 group-hover:text-purple-300 transition-colors duration-200 line-clamp-2 leading-snug">
            {hackathon.title}
          </h3>
        </Link>

        {/* Recommendation Reason Chip & Confidence (if present) */}
        {(recommendation_reason || confidence) && (
          <div className="flex flex-col gap-1.5 pt-0.5">
            {recommendation_reason && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-purple-950/70 text-purple-300 border border-purple-700/40 w-fit max-w-full">
                <Sparkles className="w-3 h-3 text-purple-400 shrink-0" />
                <span className="truncate">{recommendation_reason}</span>
              </div>
            )}
            {confidence && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  {confidence === 'very_high' ? '⭐ Very High Fit' : confidence === 'high' ? 'Strong Match' : confidence === 'medium' ? 'Good Match' : 'Potential Match'}
                </span>
                <div className="flex items-center gap-0.5 ml-1">
                  {[1, 2, 3, 4].map((dot) => {
                    const active =
                      (confidence === 'very_high' && dot <= 4) ||
                      (confidence === 'high' && dot <= 3) ||
                      (confidence === 'medium' && dot <= 2) ||
                      (confidence === 'low' && dot <= 1);
                    return (
                      <span
                        key={dot}
                        className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-purple-400' : 'bg-slate-700'}`}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Date & Location Info */}
        <div className="space-y-2 text-xs text-slate-300/90 pt-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-400 shrink-0" />
            <span>
              {formatDateRange(hackathon.start_date, hackathon.end_date)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="truncate">
              {hackathon.is_online
                ? 'Worldwide (Online)'
                : `${hackathon.location_city || 'City TBD'}${hackathon.location_college ? ` • ${hackathon.location_college}` : ''}`}
            </span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 pt-2">
          {hackathon.tags && hackathon.tags.slice(0, 4).map((tag, idx) => (
            <span
              key={idx}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-purple-950/60 text-purple-300 border border-purple-800/40"
            >
              #{tag}
            </span>
          ))}
          {hackathon.tags && hackathon.tags.length > 4 && (
            <span className="px-2 py-1 rounded-md text-[11px] font-medium bg-slate-800 text-slate-400">
              +{hackathon.tags.length - 4} more
            </span>
          )}
        </div>

        {/* Actions Footer */}
        <div className="pt-4 mt-auto border-t border-purple-900/20 flex items-center justify-between gap-3">
          <Link
            href={`/hackathons/${hackathon.id}`}
            className="text-xs font-semibold text-purple-300 hover:text-purple-200 underline-offset-4 hover:underline"
          >
            View Details
          </Link>

          <a
            href={hackathon.register_url || `/hackathons/${hackathon.id}`}
            onClick={() => {
              track(hackathon.id, 'register_click', {
                position,
                wasRecommended: was_recommended,
                score: match_score,
              });
            }}
            target={hackathon.register_url?.startsWith('http') ? '_blank' : '_self'}
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-900/30 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            Register
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

      </div>
    </div>
  );
}
