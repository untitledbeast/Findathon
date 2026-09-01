/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Navbar from '@/components/Navbar';
import {
  ArrowLeft,
  Users,
  Trophy,
  ExternalLink,
  Plus,
  Trash2,
  LogOut,
  Sparkles,
  Shield,
  Check,
  X,
  Loader2,
  Crown,
  AlertCircle
} from 'lucide-react';
import { TeamWithMemberCount, TeamMember } from '@/lib/teamspace/types';
import TeamFitArc from '@/components/teamspace/TeamFitArc';

const PRESET_SKILLS = [
  'Frontend',
  'Backend',
  'ML/AI',
  'DevOps',
  'Mobile',
  'Blockchain',
  'Data Science',
  'UI/UX',
  'Cybersecurity',
  'Game Dev',
  'Embedded Systems',
  'Open Source'
];

export default function TeamDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const teamId = resolvedParams.id;

  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [team, setTeam] = useState<TeamWithMemberCount | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Editable skills state
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  const [isSavingSkills, setIsSavingSkills] = useState(false);

  // Modals & Action busy states
  const [showDisbandModal, setShowDisbandModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isActionBusy, setIsActionBusy] = useState(false);

  // Pending invitations for this team (if owner)
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchTeamData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/teamspace/teams/${teamId}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Failed to load team');
      }

      setTeam(json.data);
      setRequiredSkills(json.data.required_skills || []);

      // If owner, fetch outgoing pending invitations
      if (json.data.is_owner) {
        try {
          const invRes = await fetch('/api/v1/teamspace/invitations');
          const invJson = await invRes.json();
          // We can also fetch team invitations from a direct query if available
        } catch {}
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error fetching team');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/');
      } else {
        fetchTeamData();
      }
    }
  }, [authLoading, user, router, fetchTeamData]);

  // Handler: Update required skills (owner only)
  const handleSaveSkills = async (newSkills: string[]) => {
    if (!team?.is_owner) return;
    setIsSavingSkills(true);
    setRequiredSkills(newSkills);

    try {
      const res = await fetch(`/api/v1/teamspace/teams/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ required_skills: newSkills })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Failed to update skills');
      }
      showToast('Required skills updated');
      fetchTeamData();
    } catch (err: any) {
      showToast(err.message || 'Error saving skills');
    } finally {
      setIsSavingSkills(false);
    }
  };

  const toggleSkill = (skill: string) => {
    let next: string[];
    if (requiredSkills.includes(skill)) {
      next = requiredSkills.filter((s) => s !== skill);
    } else {
      if (requiredSkills.length >= 10) return;
      next = [...requiredSkills, skill];
    }
    handleSaveSkills(next);
  };

  const handleAddCustomSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && customSkill.trim()) {
      e.preventDefault();
      const trimmed = customSkill.trim();
      if (!requiredSkills.includes(trimmed) && requiredSkills.length < 10) {
        handleSaveSkills([...requiredSkills, trimmed]);
      }
      setCustomSkill('');
    }
  };

  // Handler: Disband team
  const handleDisbandTeam = async () => {
    setIsActionBusy(true);
    try {
      const res = await fetch(`/api/v1/teamspace/teams/${teamId}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Failed to disband team');
      }
      showToast('Team disbanded');
      router.push('/teamspace');
    } catch (err: any) {
      showToast(err.message || 'Error disbanding team');
      setIsActionBusy(false);
    }
  };

  // Handler: Leave team
  const handleLeaveTeam = async () => {
    setIsActionBusy(true);
    try {
      const res = await fetch(`/api/v1/teamspace/teams/${teamId}/members`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Failed to leave team');
      }
      showToast('Left team');
      router.push('/teamspace');
    } catch (err: any) {
      showToast(err.message || 'Error leaving team');
      setIsActionBusy(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#060816] text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          <span className="text-sm font-semibold text-slate-300">Loading team details...</span>
        </div>
      </div>
    );
  }

  if (errorMsg || !team) {
    return (
      <div className="min-h-screen bg-[#060816] text-[#F6F8FC] pb-20">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 pt-28 text-center space-y-6">
          <div className="glass-card rounded-3xl p-8 border border-rose-500/30 bg-rose-950/20 max-w-md mx-auto space-y-4">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
            <h2 className="text-lg font-bold text-white">Team Not Found</h2>
            <p className="text-xs text-slate-400">{errorMsg || 'This team does not exist or has been disbanded.'}</p>
            <Link
              href="/teamspace"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-xs font-bold text-white shadow-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to TeamSpace</span>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const teamFit = team.team_fit || {
    score: 0,
    confidence: 'low',
    covered_skills: [],
    gap_skills: [],
    reasons: []
  };

  return (
    <div className="min-h-screen bg-[#060816] text-[#F6F8FC] selection:bg-purple-500 selection:text-white pb-24">
      <Navbar />

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-purple-950/90 border border-purple-500/40 text-sm font-semibold text-white shadow-2xl backdrop-blur-md animate-fade-in-up flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 space-y-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/teamspace"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to TeamSpace</span>
          </Link>

          <Link
            href={`/teamspace/discover?team_id=${team.id}`}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition shadow-lg shadow-purple-600/20 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Invite Developers</span>
          </Link>
        </div>

        {/* ─── 1. HEADER SECTION ─── */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-purple-500/20 bg-[#0D1224]/85 shadow-xl relative overflow-hidden space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="flex items-start gap-4 min-w-0">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shrink-0 shadow-lg border border-white/10"
                style={{ backgroundColor: team.avatar_color ? `#${team.avatar_color}` : '#7C3AED' }}
              >
                {team.name.charAt(0).toUpperCase()}
              </div>

              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-white truncate">
                    {team.name}
                  </h1>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      team.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : team.status === 'full'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {team.status}
                  </span>
                </div>

                {team.description && (
                  <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                    {team.description}
                  </p>
                )}

                {/* Hackathon Details */}
                <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
                  {team.hackathon_title ? (
                    <Link
                      href={`/hackathons/${team.hackathon_id}`}
                      className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1.5 transition truncate"
                    >
                      <Trophy className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{team.hackathon_title}</span>
                      <ExternalLink className="w-3 h-3 text-slate-500 shrink-0" />
                    </Link>
                  ) : (
                    <span className="text-slate-500 italic">No hackathon linked</span>
                  )}
                  <span>•</span>
                  <span>{team.member_count} / {team.max_members} members</span>
                </div>
              </div>
            </div>

            {/* Owner / Member Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {team.is_owner ? (
                <button
                  onClick={() => setShowDisbandModal(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-400 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Disband Team</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowLeaveModal(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-400" />
                  <span>Leave Team</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ─── 2. TEAM FIT SECTION ─── */}
        <div className="glass-card rounded-3xl p-6 sm:p-7 border border-purple-500/20 bg-[#0D1224]/80 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Team Capability & Fit Analysis</span>
              </h3>
              <p className="text-xs text-slate-400">
                Deterministic capability assessment based on members&apos; verified developer profiles.
              </p>
            </div>

            <div className="flex items-center gap-4 bg-slate-900/60 p-3 rounded-2xl border border-slate-800 shrink-0">
              <TeamFitArc score={teamFit.score} size={80} />
              <div>
                <span className="text-2xl font-black text-white block leading-none">
                  {teamFit.score}%
                </span>
                <span className="text-[10px] text-slate-400 capitalize font-medium">
                  {teamFit.confidence} confidence
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Covered Skills */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                Covered Skills & Domains ({teamFit.covered_skills.length})
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                {teamFit.covered_skills.length > 0 ? (
                  teamFit.covered_skills.map((s) => (
                    <span
                      key={s}
                      className="px-2.5 py-1 rounded-lg bg-emerald-950/40 text-emerald-300 border border-emerald-500/20 text-xs font-medium"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 italic">No skills registered yet</span>
                )}
              </div>
            </div>

            {/* Missing Gaps */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block">
                Missing Required Capabilities ({teamFit.gap_skills.length})
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                {teamFit.gap_skills.length > 0 ? (
                  teamFit.gap_skills.map((g) => (
                    <span
                      key={g}
                      className="px-2.5 py-1 rounded-lg bg-rose-950/40 text-rose-300 border border-rose-500/20 text-xs font-medium"
                    >
                      {g}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    <span>All target skills are covered by current team members!</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── 3. REQUIRED SKILLS CONFIGURATION ─── */}
        <div className="glass-card rounded-3xl p-6 sm:p-7 border border-purple-500/20 bg-[#0D1224]/80 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Target / Required Skills</h3>
              <p className="text-xs text-slate-400">
                {team.is_owner
                  ? 'Click skills to add or remove them from your team targets.'
                  : 'Skills requested by the team lead for this hackathon.'}
              </p>
            </div>
            {isSavingSkills && (
              <span className="text-xs text-purple-400 flex items-center gap-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESET_SKILLS.map((skill) => {
              const isSelected = requiredSkills.includes(skill);
              return (
                <button
                  key={skill}
                  type="button"
                  disabled={!team.is_owner || isSavingSkills}
                  onClick={() => toggleSkill(skill)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    isSelected
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                  } ${!team.is_owner ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  {skill}
                </button>
              );
            })}
          </div>

          {team.is_owner && (
            <div className="flex items-center gap-2 pt-2 max-w-sm">
              <input
                type="text"
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
                onKeyDown={handleAddCustomSkill}
                placeholder="Custom skill + Enter..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-600 outline-none focus:border-purple-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (customSkill.trim() && !requiredSkills.includes(customSkill.trim())) {
                    handleSaveSkills([...requiredSkills, customSkill.trim()]);
                    setCustomSkill('');
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Add
              </button>
            </div>
          )}
        </div>

        {/* ─── 4. MEMBERS LIST ─── */}
        <div className="glass-card rounded-3xl p-6 sm:p-7 border border-purple-500/20 bg-[#0D1224]/80 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span>Team Members ({team.members?.length || 0})</span>
            </h3>

            <span className="text-xs text-slate-400">
              Capacity: {team.member_count} / {team.max_members}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {team.members?.map((member) => {
              const dp = member.developer_profile;
              const isOwner = member.role === 'owner';
              const initials = (member.profile?.full_name || 'Member')
                .split(' ')
                .slice(0, 2)
                .map((w) => w[0].toUpperCase())
                .join('');

              return (
                <div
                  key={member.id}
                  className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start justify-between gap-3 shadow-md"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {member.profile?.avatar_url ? (
                      <img
                        src={member.profile.avatar_url}
                        alt={member.profile.full_name || 'Member'}
                        className="w-10 h-10 rounded-full object-cover border border-purple-500/30 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-purple-950 border border-purple-500/30 flex items-center justify-center text-white font-bold text-xs shrink-0">
                        {initials}
                      </div>
                    )}

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/profile/${member.user_id}`}
                          className="text-sm font-bold text-white hover:text-purple-300 transition truncate"
                        >
                          {member.profile?.full_name || 'Developer'}
                        </Link>
                        {isOwner && (
                          <span title="Team Owner">
                            <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 capitalize">
                        {isOwner ? 'Team Owner & Lead' : 'Team Member'}
                      </p>

                      {/* Top Skills */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {dp?.top_languages?.slice(0, 3).map((l) => (
                          <span
                            key={l}
                            className="px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 text-[10px] font-medium"
                          >
                            {l}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Disband Confirmation Modal */}
      {showDisbandModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-rose-500/40 bg-[#0D1224] p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Disband Team?</h3>
            <p className="text-xs text-slate-300">
              Are you sure you want to disband <strong>{team.name}</strong>? All memberships and invitations will be cancelled. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDisbandModal(false)}
                disabled={isActionBusy}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDisbandTeam}
                disabled={isActionBusy}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition shadow-lg shadow-rose-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isActionBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Disband</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Confirmation Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-[#0D1224] p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Leave Team?</h3>
            <p className="text-xs text-slate-300">
              Are you sure you want to leave <strong>{team.name}</strong>? You will no longer have access to team operations.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowLeaveModal(false)}
                disabled={isActionBusy}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleLeaveTeam}
                disabled={isActionBusy}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isActionBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Leave</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
