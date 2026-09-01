'use client';

import React, { useState } from 'react';
import { X, Bell, Check, Loader2, Trophy } from 'lucide-react';
import { TeamInvitation } from '@/lib/teamspace/types';

interface InvitationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  invitations: TeamInvitation[];
  onRespond: (invitationId: string, action: 'accepted' | 'declined') => Promise<void>;
  loading?: boolean;
}

export default function InvitationsDrawer({
  isOpen,
  onClose,
  invitations,
  onRespond,
  loading = false
}: InvitationsDrawerProps) {
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'accepted' | 'declined' | null>(null);

  if (!isOpen) return null;

  const handleAction = async (invitationId: string, action: 'accepted' | 'declined') => {
    setRespondingId(invitationId);
    setActionType(action);
    try {
      await onRespond(invitationId, action);
    } finally {
      setRespondingId(null);
      setActionType(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm transition-opacity">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#0D1224] border-l border-purple-500/20 p-6 flex flex-col justify-between shadow-2xl animate-slide-in-right">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Team Invitations</h3>
                  <p className="text-xs text-slate-400">
                    {invitations.length} pending {invitations.length === 1 ? 'invitation' : 'invitations'}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-180px)] pr-1">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-slate-400 text-xs gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                  <span>Loading invitations...</span>
                </div>
              ) : invitations.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-950/40 border border-purple-500/20 flex items-center justify-center text-purple-400 mx-auto">
                    <Bell className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">No pending invitations</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    When team leads or teammates invite you to build together, invitations will appear here.
                  </p>
                </div>
              ) : (
                invitations.map((inv) => {
                  const initial = (inv.team?.name || 'T').charAt(0).toUpperCase();
                  const avatarBg = inv.team?.avatar_color ? `#${inv.team.avatar_color}` : '#7C3AED';
                  const isBusy = respondingId === inv.id;

                  return (
                    <div
                      key={inv.id}
                      className="p-4 rounded-2xl bg-slate-900/80 border border-purple-500/15 hover:border-purple-500/30 transition space-y-3 shadow-md"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-inner"
                          style={{ backgroundColor: avatarBg }}
                        >
                          {initial}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-white truncate">
                            {inv.team?.name || 'Hackathon Team'}
                          </h4>
                          <p className="text-xs text-slate-400">
                            Invited by <strong className="text-slate-200">{inv.inviter?.full_name || 'Team member'}</strong>
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                            {inv.team?.hackathon_title && (
                              <span className="flex items-center gap-1 text-amber-400 truncate">
                                <Trophy className="w-3 h-3 shrink-0" />
                                <span className="truncate">{inv.team.hackathon_title}</span>
                              </span>
                            )}
                            <span>• {inv.team?.member_count || 1} members</span>
                          </div>
                        </div>
                      </div>

                      {inv.message && (
                        <p className="text-xs text-slate-300 italic bg-purple-950/20 p-2 rounded-lg border border-purple-900/30">
                          &ldquo;{inv.message}&rdquo;
                        </p>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                        <button
                          onClick={() => handleAction(inv.id, 'accepted')}
                          disabled={isBusy}
                          className="flex-1 py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow-md shadow-purple-600/20 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          {isBusy && actionType === 'accepted' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Accept</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleAction(inv.id, 'declined')}
                          disabled={isBusy}
                          className="flex-1 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer disabled:opacity-50"
                        >
                          {isBusy && actionType === 'declined' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <span>Decline</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer note */}
          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 text-center">
            Accepting an invitation immediately adds you to the team roster.
          </div>
        </div>
      </div>
    </div>
  );
}
