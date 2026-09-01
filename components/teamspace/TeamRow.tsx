'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Trophy } from 'lucide-react';
import { TeamWithMemberCount } from '@/lib/teamspace/types';

interface TeamRowProps {
  team: TeamWithMemberCount;
  onSelect?: () => void;
  isSelected?: boolean;
}

export default function TeamRow({
  team,
  onSelect,
  isSelected = false
}: TeamRowProps) {
  const initial = (team.name || 'T').charAt(0).toUpperCase();
  const avatarBg = team.avatar_color ? `#${team.avatar_color}` : '#7C3AED';

  return (
    <Link
      href={`/teamspace/teams/${team.id}`}
      onClick={onSelect}
      className={`flex items-center justify-between gap-3 p-3 rounded-2xl transition border ${
        isSelected
          ? 'bg-purple-950/40 border-purple-500/40'
          : 'bg-slate-900/40 hover:bg-slate-900/80 border-slate-800/60 hover:border-purple-500/20'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Team Avatar */}
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-inner"
          style={{ backgroundColor: avatarBg }}
        >
          {initial}
        </div>

        {/* Team Name and Hackathon */}
        <div className="min-w-0">
          <h5 className="text-xs sm:text-sm font-semibold text-white truncate">
            {team.name}
          </h5>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 truncate">
            {team.hackathon_title ? (
              <>
                <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="truncate">{team.hackathon_title}</span>
              </>
            ) : (
              <span className="text-slate-500 italic">No hackathon linked</span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 capitalize">
            {team.member_count} / {team.max_members} members • {team.status}
          </p>
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
    </Link>
  );
}
