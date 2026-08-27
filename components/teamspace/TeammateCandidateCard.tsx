/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useState } from 'react';
import {
  Check,
  Send,
  UserPlus,
  UserCheck,
  Clock,
  MessageSquare
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
    <div className="glass-card rounded-2xl border border-purple-900/30 p-5 hover:border-purple-500/40 transition-all bg-[#0D1224]/85 backdrop-blur-xl shadow-lg flex flex-col justify-between space-y-4">
      <div className="space-y-3.5">
        {/* Header: Avatar, Name, Title, Contribution Tag */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 border border-purple-400/30 flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0">
            {candidate.displayName ? candidate.displayName.charAt(0).toUpperCase() : 'D'}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-white truncate">{candidate.displayName}</h4>
            <p className="text-[11px] text-slate-400 capitalize truncate">
              {candidate.technicalLevel} Developer
            </p>
          </div>
        </div>

        {/* Contribution Pill */}
        <div>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase ${
              isHighContribution
                ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60'
                : 'bg-indigo-950/70 text-indigo-300 border border-indigo-800/60'
            }`}
          >
            {isHighContribution ? 'High Contribution' : 'Medium Contribution'}
          </span>
        </div>

        {/* Skills Added / Covered */}
        {candidate.addsSkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {candidate.addsSkills.slice(0, 3).map((sk, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-900/90 text-slate-300 border border-slate-800"
              >
                {sk}
              </span>
            ))}
          </div>
        )}

        {/* Real Explanation Reason */}
        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
          {candidate.reasons && candidate.reasons.length > 0
            ? candidate.reasons[0]
            : `Adds verified capability to fulfill team gap requirements.`}
        </p>
      </div>

      {/* Action Strip: Connect Icon + Invite Button */}
      <div className="pt-2 border-t border-purple-950/50 space-y-2">
        <div className="flex items-center gap-2">
          {/* Connect Icon Button */}
          {connectionState === 'accepted' ? (
            <div
              className="p-2 rounded-xl bg-indigo-950/60 border border-indigo-800/50 text-indigo-300"
              title="Connected"
            >
              <UserCheck className="w-4 h-4" />
            </div>
          ) : connectionState === 'pending_sent' ? (
            <div
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-amber-400"
              title="Connection Request Sent"
            >
              <Clock className="w-4 h-4" />
            </div>
          ) : onConnect ? (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer disabled:opacity-50"
              title="Connect with developer"
              aria-label={`Connect with ${candidate.displayName}`}
            >
              <UserPlus className="w-4 h-4" />
            </button>
          ) : null}

          {/* Invite Button */}
          <div className="flex-1 min-w-0">
            {invited ? (
              <div className="w-full py-2 px-3 rounded-xl bg-emerald-950/50 border border-emerald-800/50 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Invited</span>
              </div>
            ) : candidate.invitationState === 'accepted' ? (
              <div className="w-full py-2 px-3 rounded-xl bg-indigo-950/50 border border-indigo-800/50 text-indigo-300 text-xs font-bold flex items-center justify-center">
                <span>Member</span>
              </div>
            ) : !showInviteBox ? (
              <button
                onClick={() => setShowInviteBox(true)}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-950/40 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Invite</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Note Dialog / Input if Invite Box is active */}
        {showInviteBox && !invited && (
          <div className="space-y-2 pt-1 animate-in fade-in">
            <input
              type="text"
              placeholder="Add optional note (e.g. AI track)..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-purple-900/60 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSendInvite}
                disabled={isInviting}
                className="flex-1 py-1.5 px-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-md cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
                <span>{isInviting ? 'Sending...' : 'Send'}</span>
              </button>
              <button
                onClick={() => setShowInviteBox(false)}
                className="py-1.5 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-bold cursor-pointer"
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
