'use client';

import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Users,
  Info
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
      <div className="glass-card rounded-3xl p-6 border border-purple-900/30 space-y-4 animate-pulse bg-[#0D1224]/80">
        <div className="h-5 w-44 bg-purple-950/60 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-32 bg-slate-900/60 rounded-2xl" />
          <div className="h-32 bg-slate-900/60 rounded-2xl" />
          <div className="h-32 bg-slate-900/60 rounded-2xl" />
          <div className="h-32 bg-slate-900/60 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!intelligence) {
    return (
      <div className="glass-card rounded-3xl p-6 border border-purple-900/30 text-center space-y-2 bg-[#0D1224]/50">
        <Users className="w-8 h-8 text-purple-400 mx-auto opacity-60" />
        <p className="text-sm font-semibold text-white">No Team Intelligence Computed</p>
        <p className="text-xs text-slate-400">Add members to analyze team compatibility and coverage.</p>
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

  // Calculate SVG Polygon coordinates for the 5-dimension radar
  const getPolygonPoints = () => {
    const center = 60;
    const radius = 45;
    const values = [
      Math.max(0.2, roleBreakdown.frontend),
      Math.max(0.2, roleBreakdown.backend),
      Math.max(0.2, roleBreakdown.aiMl),
      Math.max(0.2, roleBreakdown.data),
      Math.max(0.2, roleBreakdown.devops)
    ];

    return values
      .map((val, idx) => {
        const angle = (idx * 2 * Math.PI) / 5 - Math.PI / 2;
        const r = radius * Math.min(1.0, val);
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const getConfidenceText = () => {
    if (confidence === 'high') return 'High confidence';
    if (confidence === 'medium') return 'Medium confidence';
    return 'Low confidence';
  };

  const getDynamicSummary = () => {
    if (criticalGaps.length === 0 && teamFitScore >= 80) {
      return 'Great foundation! High capability alignment across all event tracks.';
    }
    if (criticalGaps.length > 0) {
      return `Targeting ${criticalGaps[0].displayLabel} will significantly boost your team capability.`;
    }
    return 'Solid foundation. Filling remaining gaps will make your team unstoppable.';
  };

  return (
    <div className="glass-card rounded-3xl border border-purple-900/40 p-6 md:p-7 bg-[#0D1224]/85 backdrop-blur-xl shadow-xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-300">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Team Intelligence</h3>
            <p className="text-[11px] text-slate-400">Real-time analysis of your team&apos;s capabilities</p>
          </div>
        </div>
      </div>

      {/* Grid: 4 Interactive / Visual Panes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pane 1: Team Fit Gauge */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between space-y-3">
          <div className="flex items-center gap-3">
            {/* SVG Circular Progress Gauge */}
            <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-400"
                  strokeDasharray={`${teamFitScore}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs font-black text-white font-mono leading-none">
                  {teamFitScore}%
                </span>
                <span className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Fit</span>
              </div>
            </div>

            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/80 text-purple-300 border border-purple-800">
                <span>{getConfidenceText()}</span>
                <Info className="w-2.5 h-2.5 opacity-70" />
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            {getDynamicSummary()}
          </p>
        </div>

        {/* Pane 2: Covered Skills */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2.5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Covered</span>
            </span>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {coveredSkills.length > 0 ? (
                coveredSkills.slice(0, 4).map((sk, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-950 border border-slate-800 text-slate-200"
                  >
                    {sk.displayLabel}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500">No verified skills covered yet.</span>
              )}
            </div>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {coveredSkills.length} verified technologies
          </span>
        </div>

        {/* Pane 3: Gaps */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2.5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>Gaps</span>
            </span>
            <div className="space-y-1.5 mt-2">
              {criticalGaps.length > 0 || importantGaps.length > 0 ? (
                <>
                  {criticalGaps.slice(0, 1).map((g, i) => (
                    <div
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-rose-950/40 border border-rose-800/50 flex items-center justify-between text-xs font-semibold text-rose-200"
                    >
                      <span>{g.displayLabel}</span>
                      <span className="text-[9px] uppercase font-bold text-rose-300">High Priority</span>
                    </div>
                  ))}
                  {importantGaps.slice(0, 1).map((g, i) => (
                    <div
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-amber-950/40 border border-amber-800/50 flex items-center justify-between text-xs font-semibold text-amber-200"
                    >
                      <span>{g.displayLabel}</span>
                      <span className="text-[9px] uppercase font-bold text-amber-300">Medium Priority</span>
                    </div>
                  ))}
                </>
              ) : (
                <span className="text-xs text-emerald-400 font-medium">All core tracks satisfied.</span>
              )}
            </div>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {criticalGaps.length + importantGaps.length} missing domains
          </span>
        </div>

        {/* Pane 4: Geometric Capability Polygon (Radar Visual) */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col items-center justify-center relative">
          <svg className="w-24 h-24" viewBox="0 0 120 120">
            {/* Background 5-axis web */}
            <polygon
              points="60,15 102,46 86,96 34,96 18,46"
              fill="none"
              stroke="#1e293b"
              strokeWidth="1"
            />
            <polygon
              points="60,35 83,52 74,80 46,80 37,52"
              fill="none"
              stroke="#1e293b"
              strokeWidth="0.8"
            />
            {/* Active filled polygon */}
            <polygon
              points={getPolygonPoints()}
              fill="rgba(139, 92, 246, 0.25)"
              stroke="#a855f7"
              strokeWidth="1.5"
            />
            {/* Center glowing dot */}
            <circle cx="60" cy="60" r="2" fill="#a855f7" />
          </svg>
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">
            Capability Balance
          </span>
        </div>
      </div>
    </div>
  );
}
