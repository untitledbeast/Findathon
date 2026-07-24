'use client';

import React, { useState } from 'react';
import { HackathonDetailDTO } from '@/lib/domain/dtos/hackathon.dto';
import { CheckCircle2 } from 'lucide-react';

interface RequirementsSectionProps {
  hackathon: HackathonDetailDTO;
}

export function RequirementsSection({ hackathon }: RequirementsSectionProps) {
  const [rulesExpanded, setRulesExpanded] = useState(false);

  return (
    <section className="glass-card rounded-3xl p-6 sm:p-8 border border-purple-900/30 space-y-6">
      <h3 className="text-xl font-bold text-white flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Requirements & Eligibility
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="glass-card rounded-xl p-3 border border-purple-900/30 space-y-1">
          <span className="text-xs text-slate-400 font-semibold">Team Size</span>
          <p className="text-sm font-bold text-white">{hackathon.minTeamSize || 1} - {hackathon.maxTeamSize || 4} Members</p>
        </div>

        <div className="glass-card rounded-xl p-3 border border-purple-900/30 space-y-1">
          <span className="text-xs text-slate-400 font-semibold">Registration Fee</span>
          <p className={`text-sm font-bold ${hackathon.registrationFee ? 'text-amber-400' : 'text-emerald-400'}`}>
            {hackathon.registrationFee ? `₹${hackathon.registrationFee}` : '100% Free'}
          </p>
        </div>

        <div className="glass-card rounded-xl p-3 border border-purple-900/30 space-y-1">
          <span className="text-xs text-slate-400 font-semibold">Certificate</span>
          <p className="text-sm font-bold text-white">{hackathon.certificateProvided ? 'Yes (All Participants)' : 'Provided'}</p>
        </div>

        <div className="glass-card rounded-xl p-3 border border-purple-900/30 space-y-1">
          <span className="text-xs text-slate-400 font-semibold">Opportunities</span>
          <p className="text-sm font-bold text-purple-300">
            {hackathon.hiringOpportunity ? 'Hiring + Internships' : 'Mentorship & Swag'}
          </p>
        </div>

        <div className="glass-card rounded-xl p-3 border border-purple-900/30 space-y-1">
          <span className="text-xs text-slate-400 font-semibold">Language</span>
          <p className="text-sm font-bold text-white">{hackathon.language || 'English'}</p>
        </div>

        <div className="glass-card rounded-xl p-3 border border-purple-900/30 space-y-1">
          <span className="text-xs text-slate-400 font-semibold">Difficulty</span>
          <p className="text-sm font-bold capitalize text-cyan-300">{hackathon.difficulty || 'Open to All'}</p>
        </div>
      </div>

      {hackathon.rules && (
        <div className="space-y-2 pt-2 border-t border-purple-900/20">
          <h4 className="text-sm font-bold text-white">Official Rules & Guidelines</h4>
          <div className={`text-xs text-slate-300 leading-relaxed ${!rulesExpanded && hackathon.rules.length > 200 ? 'line-clamp-3' : ''}`}>
            {hackathon.rules}
          </div>
          {hackathon.rules.length > 200 && (
            <button
              onClick={() => setRulesExpanded(prev => !prev)}
              className="text-xs font-bold text-purple-400 hover:underline"
            >
              {rulesExpanded ? 'Hide rules' : 'Expand full rules'}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
