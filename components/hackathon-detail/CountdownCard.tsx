'use client';

import React from 'react';
import { HackathonDetailDTO } from '@/lib/domain/dtos/hackathon.dto';
import CountdownTimer from '@/components/CountdownTimer';
import { HackathonService } from '@/lib/services/hackathon.service';
import { ExternalLink } from 'lucide-react';

interface CountdownCardProps {
  hackathon: HackathonDetailDTO;
}

export function CountdownCard({ hackathon }: CountdownCardProps) {
  const handleRegisterClick = () => {
    HackathonService.registerClick(hackathon.id);
  };

  return (
    <div className="glass-card rounded-3xl p-6 border border-purple-500/40 shadow-[0_10px_40px_rgba(0,0,0,0.6),0_0_20px_rgba(139,92,246,0.25)] space-y-6">
      <div className="space-y-2 text-center">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registration Deadline</span>
        <CountdownTimer targetDate={hackathon.registrationDeadline || hackathon.startDate} />
      </div>

      <a
        href={hackathon.registerUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleRegisterClick}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-black text-base shadow-[0_0_25px_rgba(139,92,246,0.5)] flex items-center justify-center gap-2 hover:scale-[1.02] transition-all"
      >
        Register Now <ExternalLink className="w-5 h-5" />
      </a>

      <div className="space-y-3 pt-4 border-t border-purple-900/30 text-xs font-semibold text-slate-300">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Prize Pool:</span>
          <span className="text-amber-300 font-bold">{hackathon.prizePool || 'No Prize'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Format:</span>
          <span className="text-white font-bold">{hackathon.isOnline ? '100% Online' : 'In-Person'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Entry Fee:</span>
          <span className="text-emerald-400 font-bold">{hackathon.registrationFee ? `₹${hackathon.registrationFee}` : 'Free'}</span>
        </div>
      </div>
    </div>
  );
}
