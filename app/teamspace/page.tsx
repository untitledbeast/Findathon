/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { createBrowserClient } from '@supabase/ssr';
import Navbar from '@/components/Navbar';
import {
  Users,
  Sparkles,
  Trophy,
  Plus,
  ArrowRight,
  ExternalLink,
  Shield,
  EyeOff,
  Mail,
  Link2,
  UsersRound,
  ChevronRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import {
  TeamWithMemberCount,
  TeamInvitation,
  TeammateRecommendation,
  DeveloperVisibility
} from '@/lib/teamspace/types';
import TeamFitArc from '@/components/teamspace/TeamFitArc';
import DeveloperCard from '@/components/teamspace/DeveloperCard';
import TeamRow from '@/components/teamspace/TeamRow';
import SkeletonCard from '@/components/teamspace/SkeletonCard';
import CreateTeamModal from '@/components/teamspace/CreateTeamModal';
import InvitationsDrawer from '@/components/teamspace/InvitationsDrawer';
import VisibilityModal from '@/components/teamspace/VisibilityModal';

export default function TeamSpacePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // State
  const [myTeams, setMyTeams] = useState<TeamWithMemberCount[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [activeTeamDetail, setActiveTeamDetail] = useState<TeamWithMemberCount | null>(null);
  const [recommendations, setRecommendations] = useState<TeammateRecommendation[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<TeamInvitation[]>([]);
  const [visibility, setVisibility] = useState<DeveloperVisibility>({
    user_id: '',
    is_discoverable: true,
    looking_for_team: true,
    preferred_roles: [],
    updated_at: ''
  });

  // Loading states
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [loadingInvs, setLoadingInvs] = useState(true);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [invitedUserIds, setInvitedUserIds] = useState<Set<string>>(new Set());

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isInvitationsDrawerOpen, setIsInvitationsDrawerOpen] = useState(false);
  const [isVisibilityModalOpen, setIsVisibilityModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const recommendationsRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Redirect if unauthenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [authLoading, user, router]);

  // Fetch initial data: Teams, Invitations, Visibility
  const fetchHubData = useCallback(async () => {
    if (!user) return;
    setLoadingTeams(true);
    setLoadingInvs(true);

    try {
      const [teamsRes, invsRes, visRes] = await Promise.all([
        fetch('/api/v1/teamspace/teams'),
        fetch('/api/v1/teamspace/invitations'),
        fetch('/api/v1/teamspace/visibility')
      ]);

      const [teamsJson, invsJson, visJson] = await Promise.all([
        teamsRes.json(),
        invsRes.json(),
        visRes.json()
      ]);

      if (teamsJson.success && Array.isArray(teamsJson.data)) {
        setMyTeams(teamsJson.data);
        if (teamsJson.data.length > 0) {
          setSelectedTeamId(teamsJson.data[0].id);
        }
      }

      if (invsJson.success && Array.isArray(invsJson.data)) {
        setPendingInvitations(invsJson.data);
      }

      if (visJson.success && visJson.data) {
        setVisibility(visJson.data);
      }
    } catch {
      showToast('Failed to load some team data. Please refresh.');
    } finally {
      setLoadingTeams(false);
      setLoadingInvs(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchHubData();
    }
  }, [user, fetchHubData]);

  // Fetch Active Team Detail and Recommendations
  const fetchTeamDetailAndRecs = useCallback(async (teamId: string | null) => {
    setLoadingRecs(true);
    if (teamId) {
      setLoadingDetail(true);
      try {
        const [teamDetailRes, recsRes] = await Promise.all([
          fetch(`/api/v1/teamspace/teams/${teamId}`),
          fetch(`/api/v1/teamspace/discover?team_id=${teamId}`)
        ]);

        const [teamDetailJson, recsJson] = await Promise.all([
          teamDetailRes.json(),
          recsRes.json()
        ]);

        if (teamDetailJson.success && teamDetailJson.data) {
          setActiveTeamDetail(teamDetailJson.data);
        }

        if (recsJson.success && Array.isArray(recsJson.data)) {
          setRecommendations(recsJson.data);
          const alreadyInvited = new Set<string>();
          recsJson.data.forEach((r: any) => {
            if (r.has_pending_invite) {
              alreadyInvited.add(r.developer.user_id);
            }
          });
          setInvitedUserIds(alreadyInvited);
        }
      } catch {
        // Error handling
      } finally {
        setLoadingDetail(false);
        setLoadingRecs(false);
      }
    } else {
      // No teams yet: fetch general discoverable developers
      try {
        const recsRes = await fetch('/api/v1/teamspace/discover');
        const recsJson = await recsRes.json();
        if (recsJson.success && Array.isArray(recsJson.data)) {
          setRecommendations(recsJson.data);
        }
      } catch {
        // Error handling
      } finally {
        setLoadingRecs(false);
        setActiveTeamDetail(null);
      }
    }
  }, []);

  useEffect(() => {
    if (user && !loadingTeams) {
      fetchTeamDetailAndRecs(selectedTeamId);
    }
  }, [user, loadingTeams, selectedTeamId, fetchTeamDetailAndRecs]);

  // ─── REALTIME SUBSCRIPTIONS (PART 7) ──────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 1. Subscribe to team_invitations for current user
    const invChannel = supabase
      .channel('teamspace-invitations')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_invitations',
          filter: `invited_user_id=eq.${user.id}`
        },
        async () => {
          showToast('New team invitation received!');
          // Refresh invitations list
          const res = await fetch('/api/v1/teamspace/invitations');
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setPendingInvitations(json.data);
          }
        }
      )
      .subscribe();

    // 2. Subscribe to team_members changes for user's teams
    const memberChannels = myTeams.map((team) =>
      supabase
        .channel(`team-${team.id}-members`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'team_members',
            filter: `team_id=eq.${team.id}`
          },
          () => {
            // Member count changed, refresh detail
            if (selectedTeamId === team.id) {
              fetchTeamDetailAndRecs(team.id);
            }
          }
        )
        .subscribe()
    );

    return () => {
      supabase.removeChannel(invChannel);
      memberChannels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [user, myTeams, selectedTeamId, fetchTeamDetailAndRecs]);

  // Handler: Invite developer
  const handleInviteDeveloper = async (candidateUserId: string) => {
    if (myTeams.length === 0) {
      setIsCreateModalOpen(true);
      return;
    }

    const targetTeamId = selectedTeamId || myTeams[0].id;
    setInvitingUserId(candidateUserId);

    try {
      const res = await fetch('/api/v1/teamspace/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: targetTeamId,
          invited_user_id: candidateUserId
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Failed to send invitation');
      }

      setInvitedUserIds((prev) => new Set([...prev, candidateUserId]));
      showToast('Invitation sent successfully!');
    } catch (err: any) {
      showToast(err.message || 'Failed to send invitation');
    } finally {
      setInvitingUserId(null);
    }
  };

  // Handler: Respond to invitation
  const handleRespondInvitation = async (invitationId: string, action: 'accepted' | 'declined') => {
    try {
      const res = await fetch(`/api/v1/teamspace/invitations/${invitationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || `Failed to ${action} invitation`);
      }

      // Remove invitation from pending state
      setPendingInvitations((prev) => prev.filter((i) => i.id !== invitationId));

      if (action === 'accepted') {
        showToast('Joined team successfully!');
        // Refresh teams
        fetchHubData();
      } else {
        showToast('Invitation declined');
      }
    } catch (err: any) {
      showToast(err.message || 'Error processing invitation');
    }
  };

  // Handler: Team created
  const handleTeamCreated = (newTeam: TeamWithMemberCount) => {
    setMyTeams((prev) => [newTeam, ...prev]);
    setSelectedTeamId(newTeam.id);
    showToast('Team created successfully!');
  };

  const scrollToRecommendations = () => {
    if (recommendationsRef.current) {
      recommendationsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#060816] text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          <span className="text-sm font-semibold text-slate-300">Loading TeamSpace...</span>
        </div>
      </div>
    );
  }

  const activeTeam = activeTeamDetail || (myTeams.length > 0 ? myTeams[0] : null);
  const teamFit = activeTeamDetail?.team_fit || {
    score: 0,
    confidence: 'low',
    covered_skills: [],
    gap_skills: [],
    reasons: []
  };

  return (
    <div className="min-h-screen bg-[#060816] text-[#F6F8FC] selection:bg-purple-500 selection:text-white pb-20">
      <Navbar />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-purple-950/90 border border-purple-500/40 text-sm font-semibold text-white shadow-2xl backdrop-blur-md animate-fade-in-up flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 space-y-8">
        {/* ─── PAGE HEADER ──────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-500/15 pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <span>TeamSpace</span>
              <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Live Beta
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Build the right team. Find developers whose skills complement yours and win together.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-600/20 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Create Team</span>
            </button>

            <button
              onClick={scrollToRecommendations}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-200 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-purple-400" />
              <span>Find Teammates</span>
            </button>
          </div>
        </div>

        {/* ─── MAIN TWO-COLUMN LAYOUT ───────────────────────────────────── */}
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* ─── LEFT COLUMN: MAIN CONTENT (flex-1) ─────────────────────── */}
          <div className="flex-1 w-full space-y-8 min-w-0">
            {/* ─── SECTION 1: ACTIVE TEAM CARD ─── */}
            {loadingTeams || loadingDetail ? (
              <div className="glass-card rounded-2xl p-6 border border-purple-500/15 bg-[#0D1224]/80 animate-pulse space-y-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800" />
                    <div className="space-y-2">
                      <div className="w-40 h-5 rounded bg-slate-800" />
                      <div className="w-24 h-3 rounded bg-slate-800/80" />
                    </div>
                  </div>
                  <div className="w-24 h-16 rounded bg-slate-800" />
                </div>
                <div className="h-10 rounded-xl bg-slate-800/60" />
              </div>
            ) : activeTeam ? (
              <div className="glass-card rounded-2xl p-6 sm:p-7 border border-purple-500/20 bg-[#0D1224]/85 shadow-xl relative overflow-hidden space-y-6">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

                {/* Top: Team Identity & Team Fit Arc */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 relative z-10">
                  {/* Left: Identity */}
                  <div className="flex items-start gap-4 min-w-0">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0 shadow-md border border-white/10"
                      style={{ backgroundColor: activeTeam.avatar_color ? `#${activeTeam.avatar_color}` : '#7C3AED' }}
                    >
                      {activeTeam.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg sm:text-xl font-bold text-white truncate">
                          {activeTeam.name}
                        </h2>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            activeTeam.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : activeTeam.status === 'full'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {activeTeam.status}
                        </span>
                      </div>

                      {/* Hackathon linked */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        {activeTeam.hackathon_title ? (
                          <Link
                            href={`/hackathons/${activeTeam.hackathon_id}`}
                            className="text-slate-300 hover:text-purple-300 font-medium flex items-center gap-1 transition truncate"
                          >
                            <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="truncate">{activeTeam.hackathon_title}</span>
                            <ExternalLink className="w-3 h-3 text-slate-500 shrink-0" />
                          </Link>
                        ) : (
                          <span className="text-slate-500 italic">No hackathon linked</span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400 font-medium">
                        {activeTeam.member_count} / {activeTeam.max_members} members • {activeTeam.status}
                      </p>
                    </div>
                  </div>

                  {/* Right: Team Fit Score & Arc */}
                  <div className="flex items-center sm:items-end flex-col bg-slate-900/60 p-3 sm:p-4 rounded-2xl border border-slate-800 shrink-0 self-start">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Team Fit
                    </span>
                    <div className="flex items-center gap-3">
                      <TeamFitArc score={teamFit.score} size={90} />
                      <div>
                        <span
                          className={`text-2xl font-black block leading-none ${
                            teamFit.score >= 80
                              ? 'text-emerald-400'
                              : teamFit.score >= 50
                              ? 'text-amber-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {teamFit.score}%
                        </span>
                        <span className="text-[10px] text-slate-400 capitalize font-medium">
                          {teamFit.confidence} confidence
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom: Covered skills vs Missing Gaps */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800/80">
                  {/* Covered Skills */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                      Covered ({teamFit.covered_skills.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {teamFit.covered_skills.length > 0 ? (
                        teamFit.covered_skills.map((skill) => (
                          <span
                            key={skill}
                            className="px-2 py-0.5 rounded-md bg-emerald-950/40 text-emerald-300 border border-emerald-500/20 text-[11px] font-medium"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic">No skills analyzed yet</span>
                      )}
                    </div>
                  </div>

                  {/* Missing Gaps */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
                      Missing Gaps ({teamFit.gap_skills.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {teamFit.gap_skills.length > 0 ? (
                        teamFit.gap_skills.map((gap) => (
                          <span
                            key={gap}
                            className="px-2 py-0.5 rounded-md bg-rose-950/40 text-rose-300 border border-rose-500/20 text-[11px] font-medium"
                          >
                            {gap}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Full capability coverage!</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action Link */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {teamFit.reasons[0] || 'Complementary developer matching enabled'}
                  </span>

                  <Link
                    href={`/teamspace/teams/${activeTeam.id}`}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-purple-500/40 transition flex items-center gap-1.5 shadow"
                  >
                    <span>Open Team Details</span>
                    <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
                  </Link>
                </div>
              </div>
            ) : (
              /* No Teams Yet CTA State */
              <div className="glass-card rounded-3xl p-8 sm:p-10 border border-purple-500/20 bg-[#0D1224]/70 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto shadow-xl">
                  <Users className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-lg font-bold text-white">Create your first team</h3>
                  <p className="text-xs sm:text-sm text-slate-400">
                    Form a team for an upcoming hackathon, define required skillsets, and let Findathon recommend the best complementary builders.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-xl shadow-purple-600/30 transition cursor-pointer"
                >
                  + Create Team
                </button>
              </div>
            )}

            {/* ─── SECTION 2: RECOMMENDED TEAMMATES ─────────────────────── */}
            <div ref={recommendationsRef} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>Recommended Teammates</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Developers who can strengthen your team&apos;s missing capabilities.
                  </p>
                </div>

                <Link
                  href={activeTeam ? `/teamspace/discover?team_id=${activeTeam.id}` : '/teamspace/discover'}
                  className="text-xs font-bold text-purple-400 hover:text-purple-300 transition flex items-center gap-1"
                >
                  <span>View all</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Recommendations Horizontal Scroll Row */}
              {loadingRecs ? (
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              ) : recommendations.length === 0 ? (
                <div className="glass-card rounded-2xl p-8 text-center border border-slate-800 bg-slate-900/40 space-y-2">
                  <Users className="w-6 h-6 text-slate-500 mx-auto" />
                  <h4 className="text-sm font-bold text-white">No developers found</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    No discoverable builders available at this time. Invite teammates or check back soon.
                  </p>
                </div>
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-4 pt-1 pr-2 scrollbar-thin">
                  {recommendations.map((rec) => (
                    <DeveloperCard
                      key={rec.developer.user_id}
                      developer={rec}
                      onInvite={() => handleInviteDeveloper(rec.developer.user_id)}
                      inviting={invitingUserId === rec.developer.user_id}
                      invited={invitedUserIds.has(rec.developer.user_id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ─── SECTION 3: DISCOVERABILITY BANNER ────────────────────── */}
            <div className="pt-4">
              {visibility.is_discoverable ? (
                <div className="glass-card rounded-2xl p-5 border border-purple-500/25 bg-purple-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Your profile is discoverable</h4>
                      <p className="text-xs text-slate-400">
                        Other developers and hackathon leads can find and invite you for team opportunities.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsVisibilityModalOpen(true)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-purple-200 bg-purple-900/40 hover:bg-purple-900/70 border border-purple-500/30 transition shrink-0 cursor-pointer"
                  >
                    Manage Visibility
                  </button>
                </div>
              ) : (
                <div className="glass-card rounded-2xl p-5 border border-slate-800 bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                      <EyeOff className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Your profile is hidden</h4>
                      <p className="text-xs text-slate-400">
                        Other developers cannot find you for teams in discovery or recommendations.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsVisibilityModalOpen(true)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition shrink-0 cursor-pointer shadow"
                  >
                    Make Discoverable
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ─── RIGHT SIDEBAR (w-72, hidden on mobile, shown md+) ─────── */}
          <aside className="w-full md:w-72 space-y-6 shrink-0">
            {/* ─── QUICK ACTIONS CARD ─── */}
            <div className="glass-card rounded-2xl p-5 border border-purple-500/15 bg-[#0D1224]/80 shadow-lg space-y-4">
              <h4 className="text-sm font-bold text-white">Quick Actions</h4>

              <div className="space-y-1">
                {/* 1. Find Teammates */}
                <button
                  onClick={scrollToRecommendations}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-900/80 transition text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-purple-950/60 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 group-hover:scale-105 transition">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-white block truncate">Find Teammates</span>
                      <span className="text-[10px] text-slate-400 block truncate">Discover and connect</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition shrink-0" />
                </button>

                {/* 2. My Teams */}
                <button
                  onClick={() => {
                    if (myTeams.length > 0) {
                      router.push(`/teamspace/teams/${myTeams[0].id}`);
                    } else {
                      setIsCreateModalOpen(true);
                    }
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-900/80 transition text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-950/60 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 group-hover:scale-105 transition">
                      <UsersRound className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-white block truncate">My Teams</span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {myTeams.length} {myTeams.length === 1 ? 'team' : 'teams'}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition shrink-0" />
                </button>

                {/* 3. Invitations */}
                <button
                  onClick={() => setIsInvitationsDrawerOpen(true)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-900/80 transition text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-rose-950/60 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0 group-hover:scale-105 transition relative">
                      <Mail className="w-4 h-4" />
                      {pendingInvitations.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-[#0D1224]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-white block truncate">Invitations</span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        Manage your invitations
                      </span>
                    </div>
                  </div>
                  {pendingInvitations.length > 0 ? (
                    <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                      {pendingInvitations.length}
                    </span>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition shrink-0" />
                  )}
                </button>

                {/* 4. Connections */}
                <button
                  onClick={() => showToast('Developer network connections coming soon!')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-900/80 transition text-left group cursor-pointer opacity-70 hover:opacity-100"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                      <Link2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-white block truncate">Connections</span>
                      <span className="text-[10px] text-slate-400 block truncate">Coming soon</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                </button>
              </div>
            </div>

            {/* ─── MY TEAMS CARD ─── */}
            <div className="glass-card rounded-2xl p-5 border border-purple-500/15 bg-[#0D1224]/80 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">My Teams</h4>
                {myTeams.length > 3 && (
                  <span className="text-[11px] text-purple-400 font-semibold">
                    {myTeams.length} total
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {loadingTeams ? (
                  <div className="space-y-2">
                    <div className="h-12 rounded-xl bg-slate-800/60 animate-pulse" />
                    <div className="h-12 rounded-xl bg-slate-800/60 animate-pulse" />
                  </div>
                ) : myTeams.length === 0 ? (
                  <div className="text-center py-6 space-y-2">
                    <p className="text-xs text-slate-400">No teams yet</p>
                  </div>
                ) : (
                  myTeams.slice(0, 3).map((team) => (
                    <TeamRow
                      key={team.id}
                      team={team}
                      isSelected={selectedTeamId === team.id}
                      onSelect={() => setSelectedTeamId(team.id)}
                    />
                  ))
                )}

                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="w-full py-2.5 px-3 rounded-2xl border border-dashed border-purple-500/30 hover:border-purple-500/60 bg-purple-950/20 hover:bg-purple-950/40 text-xs font-bold text-purple-300 hover:text-white transition flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Team</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* ─── MODALS & DRAWERS ─────────────────────────────────────────── */}
      <CreateTeamModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleTeamCreated}
      />

      <InvitationsDrawer
        isOpen={isInvitationsDrawerOpen}
        onClose={() => setIsInvitationsDrawerOpen(false)}
        invitations={pendingInvitations}
        onRespond={handleRespondInvitation}
        loading={loadingInvs}
      />

      <VisibilityModal
        isOpen={isVisibilityModalOpen}
        onClose={() => setIsVisibilityModalOpen(false)}
        onUpdated={(newVis) => setVisibility(newVis)}
      />
    </div>
  );
}
