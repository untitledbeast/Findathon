'use client';

import React, { useState } from 'react';
import {
  Check,
  Send,
  UserPlus,
  UserCheck,
  Clock
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

  const isHighContribution = candidate.contributionScore >= 80;

  return (
    <div className="rounded-2xl border border-purple-900/20 p-5 bg-[#0D1224]/80 hover:border-purple-500/30 transition-all flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        {/* Header: Avatar, Name, Technical Level */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-200 font-bold text-xs shrink-0">
              {candidate.displayName ? candidate.displayName.charAt(0).toUpperCase() : 'D'}
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-white truncate">{candidate.displayName}</h4>
              <p className="text-[11px] text-slate-400 capitalize truncate">
                {candidate.technicalLevel} Developer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
              isHighContribution
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
            }`}>
              {isHighContribution ? 'High Contribution' : 'Med Contribution'}
            </span>
          </div>
        </div>

        {/* Adds & Fills Section */}
        <div className="space-y-2 pt-1 border-t border-purple-900/20 text-xs">
          {candidate.addsSkills.length > 0 && (
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Adds
              </span>
              <div className="flex flex-wrap gap-1">
                {candidate.addsSkills.slice(0, 3).map((sk, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-900 border border-slate-800 text-slate-300"
                  >
                    {sk}
                  </span>
                ))}
              </div>
            </div>
          )}

          {candidate.fillsGaps.length > 0 && (
            <div>
              <span className="text-[10px] font-bold text-amber-400/90 uppercase tracking-wider block mb-1">
                Fills
              </span>
              <div className="flex flex-wrap gap-1">
                {candidate.fillsGaps.map((g, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-950/30 border border-amber-800/40 text-amber-200"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Deterministic Explanation Reason */}
        <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
          {candidate.reasons && candidate.reasons.length > 0
            ? candidate.reasons[0]
            : 'Adds verified capability to fulfill team gap requirements.'}
        </p>
      </div>

      {/* Action Strip */}
      <div className="pt-3 border-t border-purple-900/20 space-y-2">
        <div className="flex items-center gap-2">
          {/* Connect Button */}
          {connectionState === 'accepted' ? (
            <div
              className="p-2 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-indigo-300 flex items-center justify-center shrink-0"
              title="Connected"
            >
              <UserCheck className="w-3.5 h-3.5" />
            </div>
          ) : connectionState === 'pending_sent' ? (
            <div
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-amber-400 flex items-center justify-center shrink-0"
              title="Connection Request Sent"
            >
              <Clock className="w-3.5 h-3.5" />
            </div>
          ) : onConnect ? (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer disabled:opacity-50 shrink-0"
              title="Connect"
              aria-label={`Connect with ${candidate.displayName}`}
            >
              <UserPlus className="w-3.5 h-3.5" />
            </button>
          ) : null}

          {/* Invite Button */}
          <div className="flex-1 min-w-0">
            {invited ? (
              <div className="w-full py-1.5 px-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1">
                <Check className="w-3 h-3" />
                <span>Invited</span>
              </div>
            ) : candidate.invitationState === 'accepted' ? (
              <div className="w-full py-1.5 px-3 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-indigo-300 text-xs font-semibold flex items-center justify-center">
                <span>Member</span>
              </div>
            ) : !showInviteBox ? (
              <button
                onClick={() => setShowInviteBox(true)}
                className="w-full py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Invite</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Note Dialog / Input if Invite Box is active */}
        {showInviteBox && !invited && (
          <div className="space-y-2 pt-1">
            <input
              type="text"
              placeholder="Add optional note..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-purple-900/40 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSendInvite}
                disabled={isInviting}
                className="flex-1 py-1.5 px-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
                <span>{isInviting ? 'Sending...' : 'Send Invite'}</span>
              </button>
              <button
                onClick={() => setShowInviteBox(false)}
                className="py-1.5 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-semibold cursor-pointer"
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
