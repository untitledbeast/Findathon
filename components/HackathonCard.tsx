'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Hackathon } from '@/lib/supabase';
import { Calendar, MapPin, Globe, Bookmark, ExternalLink, Sparkles, Building2 } from 'lucide-react';

interface HackathonCardProps {
  hackathon: Hackathon;
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
}

export default function HackathonCard({ hackathon, isSaved = false, onToggleSave }: HackathonCardProps) {
  const [saved, setSaved] = useState(isSaved);
  const [imgError, setImgError] = useState(false);

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newSaved = !saved;
    setSaved(newSaved);
    if (onToggleSave) {
      onToggleSave(hackathon.id);
    }
  };

  // Date formatting helper
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const defaultCover = 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1000&auto=format&fit=crop';
  const coverUrl = (imgError || !hackathon.cover_image_url) ? defaultCover : hackathon.cover_image_url;

  return (
    <div className="group relative flex flex-col rounded-2xl bg-slate-900/80 border border-purple-900/30 hover:border-purple-500/60 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_12px_35px_-10px_rgba(124,58,237,0.3)] overflow-hidden">
      
      {/* Cover Image Container */}
      <div className="relative w-full h-48 overflow-hidden bg-slate-950">
        <img
          src={coverUrl}
          alt={hackathon.title}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          {/* Online / Offline badge */}
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md border ${
            hackathon.is_online 
              ? 'bg-purple-950/80 text-purple-300 border-purple-500/40' 
              : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
          }`}>
            {hackathon.is_online ? <Globe className="w-3.5 h-3.5 text-purple-400" /> : <MapPin className="w-3.5 h-3.5 text-emerald-400" />}
            {hackathon.is_online ? 'Online Event' : 'In-Person'}
          </span>

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

        {/* Date & Location Info */}
        <div className="space-y-2 text-xs text-slate-300/90 pt-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-400 shrink-0" />
            <span>
              {formatDate(hackathon.start_date)} — {formatDate(hackathon.end_date)}
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
