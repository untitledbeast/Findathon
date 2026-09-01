'use client';

import React from 'react';
import {
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { TeamCompatibilityResultDTO } from '@/types';

interface TeamIntelligenceCardProps {
  intelligence: TeamCompatibilityResultDTO | null;
  loading?: boolean;
}

export default function TeamIntelligenceCard({
  intelligence,
  loading = false
}: TeamIntelligenceCardProps) {
  if (loading) {
    return (
      <div className="rounded-2xl p-6 border border-purple-900/20 bg-[#0D1224]/60 space-y-4 animate-pulse">
        <div className="h-6 w-36 bg-purple-950/60 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-20 bg-slate-900/60 rounded-xl" />
          <div className="h-20 bg-slate-900/60 rounded-xl" />
          <div className="h-20 bg-slate-900/60 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!intelligence) {
    return (
      <div className="rounded-2xl p-6 border border-purple-900/20 bg-[#0D1224]/40 text-center space-y-2">
        <p className="text-xs font-semibold text-slate-300">Team intelligence unavailable</p>
        <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
          Not enough reliable developer or hackathon capability information is available yet.
        </p>
      </div>
    );
  }

  const {
    teamFitScore,
    confidence,
    coveredSkills,
    criticalGaps,
    importantGaps,
    roleBreakdown
  } = intelligence;

  const getConfidenceLabel = () => {
    if (confidence === 'high') return 'High confidence';
    if (confidence === 'medium') return 'Medium confidence';
    return 'Low confidence';
  };

  // Convert role breakdown into clean status list
  const rolesList: { label: string; value: number }[] = [
    { label: 'Frontend', value: roleBreakdown.frontend },
    { label: 'Backend', value: roleBreakdown.backend },
    { label: 'AI / ML', value: roleBreakdown.aiMl },
    { label: 'Data & DB', value: roleBreakdown.data },
    { label: 'DevOps & Cloud', value: roleBreakdown.devops }
  ];

  const getRoleStatus = (val: number) => {
    if (val >= 0.7) return { label: 'Strong', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    if (val >= 0.3) return { label: 'Partial', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    return { label: 'Missing', color: 'text-slate-400 bg-slate-800/40 border-slate-700/40' };
  };

  const allGaps = [
    ...criticalGaps.map(g => ({ ...g, priority: 'Required' })),
    ...importantGaps.map(g => ({ ...g, priority: 'Preferred' }))
  ];

  return (
    <div className="rounded-2xl border border-purple-900/20 bg-[#0D1224]/80 p-5 md:p-6 space-y-6">
      {/* Top: Team Fit and Confidence */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-purple-900/20">
        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white tracking-tight">{Math.round(teamFitScore)}%</span>
            <span className="text-xs font-bold text-slate-300">Team Fit</span>
          </div>
          <span className="text-[10px] font-semibold text-purple-300 bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded-full">
            {getConfidenceLabel()}
          </span>
        </div>

        {coveredSkills.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{coveredSkills.length} verified technologies covered</span>
          </div>
        )}
      </div>

      {/* Main Grid: Coverage Overview & Gaps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Capability Coverage Overview */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Team Coverage
          </h4>
          <div className="space-y-1.5">
            {rolesList.map((role, idx) => {
              const status = getRoleStatus(role.value);
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs"
                >
                  <span className="font-medium text-slate-200">{role.label}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${status.color}`}>
                    {status.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: What we're missing (Gaps) */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>What We&apos;re Missing</span>
          </h4>
          {allGaps.length > 0 ? (
            <div className="space-y-1.5">
              {allGaps.map((gap, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-amber-950/20 border border-amber-800/30 text-xs"
                >
                  <span className="font-medium text-amber-100">{gap.displayLabel}</span>
                  <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                    gap.priority === 'Required'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {gap.priority}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/30 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>All key hackathon capability requirements are covered.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
