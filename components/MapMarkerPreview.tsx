'use client';

import React from 'react';
import { MapHackathon, getMarkerStatus, MARKER_COLORS } from '@/lib/map-utils';
import { Trophy, Calendar, MapPin, Building2, Star } from 'lucide-react';

interface MapMarkerPreviewProps {
  hackathon: MapHackathon;
  x: number;
  y: number;
  visible: boolean;
}

export default function MapMarkerPreview({ hackathon, x, y, visible }: MapMarkerPreviewProps) {
  if (!visible) return null;

  const status = getMarkerStatus(hackathon);
  const statusColor = MARKER_COLORS[status];

  return (
    <div
      className="fixed z-50 pointer-events-none transition-all duration-150 ease-out transform -translate-x-1/2 -translate-y-full pb-4 animate-fade-in"
      style={{ left: `${x}px`, top: `${y}px` }}
    >
      <div className="w-64 glass-card rounded-2xl p-4 shadow-2xl border border-purple-500/40 bg-[#0D1224]/95 space-y-2.5">
        {/* Organizer */}
        <div className="flex items-center justify-between text-[11px] font-semibold text-purple-400 uppercase tracking-wide">
          <span className="truncate flex items-center gap-1">
            <Building2 className="w-3 h-3 shrink-0" />
            {hackathon.organizer || 'Community Host'}
          </span>
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: statusColor, boxShadow: `0 0 8px ${statusColor}` }}
          />
        </div>

        {/* Title */}
        <h4 className="text-sm font-bold text-white line-clamp-2 leading-snug">
          {hackathon.title}
        </h4>

        {/* Location & Dates */}
        <div className="space-y-1 text-xs text-slate-300">
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>
              {hackathon.is_online
                ? 'Worldwide (Online)'
                : hackathon.location_city || 'In-Person'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>{hackathon.start_date}</span>
          </div>
        </div>

        {/* Badges Row */}
        <div className="pt-1 flex items-center justify-between text-[11px] border-t border-purple-900/30">
          {hackathon.prize_pool ? (
            <span className="font-bold text-amber-300 flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" />
              {hackathon.prize_pool}
            </span>
          ) : (
            <span className="text-slate-400">Free Entry</span>
          )}

          <div className="flex items-center gap-1 text-amber-400 font-mono-num font-bold">
            <Star className="w-3 h-3 fill-current" />
            <span>{hackathon.avg_rating || 4.8}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
