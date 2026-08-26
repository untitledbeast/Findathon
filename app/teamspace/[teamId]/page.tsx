/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Users,
  ArrowLeft,
  Plus,
  CheckCircle2,
  AlertCircle,
  Crown,
  LogOut,
  X,
  ExternalLink,
  Clock,
  ArrowRightLeft
} from 'lucide-react';
import { TeamDTO, TeamInvitationDTO, TeamCompatibilityResultDTO } from '@/types';
import TeamIntelligenceCard from '@/components/teamspace/TeamIntelligenceCard';

export default function SingleTeamOverviewPage({
  params
}: {
  params: Promise<{ teamId: string }>;
}) {
  const resolvedParams = use(params);
  const teamId = resolvedParams.teamId;

  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [team, setTeam] = useState<TeamDTO | null>(null);
  const [isOwnerOrLead, setIsOwnerOrLead] = useState(false);
  const [invitations, setInvitations] = useState<TeamInvitationDTO[]>([]);
  const [intelligence, setIntelligence] = useState<TeamCompatibilityResultDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [intelLoading, setIntelLoading] = useState(true);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Transfer Ownership Modal State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedNewOwner, setSelectedNewOwner] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadTeamData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/teams/${teamId}`);
      const json = await res.json();
      if (json.success && json.data?.team) {
        setTeam(json.data.team);
        setIsOwnerOrLead(json.data.isOwnerOrLead || false);
        setInvitations(json.data.invitations || []);
      } else {
        showToast(json.error?.message || 'Failed to load team', 'error');
      }
    } catch {
      showToast('Failed to load team', 'error');
    } finally {
      setLoading(false);
    }
  }, [teamId, showToast]);

  const loadIntelligence = useCallback(async () => {
    setIntelLoading(true);
    try {
      const res = await fetch(`/api/v1/teams/${teamId}/intelligence`);
      const json = await res.json();
      if (json.success && json.data) {
        setIntelligence(json.data);
      }
    } catch {
      // Non-blocking
    } finally {
      setIntelLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    if (teamId && !authLoading) {
      void loadTeamData();
      void loadIntelligence();
    }
  }, [teamId, authLoading, loadTeamData, loadIntelligence]);

  const handleCancelInvite = async (invitationId: string) => {
    try {
      const res = await fetch(`/api/v1/invitations/${invitationId}/cancel`, {
        method: 'POST'
      });
      const json = await res.json();
      if (json.success) {
        showToast('Invitation cancelled', 'success');
        setInvitations(prev => prev.filter(i => i.id !== invitationId));
      } else {
        showToast(json.error?.message || 'Failed to cancel invitation', 'error');
      }
    } catch {
      showToast('Failed to cancel invitation', 'error');
    }
  };

  const handleLeaveTeam = async () => {
    const isOwner = team?.ownerUserId === user?.id;
    const confirmMsg = isOwner
      ? 'You are the team owner. Leaving will transfer ownership to a team lead or the next active member, or archive the team if no members remain. Are you sure you want to leave?'
      : 'Are you sure you want to leave this team?';

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/v1/teams/${teamId}/leave`, {
        method: 'POST'
      });
      const json = await res.json();
      if (json.success) {
        showToast('You have left the team', 'success');
        router.push('/teamspace');
      } else {
        showToast(json.error?.message || 'Failed to leave team', 'error');
      }
    } catch {
      showToast('Failed to leave team', 'error');
    }
  };

  const handleTransferOwnership = async () => {
    if (!selectedNewOwner) {
      showToast('Please select a team member to become the new owner', 'error');
      return;
    }

    setIsTransferring(true);
    try {
      const res = await fetch(`/api/v1/teams/${teamId}/transfer-owner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newOwnerUserId: selectedNewOwner })
      });

      const json = await res.json();
      if (json.success) {
        showToast('Team ownership transferred successfully! 👑', 'success');
        setShowTransferModal(false);
        loadTeamData();
      } else {
        showToast(json.error?.message || 'Failed to transfer ownership', 'error');
      }
    } catch {
      showToast('Failed to transfer ownership', 'error');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      const res = await fetch(`/api/v1/teams/${teamId}?userId=${targetUserId}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        showToast('Member removed from team', 'success');
        loadTeamData();
        loadIntelligence();
      } else {
        showToast(json.error?.message || 'Failed to remove member', 'error');
      }
    } catch {
      showToast('Failed to remove member', 'error');
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070913] pt-28 pb-16 px-4">
        <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
          <div className="h-32 bg-slate-900/60 rounded-3xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 bg-slate-900/40 rounded-3xl" />
            <div className="h-96 bg-slate-900/40 rounded-3xl" />
          </div>
        </div>
      </main>
    );
  }

  if (!team) {
    return (
      <main className="min-h-screen bg-[#070913] pt-28 pb-16 px-4">
        <div className="max-w-md mx-auto text-center space-y-4 pt-16">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Team Not Found</h2>
          <p className="text-xs text-slate-400">The team does not exist or you do not have permission to view it.</p>
          <Link href="/teamspace" className="text-xs text-purple-400 font-bold hover:underline block">
            ← Return to TeamSpace Hub
          </Link>
        </div>
      </main>
    );
  }

  const isOwner = team.ownerUserId === user?.id;
  const eligibleSuccessors = (team.members || []).filter(m => m.userId !== user?.id && m.membershipStatus === 'active');

  return (
    <main className="min-h-screen bg-[#070913] pt-28 pb-16 px-4 sm:px-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl text-sm font-semibold flex items-center gap-3 shadow-2xl border backdrop-blur-xl transition-all animate-in slide-in-from-bottom-5 ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40 shadow-emerald-900/30'
              : 'bg-rose-950/90 text-rose-200 border-rose-500/40 shadow-rose-900/30'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
          {toast.text}
        </div>
      )}

      {/* Transfer Ownership Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl border border-purple-900/40 p-6 md:p-8 bg-[#0D1224] max-w-md w-full space-y-6 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-base">
                <Crown className="w-5 h-5" />
                <span>Transfer Team Ownership</span>
              </div>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Select an active team member to become the new owner of <strong className="text-white">{team.name}</strong>. You will remain an active member of the team.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">Choose Successor</label>
              {eligibleSuccessors.length > 0 ? (
                <select
                  value={selectedNewOwner}
                  onChange={(e) => setSelectedNewOwner(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-purple-900/60 text-sm text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select team member...</option>
                  {eligibleSuccessors.map(m => (
                    <option key={m.userId} value={m.userId}>
                      {m.profile?.fullName || 'Teammate'} ({m.role})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-amber-400">No other active members in the team to transfer ownership to.</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleTransferOwnership}
                disabled={isTransferring || !selectedNewOwner}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs shadow-md cursor-pointer disabled:opacity-50"
              >
                {isTransferring ? 'Transferring...' : 'Confirm Transfer'}
              </button>
              <button
                onClick={() => setShowTransferModal(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/teamspace"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to My Teams</span>
          </Link>

          <Link
            href={`/teamspace/discover?hackathon=${team.hackathonId}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border border-purple-500/40 shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Find Teammates</span>
          </Link>
        </div>

        {/* Team Header Hero */}
        <div className="glass-card rounded-3xl border border-purple-900/40 p-6 md:p-8 bg-gradient-to-br from-[#0D1224]/90 via-[#0a0f29]/80 to-[#060816]/90 backdrop-blur-2xl shadow-2xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/hackathons/${team.hackathon?.slug || team.hackathonId}`}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:text-white hover:bg-purple-500/20 transition-colors truncate max-w-sm"
                >
                  <span>{team.hackathon?.title || 'Hackathon Event'}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </Link>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-950 text-purple-300 border border-purple-800 capitalize">
                  {team.status}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight truncate">
                {team.name}
              </h1>
              {team.description && (
                <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
                  {team.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Capacity
                </span>
                <span className="text-base font-black text-white font-mono">
                  {team.memberCount} / {team.maxMembers}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Team Members & Outgoing Invites */}
          <div className="lg:col-span-2 space-y-6">
            {/* Members Section */}
            <div className="glass-card rounded-3xl border border-purple-900/30 p-6 space-y-4 bg-[#0D1224]/80 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span>Team Members ({team.members?.length || 0})</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {team.maxMembers - (team.members?.length || 0)} slots available
                </span>
              </div>

              <div className="space-y-3">
                {team.members?.map(member => (
                  <div
                    key={member.id}
                    className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-500/40 flex items-center justify-center text-purple-300 font-bold text-sm shrink-0">
                        {member.profile?.fullName?.charAt(0).toUpperCase() || 'T'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white truncate">
                            {member.profile?.fullName || 'Teammate'}
                          </h4>
                          {member.role === 'owner' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                              <Crown className="w-3 h-3" /> Owner
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300 capitalize">
                              {member.role}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="capitalize">{member.profile?.technicalLevel || 'Verified'} Builder</span>
                          {member.profile?.topLanguages && member.profile.topLanguages.length > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-purple-300 truncate">
                                {member.profile.topLanguages.join(', ')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {isOwnerOrLead && member.userId !== user?.id && (
                      <button
                        onClick={() => handleRemoveMember(member.userId)}
                        className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-3 py-1 rounded-lg bg-rose-950/30 border border-rose-900/40 hover:bg-rose-950/60 transition-colors cursor-pointer self-start sm:self-auto"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-purple-900/20 flex flex-wrap items-center justify-between gap-3">
                {isOwner && eligibleSuccessors.length > 0 && (
                  <button
                    onClick={() => setShowTransferModal(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Transfer Ownership</span>
                  </button>
                )}

                <button
                  onClick={handleLeaveTeam}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer ml-auto"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Leave Team</span>
                </button>
              </div>
            </div>

            {/* Outgoing Invitations (Leads/Owners only) */}
            {isOwnerOrLead && invitations.length > 0 && (
              <div className="glass-card rounded-3xl border border-purple-900/30 p-6 space-y-4 bg-[#0D1224]/80 backdrop-blur-xl">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span>Outgoing Invitations ({invitations.length})</span>
                </h3>

                <div className="space-y-2.5">
                  {invitations.map(inv => (
                    <div
                      key={inv.id}
                      className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          {inv.invitee?.fullName || 'Candidate Developer'}
                        </p>
                        <span className="text-[10px] text-slate-400">
                          Sent on {new Date(inv.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <button
                        onClick={() => handleCancelInvite(inv.id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Deterministic Team Intelligence Card */}
          <div className="space-y-6">
            <TeamIntelligenceCard intelligence={intelligence} loading={intelLoading} />
          </div>
        </div>
      </div>
    </main>
  );
}
