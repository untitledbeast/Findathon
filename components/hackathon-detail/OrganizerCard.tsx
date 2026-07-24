'use client';

import React from 'react';
import Link from 'next/link';
import { HackathonDetailDTO } from '@/lib/domain/dtos/hackathon.dto';
import { ShieldCheck } from 'lucide-react';

interface OrganizerCardProps {
  hackathon: HackathonDetailDTO;
}

export function OrganizerCard({ hackathon }: OrganizerCardProps) {
  return (
    <div className="glass-card rounded-2xl p-5 border border-purple-900/30 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-purple-950/80 border border-purple-500/30 flex items-center justify-center font-black text-lg text-purple-300">
          {hackathon.organizerName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-white truncate flex items-center gap-1">
            {hackathon.organizerName}
            {hackathon.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-purple-400 inline" />}
          </h4>
          <p className="text-xs text-slate-400">Verified Organizer</p>
        </div>
      </div>

      {hackathon.organizerProfile && (
        <Link
          href={`/organizers/${hackathon.organizerProfile.slug}`}
          className="w-full py-2.5 rounded-xl glass-card text-center block text-xs font-bold text-purple-300 hover:text-white border border-purple-900/40 transition-colors"
        >
          View Organizer Profile →
        </Link>
      )}
    </div>
  );
}
