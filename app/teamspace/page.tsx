/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Users,
  ArrowRight,
  Check,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Plus,
  Compass,
  Sparkles,
  ExternalLink,
  Lock,
  UserCheck,
  Calendar,
  MapPin,
  Trophy
} from 'lucide-react';
import {
  TeamDTO,
  TeamInvitationDTO,
  ConnectionDTO,
  TeammateCandidateDTO,
  TeamCompatibilityResultDTO
} from '@/types';
import TeammateCandidateCard from '@/components/teamspace/TeammateCandidateCard';
import TeamIntelligenceCard from '@/components/teamspace/TeamIntelligenceCard';

export default function TeamSpaceHubPage() {
  const router = useRouter();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();

  const [teams, setTeams] = useState<TeamDTO[]>([]);
  const [selectedTeamIndex, setSelectedTeamIndex] = useState(0);
  const [invitations, setInvitations] = useState<TeamInvitationDTO[]>([]);
  const [incomingConnections, setIncomingConnections] = useState<ConnectionDTO[]>([]);
  const [discoverable, setDiscoverable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingConsent, setSavingConsent] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Active Team Intelligence & Candidates
  const [activeIntelligence, setActiveIntelligence] = useState<TeamCompatibilityResultDTO | null>(null);
  const [candidates, setCandidates] = useState<TeammateCandidateDTO[]>([]);
  const [intelLoading, setIntelLoading] = useState(false);

  // Recommended Hackathons for Empty State
  const [recommendedHackathons, setRecommendedHackathons] = useState<any[]>([]);

  // Create Team Modal State
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [selectedHackathonId, setSelectedHackathonId] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadHubData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [teamspaceRes, connRes, hackRes] = await Promise.all([
        fetch('/api/v1/teamspace'),
        fetch('/api/v1/connections'),
        fetch('/api/v1/hackathons/recommended')
      ]);

      const tsJson = await teamspaceRes.json();
      const connJson = await connRes.json();
      const hackJson = await hackRes.json();

      if (tsJson.success && tsJson.data) {
        setTeams(tsJson.data.teams || []);
        setInvitations(tsJson.data.pendingInvitations || []);
        setDiscoverable(Boolean(tsJson.data.discoverableForTeams));
      }

      if (connJson.success && connJson.data) {
        setIncomingConnections(connJson.data.pendingReceived || []);
      }

      if (hackJson.success && hackJson.data) {
        setRecommendedHackathons(hackJson.data || []);
      }
    } catch {
      showToast('Failed to load TeamSpace data', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    if (!authLoading) {
      void loadHubData();
    }
  }, [authLoading, loadHubData]);

  // Active Primary Team
  const activeTeam = teams[selectedTeamIndex] || null;

  const loadActiveTeamDetails = useCallback(async (teamId: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIntelLoading(true);
    try {
      const [intelRes, candRes] = await Promise.all([
        fetch(`/api/v1/teams/${teamId}/intelligence`, { signal: controller.signal }),
        fetch(`/api/v1/teams/${teamId}/recommendations?limit=3`, { signal: controller.signal })
      ]);

      const intelJson = await intelRes.json();
      const candJson = await candRes.json();

      if (intelJson.success && intelJson.data) {
        setActiveIntelligence(intelJson.data);
      } else {
        setActiveIntelligence(null);
      }

      if (candJson.success && candJson.data) {
        setCandidates(candJson.data.candidates || []);
      } else {
        setCandidates([]);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setActiveIntelligence(null);
        setCandidates([]);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setIntelLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (activeTeam?.id) {
      void loadActiveTeamDetails(activeTeam.id);
    } else {
      setActiveIntelligence(null);
      setCandidates([]);
    }
  }, [activeTeam?.id, loadActiveTeamDetails]);

  // Connection Handlers
  const handleAcceptConnection = async (connectionId: string) => {
    try {
      const res = await fetch(`/api/v1/connections/${connectionId}/accept`, {
        method: 'POST'
      });
      const json = await res.json();
      if (json.success) {
        showToast('Connection accepted!', 'success');
        setIncomingConnections(prev => prev.filter(c => c.id !== connectionId));
        void loadHubData();
      } else {
        showToast(json.error?.message || 'Failed to accept connection', 'error');
      }
    } catch {
      showToast('Error accepting connection', 'error');
    }
  };

  const handleDeclineConnection = async (connectionId: string) => {
    try {
      const res = await fetch(`/api/v1/connections/${connectionId}/decline`, {
        method: 'POST'
      });
      const json = await res.json();
      if (json.success) {
        showToast('Connection declined', 'success');
        setIncomingConnections(prev => prev.filter(c => c.id !== connectionId));
      } else {
        showToast(json.error?.message || 'Failed to decline connection', 'error');
      }
    } catch {
      showToast('Error declining connection', 'error');
    }
  };

  // Invitation Handlers
  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      const res = await fetch(`/api/v1/invitations/${invitationId}/accept`, {
        method: 'POST'
      });
      const json = await res.json();
      if (json.success) {
        showToast('Joined team successfully!', 'success');
        void loadHubData();
      } else {
        showToast(json.error?.message || 'Failed to accept invitation', 'error');
      }
    } catch {
      showToast('Error accepting invitation', 'error');
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    try {
      const res = await fetch(`/api/v1/invitations/${invitationId}/decline`, {
        method: 'POST'
      });
      const json = await res.json();
      if (json.success) {
        showToast('Invitation declined', 'success');
        setInvitations(prev => prev.filter(i => i.id !== invitationId));
      } else {
        showToast(json.error?.message || 'Failed to decline invitation', 'error');
      }
    } catch {
      showToast('Error declining invitation', 'error');
    }
  };

  // Candidate Actions
  const handleInviteCandidate = async (targetUserId: string, message?: string) => {
    if (!activeTeam) return;
    try {
      const res = await fetch(`/api/v1/teams/${activeTeam.id}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteeUserId: targetUserId,
          message: message || undefined
        })
      });
      const json = await res.json();
      if (json.success) {
        showToast('Invitation sent successfully!', 'success');
      } else {
        showToast(json.error?.message || 'Failed to send invitation', 'error');
        throw new Error(json.error?.message);
      }
    } catch (err: any) {
      if (!toast) showToast(err?.message || 'Failed to send invitation', 'error');
      throw err;
    }
  };

  const handleConnectCandidate = async (targetUserId: string) => {
    try {
      const res = await fetch('/api/v1/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId })
      });
      const json = await res.json();
      if (json.success) {
        showToast('Connection request sent!', 'success');
      } else {
        showToast(json.error?.message || 'Failed to send connection request', 'error');
        throw new Error(json.error?.message);
      }
    } catch (err: any) {
      if (!toast) showToast(err?.message || 'Failed to connect', 'error');
      throw err;
    }
  };

  const handleToggleDiscoverability = async () => {
    setSavingConsent(true);
    const newValue = !discoverable;
    try {
      const res = await fetch('/api/v1/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discoverableForTeams: newValue })
      });
      const json = await res.json();
      if (json.success) {
        setDiscoverable(newValue);
        showToast(
          newValue
            ? 'Teammate discovery enabled! Other builders can now suggest your profile.'
            : 'Teammate discovery turned off. Your profile is now private from suggestions.',
          'success'
        );
      } else {
        showToast(json.error?.message || 'Failed to update discovery settings', 'error');
      }
    } catch {
      showToast('Error updating discoverability preference', 'error');
    } finally {
      setSavingConsent(false);
    }
  };

  const handleCreateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHackathonId || !newTeamName.trim()) {
      showToast('Please select a hackathon and enter a team name', 'error');
      return;
    }

    setCreatingTeam(true);
    try {
      const res = await fetch('/api/v1/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hackathonId: selectedHackathonId,
          name: newTeamName.trim(),
          description: newTeamDescription.trim() || undefined,
          visibility: 'private'
        })
      });

      const json = await res.json();
      if (json.success && json.data?.team) {
        showToast('Team created successfully! ✨', 'success');
        setShowCreateTeamModal(false);
        setNewTeamName('');
        setNewTeamDescription('');
        void loadHubData();
      } else {
        showToast(json.error?.message || 'Failed to create team', 'error');
      }
    } catch {
      showToast('Error creating team', 'error');
    } finally {
      setCreatingTeam(false);
    }
  };

  // Helper formatting for dates
  const formatDateRange = (start?: string, end?: string) => {
    if (!start || !end) return null;
    try {
      const s = new Date(start);
      const e = new Date(end);
      return `${s.getDate()} ${s.toLocaleString('en-US', { month: 'short' })} – ${e.getDate()} ${e.toLocaleString('en-US', { month: 'short' })} ${e.getFullYear()}`;
    } catch {
      return null;
    }
  };

  // Unauthenticated State
  if (!user && !authLoading) {
    return (
      <div className="min-h-screen bg-[#070913] text-slate-100 pt-28 pb-16 px-4 flex items-center justify-center">
        <div className="glass-card max-w-md w-full p-8 rounded-3xl border border-purple-900/40 bg-[#0D1224]/80 backdrop-blur-xl text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-purple-950 border border-purple-600/40 flex items-center justify-center mx-auto text-purple-300">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">TeamSpace Access</h1>
            <p className="text-sm text-slate-400">
              Sign in to manage your hackathon teams, find complementary builders, and view verified team intelligence.
            </p>
          </div>
          <button
            onClick={() => signInWithGoogle()}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-950/50 transition cursor-pointer"
          >
            Sign In with Google
          </button>
        </div>
      </div>
    );
  }

  // Loading Skeleton State
  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#070913] text-slate-100 pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-8 w-44 bg-purple-950/50 rounded-xl" />
              <div className="h-4 w-72 bg-slate-900 rounded-lg" />
            </div>
            <div className="h-10 w-48 bg-slate-900 rounded-2xl" />
          </div>
          <div className="h-56 rounded-3xl bg-[#0D1224]/60 border border-purple-900/30" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="h-64 rounded-2xl bg-[#0D1224]/40 border border-slate-800" />
            <div className="h-64 rounded-2xl bg-[#0D1224]/40 border border-slate-800" />
            <div className="h-64 rounded-2xl bg-[#0D1224]/40 border border-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  const spotsLeft = activeTeam ? Math.max(0, activeTeam.maxMembers - activeTeam.memberCount) : 0;
  const capacityPercent = activeTeam ? Math.round((activeTeam.memberCount / activeTeam.maxMembers) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 pt-28 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Toast Alert */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-center gap-2.5 text-sm font-semibold animate-in fade-in slide-in-from-bottom-5 ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{toast.text}</span>
          </div>
        )}

        {/* ─── HEADER: TITLE & DISCOVERABILITY SWITCH ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">TeamSpace</h1>
              <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
            </div>
            <p className="text-sm text-slate-400 font-medium">
              Build the right team. Win together.
            </p>
          </div>

          {/* Discoverable Toggle Bar */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-[#0D1224]/80 border border-purple-900/40 backdrop-blur-xl shadow-md">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>Discoverable for teammates</span>
            </div>

            <button
              onClick={handleToggleDiscoverability}
              disabled={savingConsent}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer disabled:opacity-50 ${
                discoverable ? 'bg-purple-600' : 'bg-slate-800'
              }`}
              aria-label="Toggle teammate discoverability"
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  discoverable ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* ─── IF USER HAS AT LEAST ONE ACTIVE TEAM ─── */}
        {activeTeam ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* ─── MAIN COLUMN (8 COLS) ─── */}
            <div className="lg:col-span-8 space-y-7">
              {/* Multiple Teams Switcher (if > 1 team) */}
              {teams.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
                    Switch Team:
                  </span>
                  {teams.map((t, idx) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTeamIndex(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition flex items-center gap-2 cursor-pointer ${
                        selectedTeamIndex === idx
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      <span>{t.name}</span>
                      <span className="text-[10px] opacity-70">({t.memberCount}/{t.maxMembers})</span>
                    </button>
                  ))}
                </div>
              )}

              {/* 1. PRIMARY ACTIVE TEAM CARD (Matching Image 1) */}
              <div className="glass-card rounded-3xl border border-purple-900/40 p-6 md:p-8 bg-[#0D1224]/85 backdrop-blur-xl relative overflow-hidden shadow-2xl space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  {/* Left: Avatar, Name, Hackathon, Status, Dates, Avatar Stack */}
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 border border-purple-400/40 flex items-center justify-center text-white font-extrabold text-lg shadow-lg shrink-0">
                      {activeTeam.name.substring(0, 2).toUpperCase()}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-2xl font-extrabold text-white tracking-tight">
                          {activeTeam.name}
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-950/80 text-amber-300 border border-amber-800">
                          {activeTeam.status}
                        </span>
                      </div>

                      <p className="text-xs text-purple-300 font-semibold">
                        {activeTeam.hackathon?.title || 'Hackathon Team'}
                      </p>

                      {activeTeam.hackathon?.startDate && activeTeam.hackathon?.endDate && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{formatDateRange(activeTeam.hackathon.startDate, activeTeam.hackathon.endDate)}</span>
                        </div>
                      )}

                      {/* Member Avatars Stack */}
                      <div className="flex items-center gap-1.5 pt-2">
                        {(activeTeam.members || []).slice(0, 4).map((m, i) => (
                          <div
                            key={m.id || i}
                            className="w-8 h-8 rounded-full bg-purple-950 border-2 border-[#0D1224] flex items-center justify-center text-[11px] font-bold text-purple-300 shadow-sm"
                            title={m.profile?.fullName || 'Team Member'}
                          >
                            {m.profile?.fullName ? m.profile.fullName.charAt(0).toUpperCase() : 'M'}
                          </div>
                        ))}
                        {activeTeam.memberCount > 4 && (
                          <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-[#0D1224] flex items-center justify-center text-[10px] font-bold text-slate-400">
                            +{activeTeam.memberCount - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Members Count & Progress Bar */}
                  <div className="space-y-2 min-w-[160px]">
                    <div className="flex items-baseline justify-between text-xs font-bold">
                      <span className="text-slate-400">Members</span>
                      <span className="text-white font-mono text-base">
                        {activeTeam.memberCount} / {activeTeam.maxMembers}
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${capacityPercent}%` }}
                      />
                    </div>

                    <span className="text-[11px] font-semibold text-purple-400 block text-right">
                      {spotsLeft === 0 ? 'Team Full' : `${spotsLeft} spot${spotsLeft > 1 ? 's' : ''} left`}
                    </span>
                  </div>

                  {/* Right: Open Team CTA */}
                  <div className="shrink-0">
                    <Link
                      href={`/teamspace/${activeTeam.id}`}
                      className="px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xl shadow-purple-950/60 transition flex items-center gap-2"
                    >
                      <span>Open Team</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* 2. TEAM INTELLIGENCE CARD (Real deterministic analysis & Radar) */}
              <TeamIntelligenceCard intelligence={activeIntelligence} loading={intelLoading} />

              {/* 3. RECOMMENDED TEAMMATES SECTION */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">Recommended Teammates</h3>
                    <p className="text-xs text-slate-400">People who can help fill your gaps</p>
                  </div>

                  <Link
                    href={`/teamspace/discover?hackathon=${activeTeam.hackathonId}`}
                    className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    <span>View all</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                {candidates.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {candidates.slice(0, 3).map(candidate => (
                      <TeammateCandidateCard
                        key={candidate.userId}
                        candidate={candidate}
                        onInvite={handleInviteCandidate}
                        onConnect={handleConnectCandidate}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="glass-card rounded-2xl border border-purple-900/30 p-6 bg-[#0D1224]/60 text-center space-y-2">
                    <ShieldCheck className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="text-xs font-semibold text-white">No Additional Teammates Found</p>
                    <p className="text-[11px] text-slate-400">
                      All available discoverable builders are in teams or your team has full coverage.
                    </p>
                  </div>
                )}

                {/* Looking for more teammates banner */}
                <div className="glass-card rounded-2xl border border-purple-900/40 p-5 bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-[#0D1224]/80 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Looking for more great teammates?</h4>
                      <p className="text-[11px] text-slate-400">
                        Explore more developers who match your team&apos;s missing skills.
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/teamspace/discover?hackathon=${activeTeam.hackathonId}`}
                    className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <span>Find Teammates</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* ─── SIDEBAR COLUMN (4 COLS) ─── */}
            <div className="lg:col-span-4 space-y-5">
              {/* Connection Requests Card (Rendered if > 0) */}
              {incomingConnections.length > 0 && (
                <div className="glass-card rounded-3xl border border-purple-900/40 p-5 bg-[#0D1224]/85 backdrop-blur-xl space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-white">Connection requests</h3>
                      <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center">
                        {incomingConnections.length}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {incomingConnections.map(conn => (
                      <div
                        key={conn.id}
                        className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-purple-950 border border-purple-600/30 flex items-center justify-center text-xs font-bold text-purple-300 shrink-0">
                            {conn.partner?.fullName ? conn.partner.fullName.charAt(0).toUpperCase() : 'D'}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">
                              {conn.partner?.fullName || 'Developer'}
                            </h4>
                            <p className="text-[10px] text-slate-400">Wants to connect</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleAcceptConnection(conn.id)}
                            className="w-7 h-7 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 flex items-center justify-center transition cursor-pointer"
                            title="Accept connection"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeclineConnection(conn.id)}
                            className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 flex items-center justify-center transition cursor-pointer"
                            title="Decline connection"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Team Invitations Card (Rendered if > 0) */}
              {invitations.length > 0 && (
                <div className="glass-card rounded-3xl border border-purple-900/40 p-5 bg-[#0D1224]/85 backdrop-blur-xl space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-white">Team invitations</h3>
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                        {invitations.length}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {invitations.map(inv => (
                      <div
                        key={inv.id}
                        className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-600/30 flex items-center justify-center text-xs font-bold text-indigo-300 shrink-0">
                            {inv.team?.name ? inv.team.name.charAt(0).toUpperCase() : 'T'}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">
                              {inv.team?.name || 'Hackathon Team'}
                            </h4>
                            <p className="text-[10px] text-slate-400">Invited you to join</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleAcceptInvitation(inv.id)}
                            className="w-7 h-7 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 flex items-center justify-center transition cursor-pointer"
                            title="Accept invitation"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeclineInvitation(inv.id)}
                            className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 flex items-center justify-center transition cursor-pointer"
                            title="Decline invitation"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* My Other Teams Card (if user in multiple teams) */}
              {teams.length > 1 && (
                <div className="glass-card rounded-3xl border border-slate-800 p-5 bg-[#0D1224]/85 backdrop-blur-xl space-y-3.5">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    My Other Teams
                  </h3>

                  <div className="space-y-2">
                    {teams
                      .filter((_, idx) => idx !== selectedTeamIndex)
                      .map(t => (
                        <div
                          key={t.id}
                          className="p-3 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{t.name}</h4>
                            <p className="text-[10px] text-slate-400 truncate">{t.hackathon?.title}</p>
                            <span className="text-[10px] font-mono text-slate-500">
                              {t.memberCount}/{t.maxMembers} members
                            </span>
                          </div>

                          <Link
                            href={`/teamspace/${t.id}`}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold shrink-0"
                          >
                            Open →
                          </Link>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ─── IF USER HAS NO ACTIVE TEAM (Matching Image 2) ─── */
          <div className="space-y-10">
            {/* Top Hero with Orbital Constellation Graphic */}
            <div className="glass-card rounded-3xl border border-purple-900/40 p-8 md:p-12 bg-gradient-to-br from-[#0D1224]/90 via-[#0a0f29]/80 to-[#060816]/90 backdrop-blur-2xl relative overflow-hidden shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                {/* Hero Text */}
                <div className="md:col-span-7 space-y-3">
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                    Build better teams. <br />
                    <span className="text-gradient">Win together.</span>
                  </h2>
                  <p className="text-sm text-slate-400 max-w-lg leading-relaxed">
                    Find complementary teammates and build winning hackathon projects with verified capabilities.
                  </p>
                </div>

                {/* Orbital Constellation Graphic & Create Team CTA */}
                <div className="md:col-span-5 flex flex-col items-center md:items-end justify-center gap-4">
                  {/* Subtle Orbital Network Graphic */}
                  <div className="relative w-44 h-28 flex items-center justify-center">
                    {/* Ellipses */}
                    <div className="absolute w-40 h-20 rounded-full border border-purple-500/20 rotate-12" />
                    <div className="absolute w-36 h-16 rounded-full border border-indigo-500/20 -rotate-12" />
                    {/* Center glowing node */}
                    <div className="w-10 h-10 rounded-2xl bg-purple-950 border border-purple-500/60 flex items-center justify-center text-purple-300 shadow-lg shadow-purple-900/50 z-10">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                    </div>
                    {/* Orbiting nodes */}
                    <div className="absolute top-2 left-6 w-5 h-5 rounded-full bg-slate-900 border border-purple-400/40 flex items-center justify-center text-[8px] text-slate-300">
                      <Users className="w-2.5 h-2.5" />
                    </div>
                    <div className="absolute bottom-2 right-8 w-5 h-5 rounded-full bg-slate-900 border border-emerald-400/40 flex items-center justify-center text-[8px] text-slate-300">
                      <Users className="w-2.5 h-2.5" />
                    </div>
                    <div className="absolute top-4 right-6 w-4 h-4 rounded-full bg-slate-900 border border-indigo-400/40" />
                  </div>

                  {/* Create Team CTA Card */}
                  <button
                    onClick={() => setShowCreateTeamModal(true)}
                    className="w-full max-w-xs p-4 rounded-2xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/30 transition text-left cursor-pointer group shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white">
                          <Plus className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white group-hover:text-purple-300 transition">
                            Create Team
                          </h4>
                          <p className="text-[10px] text-slate-400">Start building your dream team</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Centered Empty State Container */}
            <div className="glass-card rounded-3xl border border-purple-900/30 p-8 md:p-12 bg-[#0D1224]/60 backdrop-blur-xl text-center space-y-5 max-w-2xl mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-purple-950/80 border border-purple-600/30 flex items-center justify-center mx-auto text-purple-300">
                <Users className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-white">You don&apos;t have an active team yet</h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                  Create a team or explore upcoming hackathons to find teammates who complement your skills.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link
                  href="/map"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Explore Hackathons</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() => setShowCreateTeamModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-bold text-xs transition cursor-pointer"
                >
                  + Create Team
                </button>
              </div>
            </div>

            {/* Recommended Hackathons Grid */}
            {recommendedHackathons.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-purple-400" />
                    <span>Recommended Hackathons</span>
                  </h3>
                  <Link
                    href="/map"
                    className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    <span>View all</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {recommendedHackathons.slice(0, 3).map(h => (
                    <div
                      key={h.id}
                      className="glass-card rounded-2xl border border-purple-900/30 p-5 bg-[#0D1224]/80 backdrop-blur-xl flex flex-col justify-between space-y-4 hover:border-purple-500/40 transition"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-950 text-purple-300 border border-purple-800">
                            {h.is_online ? 'Online' : h.location_city || 'In-Person'}
                          </span>
                          {h.dynamic_score && (
                            <span className="text-[10px] font-mono text-purple-400 font-bold">
                              {h.dynamic_score}% Match
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-white line-clamp-1">{h.title}</h4>
                        <p className="text-xs text-slate-400 line-clamp-2">{h.description}</p>
                      </div>

                      <div className="pt-2 border-t border-purple-950/40 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-500">
                          {formatDateRange(h.start_date, h.end_date) || 'Upcoming'}
                        </span>
                        <Link
                          href={`/teamspace/discover?hackathon=${h.id}`}
                          className="px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600 text-purple-300 hover:text-white font-bold text-xs transition"
                        >
                          Find Team →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── CREATE TEAM MODAL DIALOG ─── */}
        {showCreateTeamModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="glass-card max-w-md w-full p-6 rounded-3xl border border-purple-900/60 bg-[#0D1224] space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  <span>Create a Hackathon Team</span>
                </h3>
                <button
                  onClick={() => setShowCreateTeamModal(false)}
                  className="p-1 text-slate-400 hover:text-white cursor-pointer"
                  aria-label="Close dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTeamSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Select Hackathon *
                  </label>
                  <select
                    required
                    value={selectedHackathonId}
                    onChange={e => setSelectedHackathonId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="">Choose an upcoming hackathon...</option>
                    {recommendedHackathons.map(h => (
                      <option key={h.id} value={h.id}>
                        {h.title} ({h.is_online ? 'Online' : h.location_city || 'In-Person'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Team Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Quantum Builders, AI Syndicate"
                    value={newTeamName}
                    onChange={e => setNewTeamName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Project Idea / Track (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Briefly describe what you're planning to build..."
                    value={newTeamDescription}
                    onChange={e => setNewTeamDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-purple-950/60">
                  <button
                    type="button"
                    onClick={() => setShowCreateTeamModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingTeam || !selectedHackathonId || !newTeamName.trim()}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{creatingTeam ? 'Creating...' : 'Create Team'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
