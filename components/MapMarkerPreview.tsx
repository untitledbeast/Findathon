import React from 'react';
import { MapHackathon, getMarkerStatus, MARKER_COLORS } from '@/lib/map-utils';
import { formatDateRange } from '@/lib/utils/formatters';
import { Trophy, Calendar, MapPin, Building2 } from 'lucide-react';

interface MapMarkerPreviewProps {
  hackathon: MapHackathon;
  x: number;
  y: number;
  visible: boolean;
}

export default function MapMarkerPreview({ hackathon, x, y, visible }: MapMarkerPreviewProps) {
  if (!visible || !hackathon) return null;

  const status = getMarkerStatus(hackathon);
  const statusColor = MARKER_COLORS[status];

  const statusLabels: Record<string, string> = {
    live: 'Live Now 🔴',
    open: 'Open for Registration',
    closing_soon: 'Closing Soon!',
    online: 'Online Event',
    featured: 'Featured Event',
    closed: 'Registration Closed',
  };

  return (
    <div
      className="fixed z-50 pointer-events-none transition-all duration-150 ease-out transform -translate-x-1/2 -translate-y-full pb-4"
      style={{ left: `${x}px`, top: `${y}px` }}
    >
      <div className="w-72 glass-card rounded-2xl p-4 shadow-2xl border border-purple-500/40 bg-[#0D1224]/95 space-y-3 backdrop-blur-xl">
        {/* Header: Status badge & Organizer */}
        <div className="flex items-center justify-between text-[11px] font-semibold">
          <span className="truncate flex items-center gap-1 text-purple-300">
            <Building2 className="w-3.5 h-3.5 shrink-0 text-purple-400" />
            {hackathon.organizer || 'Community Organizer'}
          </span>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wider shrink-0 flex items-center gap-1"
            style={{ backgroundColor: `${statusColor}33`, color: statusColor, border: `1px solid ${statusColor}66` }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
            {statusLabels[status] || status}
          </span>
        </div>

        {/* Title */}
        <h4 className="text-sm font-extrabold text-white line-clamp-2 leading-snug">
          {hackathon.title}
        </h4>

        {/* Location & Dates */}
        <div className="space-y-1.5 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="truncate">
              {hackathon.is_online
                ? 'Online / Virtual'
                : hackathon.location_city || 'In-Person'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>{formatDateRange(hackathon.start_date, hackathon.end_date)}</span>
          </div>
        </div>

        {/* Footer: Prize Pool */}
        <div className="pt-2 flex items-center justify-between border-t border-purple-900/30 text-xs">
          <span className="text-slate-400 text-[11px]">Prize Pool</span>
          <span className="font-extrabold text-amber-300 flex items-center gap-1 font-mono-num">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            {hackathon.prize_pool || 'Prizes & Swag'}
          </span>
        </div>
      </div>
    </div>
  );
}
