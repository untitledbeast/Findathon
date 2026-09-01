'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { TeammateRecommendation } from '@/lib/teamspace/types';
import { Sparkles, Check, Send, User } from 'lucide-react';

interface DeveloperCardProps {
  developer: TeammateRecommendation;
  onInvite: () => void;
  inviting?: boolean;
  invited?: boolean;
}

export default function DeveloperCard({
  developer,
  onInvite,
  inviting = false,
  invited = false
}: DeveloperCardProps) {
  const [imgError, setImgError] = useState(false);
  const dev = developer.developer;

  // Derive role label from highest competency
  let topRole = 'Software Engineer';
  if (dev.competencies && typeof dev.competencies === 'object') {
    let maxScore = -1;
    let maxDomain = '';
    for (const [domain, score] of Object.entries(dev.competencies)) {
      if (typeof score === 'number' && score > maxScore) {
        maxScore = score;
        maxDomain = domain;
      }
    }
    if (maxDomain) {
      topRole = maxDomain.includes('Developer') || maxDomain.includes('Engineer')
        ? maxDomain
        : `${maxDomain} Specialist`;
    }
  }

  // Derive adds description
  let addsDescription = 'General technical contribution';
  if (developer.adds_skills.length >= 2) {
    addsDescription = `${developer.adds_skills[0]} & ${developer.adds_skills[1]} expertise`;
  } else if (developer.adds_skills.length === 1) {
    addsDescription = `${developer.adds_skills[0]} expertise`;
  }

  const initials = (dev.full_name || 'Developer')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <div className="glass-card rounded-2xl p-5 w-full md:w-64 flex-shrink-0 flex flex-col justify-between border border-purple-500/15 hover:border-purple-500/30 transition-all bg-[#0D1224]/80 shadow-lg space-y-4">
      {/* TOP ROW: AVATAR, NAME, MATCH BADGE */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          {/* Avatar with online indicator */}
          <div className="relative shrink-0">
            {dev.avatar_url && !imgError ? (
              <img
                src={dev.avatar_url}
                alt={dev.full_name || 'Developer'}
                onError={() => setImgError(true)}
                className="w-10 h-10 rounded-full object-cover border border-purple-500/30"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs border border-purple-500/30">
                {initials || <User className="w-4 h-4" />}
              </div>
            )}
            {/* Green Online Dot for discoverable builders */}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#060816]" />
          </div>

          {/* Match Score Badge */}
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
              developer.match_score >= 90
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : developer.match_score >= 70
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {developer.match_score > 0 ? developer.match_label : 'Available'}
          </span>
        </div>

        {/* Name and Role */}
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-white truncate" title={dev.full_name || 'Developer'}>
            {dev.full_name || 'Developer'}
          </h4>
          <p className="text-xs text-slate-400 truncate">{topRole}</p>
        </div>

        {/* Skill Tags */}
        <div className="flex flex-wrap gap-1">
          {dev.top_languages.slice(0, 3).map((lang) => (
            <span
              key={lang}
              className="px-2 py-0.5 rounded-md bg-purple-950/60 text-purple-300 border border-purple-500/20 text-[10px] font-medium"
            >
              {lang}
            </span>
          ))}
          {dev.top_languages.length === 0 && (
            <span className="text-[10px] text-slate-500 italic">Full-stack builder</span>
          )}
        </div>
      </div>

      {/* MIDDLE: ADDS & FILLS */}
      <div className="space-y-2 text-xs pt-1 border-t border-slate-800/80">
        <div>
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
            Adds
          </span>
          <p className="text-slate-300 font-medium text-[11px] truncate">
            {addsDescription}
          </p>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
            Fills
          </span>
          {developer.fills_gaps.length > 0 ? (
            <p className="text-rose-400 font-semibold text-[11px] truncate flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-rose-400 shrink-0" />
              <span>{developer.fills_gaps.join(', ')} gap</span>
            </p>
          ) : (
            <p className="text-emerald-400 font-semibold text-[11px] truncate">
              {developer.adds_skills[0] || 'Core'} strength
            </p>
          )}
        </div>
      </div>

      {/* BOTTOM ACTIONS */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
        <Link
          href={`/profile/${dev.user_id}`}
          className="flex-1 py-1.5 px-2 rounded-xl text-center text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition"
        >
          Profile
        </Link>
        
        <button
          onClick={onInvite}
          disabled={invited || inviting}
          className={`flex-1 py-1.5 px-2 rounded-xl text-center text-xs font-bold transition flex items-center justify-center gap-1 ${
            invited
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
              : inviting
              ? 'bg-purple-800/50 text-purple-300 cursor-wait'
              : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20 cursor-pointer'
          }`}
        >
          {invited ? (
            <>
              <Check className="w-3 h-3 text-emerald-300" />
              <span>Invited</span>
            </>
          ) : inviting ? (
            <span>Sending...</span>
          ) : (
            <>
              <Send className="w-3 h-3" />
              <span>Invite</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
