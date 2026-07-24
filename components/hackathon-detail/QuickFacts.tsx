'use client';

import React from 'react';
import { HackathonDetailDTO } from '@/lib/domain/dtos/hackathon.dto';
import { Calendar, MapPin, Trophy, Users } from 'lucide-react';

interface QuickFactsProps {
  hackathon: HackathonDetailDTO;
}

export function QuickFacts({ hackathon }: QuickFactsProps) {
  return (
    <div className="glass-card rounded-2xl py-4 px-6 border border-purple-900/30 grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="space-y-1">
        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-purple-400" /> Event Dates
        </span>
        <p className="text-sm font-bold text-white">
          {new Date(hackathon.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(hackathon.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      <div className="space-y-1">
        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-purple-400" /> Location
        </span>
        <p className="text-sm font-bold text-white truncate">
          {hackathon.isOnline ? 'Online (Worldwide)' : (hackathon.locationCity || hackathon.locationCollege || 'In-Person')}
        </p>
      </div>

      <div className="space-y-1">
        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
          <Trophy className="w-3.5 h-3.5 text-amber-400" /> Prize Pool
        </span>
        <p className="text-sm font-black text-amber-300">
          {hackathon.prizePool || (hackathon.prizeAmount ? `₹${hackathon.prizeAmount.toLocaleString()}` : 'Certificate / Swag')}
        </p>
      </div>

      <div className="space-y-1">
        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
          <Users className="w-3.5 h-3.5 text-purple-400" /> Team Size
        </span>
        <p className="text-sm font-bold text-white">
          {hackathon.minTeamSize || 1} – {hackathon.maxTeamSize || 4} Members
        </p>
      </div>
    </div>
  );
}
