'use client';

import React from 'react';
import Link from 'next/link';
import { HackathonDetailDTO } from '@/lib/domain/dtos/hackathon.dto';
import { ShieldCheck, Globe, MapPin } from 'lucide-react';

interface HackathonHeroProps {
  hackathon: HackathonDetailDTO;
}

export function HackathonHero({ hackathon }: HackathonHeroProps) {
  return (
    <div className="relative rounded-3xl overflow-hidden glass-card border border-purple-500/30 shadow-2xl">
      <div className="h-64 sm:h-80 w-full relative">
        <img
          src={hackathon.coverImageUrl || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80'}
          alt={hackathon.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060816] via-[#060816]/70 to-transparent" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-500/40">
            ● Approved
          </span>
          {hackathon.isVerified && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-950/90 text-purple-300 border border-purple-500/40 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Verified Organizer
            </span>
          )}
          {hackathon.isOnline ? (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" /> Online Event
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-950/90 text-amber-300 border border-amber-500/40 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {hackathon.locationCity || 'In-Person'}
            </span>
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight drop-shadow-md">
          {hackathon.title}
        </h1>

        {hackathon.tagline && (
          <p className="text-base sm:text-lg text-slate-300 max-w-3xl font-medium">
            {hackathon.tagline}
          </p>
        )}

        <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-slate-300 pt-1">
          <span>Organized by <strong className="text-white">{hackathon.organizerName}</strong></span>
          {hackathon.organizerProfile && (
            <Link
              href={`/organizers/${hackathon.organizerProfile.slug}`}
              className="text-purple-400 hover:text-purple-300 underline font-bold"
            >
              View Profile →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
