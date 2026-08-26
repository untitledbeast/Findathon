'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Check,
  Send,
  UserPlus,
  UserCheck,
  Clock,
  ArrowRight
} from 'lucide-react';
import { TeammateCandidateDTO } from '@/types';

interface TeammateCandidateCardProps {
  candidate: TeammateCandidateDTO;
  onInvite: (userId: string, message?: string) => Promise<void>;
  onConnect?: (userId: string) => Promise<void>;
  onAcceptConnection?: (connectionId: string) => Promise<void>;
  isInviting?: boolean;
  isConnecting?: boolean;
}

export default function TeammateCandidateCard({
  candidate,
  onInvite,
  onConnect,
  isInviting = false,
  isConnecting = false
}: TeammateCandidateCardProps) {
  const [showInviteBox, setShowInviteBox] = useState(false);
  const [message, setMessage] = useState('');
  const [invited, setInvited] = useState(candidate.hasPendingInvite || candidate.invitationState === 'pending');
  const [connectionState, setConnectionState] = useState(candidate.connectionState || 'none');

  const handleSendInvite = async () => {
    try {
      await onInvite(candidate.userId, message);
      setInvited(true);
      setShowInviteBox(false);
    } catch {
      // Handled by parent toast
    }
  };

  const handleConnect = async () => {
    if (!onConnect) return;
    try {
      await onConnect(candidate.userId);
      setConnectionState('pending_sent');
    } catch {
      // Handled by parent toast
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'from-purple-500 to-indigo-500 text-purple-200 border-purple-500/40';
    if (score >= 70) return 'from-cyan-500 to-blue-500 text-cyan-200 border-cyan-500/40';
    return 'from-slate-600 to-slate-700 text-slate-300 border-slate-600/40';
  };

  return (
    <div className="glass-card rounded-2xl border border-purple-900/30 p-5 space-y-4 hover:border-purple-500/40 transition-all bg-[#0D1224]/80 backdrop-blur-xl shadow-lg flex flex-col justify-between">
      <div className="space-y-3.5">
        {/* Header: Avatar, Name, Contribution Score */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 border border-purple-400/40 flex items-center justify-center text-white font-bold text-base shadow-md shrink-0">
              {candidate.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-white truncate">{candidate.displayName}</h4>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] font-semibold text-purple-300 capitalize">
                  {candidate.technicalLevel} Builder
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-[10px] text-slate-400 font-medium inline-flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> Verified
                </span>
              </div>
            </div>
          </div>

          <div className={`px-2.5 py-1 rounded-xl bg-gradient-to-r ${getScoreColor(candidate.contributionScore)} border text-center shadow-sm shrink-0`}>
            <span className="text-xs font-black font-mono block">
              +{candidate.contributionScore}%
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider block opacity-80">
              Contribution
            </span>
          </div>
        </div>

        {/* Skills Added */}
        {candidate.addsSkills.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Adds to Team Stack
            </span>
            <div className="flex flex-wrap gap-1.5">
              {candidate.addsSkills.map((sk, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-purple-950/80 text-purple-200 border border-purple-500/30"
                >
                  +{sk}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Fills Gaps */}
        {candidate.fillsGaps.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Gaps Resolved
            </span>
            <div className="space-y-1">
              {candidate.fillsGaps.map((gap, i) => (
                <div key={i} className="text-xs text-emerald-300 flex items-center gap-1.5 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{gap}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Why Recommended */}
        {candidate.reasons.length > 0 && (
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-400" />
              Why Recommended
            </span>
            <p className="text-xs text-slate-300 leading-relaxed">
              {candidate.reasons[0]}
            </p>
          </div>
        )}
      </div>

      {/* Action Controls: Distinct Connect vs Invite */}
      <div className="pt-3 border-t border-purple-900/20 space-y-2">
        <div className="flex items-center gap-2">
          {/* Connection status button / badge */}
          {connectionState === 'accepted' ? (
            <div className="px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-[11px] font-semibold flex items-center gap-1 shrink-0">
              <UserCheck className="w-3 h-3 text-indigo-400" />
              <span>Connected</span>
            </div>
          ) : connectionState === 'pending_sent' ? (
            <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-[11px] font-semibold flex items-center gap-1 shrink-0">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>Request Sent</span>
            </div>
          ) : connectionState === 'pending_received' ? (
            <div className="px-2.5 py-1 rounded-lg bg-purple-950/80 border border-purple-500/40 text-purple-300 text-[11px] font-semibold flex items-center gap-1 shrink-0">
              <span>Incoming Request</span>
            </div>
          ) : onConnect ? (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
              title="Connect with this developer"
            >
              {isConnecting ? 'Connecting...' : '+ Connect'}
            </button>
          ) : null}

          {/* Invitation action */}
          <div className="flex-1 min-w-0">
            {invited ? (
              <div className="w-full py-1.5 px-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Invited</span>
              </div>
            ) : candidate.invitationState === 'accepted' ? (
              <div className="w-full py-1.5 px-3 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-xs font-bold flex items-center justify-center gap-1.5">
                <span>Team Member</span>
              </div>
            ) : candidate.invitationState === 'not_allowed' ? (
              <div className="w-full py-1.5 px-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-xs font-semibold flex items-center justify-center">
                <span>In Another Team</span>
              </div>
            ) : !showInviteBox ? (
              <button
                onClick={() => setShowInviteBox(true)}
                className="w-full py-1.5 px-3 rounded-xl bg-purple-900/40 hover:bg-purple-800/50 border border-purple-500/30 hover:border-purple-500/60 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5 text-purple-400" />
                <span>Invite to Team</span>
                <ArrowRight className="w-3 h-3 text-purple-400 ml-auto" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Expandable note for Team Invitation */}
        {showInviteBox && !invited && (
          <div className="space-y-2 pt-1 animate-fade-in-up">
            <input
              type="text"
              placeholder="Add optional note (e.g. Building Next.js + AI track)..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-purple-900/60 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSendInvite}
                disabled={isInviting}
                className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isInviting ? 'Sending...' : 'Send Invite'}</span>
              </button>
              <button
                onClick={() => setShowInviteBox(false)}
                className="py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
