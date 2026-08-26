'use client';

import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Users,
  Code2,
  Server,
  Cpu,
  Database,
  Cloud
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
      <div className="glass-card rounded-3xl p-6 border border-purple-900/30 space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-purple-950/60 rounded-xl" />
        <div className="h-24 bg-slate-900/60 rounded-2xl" />
        <div className="h-40 bg-slate-900/40 rounded-2xl" />
      </div>
    );
  }

  if (!intelligence) {
    return (
      <div className="glass-card rounded-3xl p-6 border border-purple-900/30 text-center space-y-2">
        <Users className="w-8 h-8 text-purple-400 mx-auto opacity-60" />
        <p className="text-sm font-semibold text-white">No Team Intelligence Computed</p>
        <p className="text-xs text-slate-400">Add members to analyze team compatibility and coverage.</p>
      </div>
    );
  }

  const {
    teamFitScore,
    confidence,
    requiredCoverageScore,
    preferredCoverageScore,
    roleCoverageScore,
    coveredSkills,
    criticalGaps,
    importantGaps,
    roleBreakdown
  } = intelligence;

  const getConfidenceBadge = (conf: 'high' | 'medium' | 'low') => {
    switch (conf) {
      case 'high':
        return { label: 'High Confidence', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
      case 'medium':
        return { label: 'Medium Confidence', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' };
      default:
        return { label: 'Preliminary', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' };
    }
  };

  const confBadge = getConfidenceBadge(confidence);

  return (
    <div className="glass-card rounded-3xl border border-purple-900/40 p-6 md:p-7 space-y-6 bg-gradient-to-br from-[#0D1224]/95 via-[#0c1024]/90 to-[#060816]/95 backdrop-blur-2xl shadow-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 border border-purple-500/30 text-purple-300">
            <Sparkles className="w-3 h-3 text-purple-400 animate-pulse" />
            <span>Deterministic Team Intelligence</span>
          </div>
          <h3 className="text-lg font-black text-white">Team Fit & Capability Analysis</h3>
        </div>

        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${confBadge.color}`}>
          <ShieldCheck className="w-3.5 h-3.5" />
          {confBadge.label}
        </span>
      </div>

      {/* Main Score Hero */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/50 via-indigo-950/40 to-slate-900/80 border border-purple-800/30 flex items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Overall Team Fit
          </span>
          <div className="text-4xl md:text-5xl font-black text-white font-mono tracking-tight mt-0.5">
            {teamFitScore}<span className="text-2xl text-purple-400 font-sans">%</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Evaluates skill coverage, role balance, and track alignment.
          </p>
        </div>

        {/* Mini progress ring or score bar indicator */}
        <div className="w-20 h-20 rounded-2xl bg-purple-950/60 border border-purple-500/40 flex flex-col items-center justify-center text-center shrink-0">
          <span className="text-[10px] font-bold text-slate-400">Coverage</span>
          <span className="text-base font-black text-cyan-300 font-mono">
            {Math.round(((requiredCoverageScore + roleCoverageScore) / 2) * 100)}%
          </span>
        </div>
      </div>

      {/* Breakdown Progress Bars */}
      <div className="space-y-3.5">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Dimension Breakdown
        </h4>

        {/* Required Skills */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-300">Mandatory Event Skills</span>
            <span className="text-white font-mono">{Math.round(requiredCoverageScore * 100)}%</span>
          </div>
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-purple-950">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.round(requiredCoverageScore * 100)}%` }}
            />
          </div>
        </div>

        {/* Preferred Stack */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-300">Preferred Technologies</span>
            <span className="text-white font-mono">{Math.round(preferredCoverageScore * 100)}%</span>
          </div>
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-purple-950">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.round(preferredCoverageScore * 100)}%` }}
            />
          </div>
        </div>

        {/* Role Coverage */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-300">Full-Stack Role Coverage</span>
            <span className="text-white font-mono">{Math.round(roleCoverageScore * 100)}%</span>
          </div>
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-purple-950">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.round(roleCoverageScore * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Role Breakdown Badges */}
      <div className="space-y-2.5 pt-2 border-t border-purple-900/30">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Team Roles
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
            roleBreakdown.frontend >= 0.4 ? 'bg-purple-950/40 border-purple-500/40 text-white' : 'bg-slate-950/40 border-slate-800 text-slate-500'
          }`}>
            <Code2 className={`w-3.5 h-3.5 ${roleBreakdown.frontend >= 0.4 ? 'text-purple-400' : 'text-slate-600'}`} />
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">Frontend</p>
              <p className="text-[10px] font-mono text-slate-400">{Math.round(roleBreakdown.frontend * 100)}%</p>
            </div>
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
            roleBreakdown.backend >= 0.4 ? 'bg-indigo-950/40 border-indigo-500/40 text-white' : 'bg-slate-950/40 border-slate-800 text-slate-500'
          }`}>
            <Server className={`w-3.5 h-3.5 ${roleBreakdown.backend >= 0.4 ? 'text-indigo-400' : 'text-slate-600'}`} />
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">Backend / API</p>
              <p className="text-[10px] font-mono text-slate-400">{Math.round(roleBreakdown.backend * 100)}%</p>
            </div>
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
            roleBreakdown.aiMl >= 0.4 ? 'bg-cyan-950/40 border-cyan-500/40 text-white' : 'bg-slate-950/40 border-slate-800 text-slate-500'
          }`}>
            <Cpu className={`w-3.5 h-3.5 ${roleBreakdown.aiMl >= 0.4 ? 'text-cyan-400' : 'text-slate-600'}`} />
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">AI / ML</p>
              <p className="text-[10px] font-mono text-slate-400">{Math.round(roleBreakdown.aiMl * 100)}%</p>
            </div>
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
            roleBreakdown.data >= 0.4 ? 'bg-amber-950/40 border-amber-500/40 text-white' : 'bg-slate-950/40 border-slate-800 text-slate-500'
          }`}>
            <Database className={`w-3.5 h-3.5 ${roleBreakdown.data >= 0.4 ? 'text-amber-400' : 'text-slate-600'}`} />
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">Database</p>
              <p className="text-[10px] font-mono text-slate-400">{Math.round(roleBreakdown.data * 100)}%</p>
            </div>
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
            roleBreakdown.devops >= 0.4 ? 'bg-emerald-950/40 border-emerald-500/40 text-white' : 'bg-slate-950/40 border-slate-800 text-slate-500'
          }`}>
            <Cloud className={`w-3.5 h-3.5 ${roleBreakdown.devops >= 0.4 ? 'text-emerald-400' : 'text-slate-600'}`} />
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">Cloud / DevOps</p>
              <p className="text-[10px] font-mono text-slate-400">{Math.round(roleBreakdown.devops * 100)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Critical & Important Gaps Alert */}
      {(criticalGaps.length > 0 || importantGaps.length > 0) && (
        <div className="space-y-2 pt-2 border-t border-purple-900/30">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Unfilled Capability Gaps
          </h4>

          <div className="space-y-2">
            {criticalGaps.map((gap, i) => (
              <div key={i} className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2">
                <span className="px-1.5 py-0.5 rounded bg-rose-900 text-[10px] font-bold text-rose-300 uppercase shrink-0 mt-0.5">
                  Critical
                </span>
                <span className="leading-tight">{gap.reason}</span>
              </div>
            ))}

            {importantGaps.slice(0, 2).map((gap, i) => (
              <div key={i} className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
                <span className="px-1.5 py-0.5 rounded bg-amber-900 text-[10px] font-bold text-amber-300 uppercase shrink-0 mt-0.5">
                  Gap
                </span>
                <span className="leading-tight">{gap.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Covered Skills */}
      {coveredSkills.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-purple-900/30">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Verified Team Stack ({coveredSkills.length})
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {coveredSkills.map((sk, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900/80 border border-slate-700/60 text-slate-200"
              >
                <span>{sk.displayLabel}</span>
                <span className="text-[10px] text-purple-400 font-mono">
                  {Math.round(sk.proficiency * 100)}%
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
