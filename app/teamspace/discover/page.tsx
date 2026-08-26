/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Users,
  Sparkles,
  ArrowLeft,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Info
} from 'lucide-react';
import { TeamDTO, TeammateCandidateDTO, TeamCompatibilityResultDTO } from '@/types';
import TeammateCandidateCard from '@/components/teamspace/TeammateCandidateCard';
import TeamIntelligenceCard from '@/components/teamspace/TeamIntelligenceCard';

function TeammateDiscoveryContent() {
  const searchParams = useSearchParams();
  const hackathonId = searchParams.get('hackathon');

  const { user, loading: authLoading, signInWithGoogle } = useAuth();

  const [activeTeam, setActiveTeam] = useState<TeamDTO | null>(null);
  const [candidates, setCandidates] = useState<TeammateCandidateDTO[]>([]);
  const [intelligence, setIntelligence] = useState<TeamCompatibilityResultDTO | null>(null);
  const [hackathonTitle, setHackathonTitle] = useState<string>('Hackathon');
  const [loading, setLoading] = useState(true);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Team creation state (when user doesn't have an active team for this hackathon yet)
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadDiscoveryData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch user's teams to see if they already have an active team for this hackathon
      const res = await fetch('/api/v1/teamspace');
      const json = await res.json();
      if (!json.success) {
        showToast(json.error?.message || 'Failed to load team data', 'error');
        setLoading(false);
        return;
      }

      const userTeams: TeamDTO[] = json.data?.teams || [];
      const found = hackathonId ? userTeams.find(t => t.hackathonId === hackathonId) : userTeams[0];

      if (found) {
        setActiveTeam(found);
        setHackathonTitle(found.hackathon?.title || 'Hackathon');

        // 2. Fetch team recommendations and intelligence
        const [recRes, intelRes] = await Promise.all([
          fetch(`/api/v1/teams/${found.id}/recommendations`),
          fetch(`/api/v1/teams/${found.id}/intelligence`)
        ]);

        const recJson = await recRes.json();
        const intelJson = await intelRes.json();

        if (recJson.success && recJson.data?.candidates) {
          setCandidates(recJson.data.candidates);
        }
        if (intelJson.success && intelJson.data) {
          setIntelligence(intelJson.data);
        }
      } else {
        setActiveTeam(null);
        // Fetch hackathon title if hackathonId provided
        if (hackathonId) {
          const hRes = await fetch(`/api/v1/hackathons/${hackathonId}`);
          const hJson = await hRes.json();
          if (hJson.success && hJson.data?.title) {
            setHackathonTitle(hJson.data.title);
          }
        }
      }
    } catch {
      showToast('Failed to load teammate discovery', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, hackathonId, showToast]);

  useEffect(() => {
    if (!authLoading) {
      void loadDiscoveryData();
    }
  }, [authLoading, loadDiscoveryData]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hackathonId || !teamName.trim()) {
      showToast('Please enter a team name', 'error');
      return;
    }

    setCreatingTeam(true);
    try {
      const res = await fetch('/api/v1/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hackathonId,
          name: teamName.trim(),
          description: teamDescription.trim() || undefined,
          visibility: 'private'
        })
      });

      const json = await res.json();
      if (json.success && json.data?.team) {
        showToast('Team created successfully! ✨', 'success');
        loadDiscoveryData();
      } else {
        showToast(json.error?.message || 'Failed to create team', 'error');
      }
    } catch {
      showToast('Failed to create team', 'error');
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleInvite = async (candidateUserId: string, message?: string) => {
    if (!activeTeam) return;
    setInvitingId(candidateUserId);
    try {
      const res = await fetch(`/api/v1/teams/${activeTeam.id}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteeUserId: candidateUserId,
          message
        })
      });

      const json = await res.json();
      if (json.success) {
        showToast('Invitation sent to candidate! 🚀', 'success');
        setCandidates(prev =>
          prev.map(c => c.userId === candidateUserId ? { ...c, hasPendingInvite: true, invitationState: 'pending' } : c)
        );
      } else {
        showToast(json.error?.message || 'Failed to send invitation', 'error');
        throw new Error(json.error?.message);
      }
    } catch (err) {
      throw err;
    } finally {
      setInvitingId(null);
    }
  };

  const handleConnect = async (candidateUserId: string) => {
    setConnectingId(candidateUserId);
    try {
      const res = await fetch('/api/v1/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: candidateUserId })
      });

      const json = await res.json();
      if (json.success) {
        showToast('Connection request sent! 🤝', 'success');
        setCandidates(prev =>
          prev.map(c => c.userId === candidateUserId ? { ...c, connectionState: 'pending_sent' } : c)
        );
      } else {
        showToast(json.error?.message || 'Failed to send connection request', 'error');
        throw new Error(json.error?.message);
      }
    } catch (err) {
      throw err;
    } finally {
      setConnectingId(null);
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen bg-[#070913] pt-28 pb-16 px-4">
        <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
          <div className="h-32 bg-slate-900/60 rounded-3xl" />
          <div className="h-96 bg-slate-900/40 rounded-3xl" />
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#070913] pt-28 pb-16 px-4">
        <div className="max-w-xl mx-auto text-center space-y-6 pt-16">
          <div className="w-16 h-16 rounded-3xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-400 mx-auto">
            <Users className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-white">Find Teammates</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Sign in to discover complementary builders with verified skills that match the requirements of {hackathonTitle}.
          </p>
          <button
            onClick={signInWithGoogle}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-purple-950/50 transition-all cursor-pointer"
          >
            Sign in with Google
          </button>
        </div>
      </main>
    );
  }

  const isSparse = intelligence?.explanationCodes?.includes('SPARSE_HACKATHON_REQUIREMENTS') ||
    intelligence?.explanationCodes?.includes('SPARSE_TEAM_EVIDENCE') ||
    intelligence?.confidence === 'low';

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

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href={activeTeam ? `/teamspace/${activeTeam.id}` : '/teamspace'}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{activeTeam ? `Back to ${activeTeam.name}` : 'Back to TeamSpace'}</span>
          </Link>

          {hackathonId && (
            <Link
              href={`/hackathons/${hackathonId}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-300 hover:text-white transition-colors"
            >
              <span>View Hackathon Details</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>

        {/* Header Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-purple-900/40 bg-gradient-to-br from-[#0D1224]/90 via-[#0a0f29]/80 to-[#060816]/90 p-6 md:p-8 backdrop-blur-2xl shadow-2xl space-y-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 border border-purple-500/30 text-purple-300">
              <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span>Teammate Discovery • Complementary Skill Matching</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Find Teammates for {hackathonTitle}
            </h1>
            <p className="text-slate-400 text-xs md:text-sm max-w-2xl leading-relaxed">
              Findathon evaluates your team&apos;s capability coverage and ranks discoverable builders who fill critical project gaps.
            </p>
          </div>
        </div>

        {/* Insufficient-Evidence Warning Banner */}
        {isSparse && (
          <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3 text-amber-200 text-xs leading-relaxed">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300 block mb-0.5">Low-Confidence Profile Signal</span>
              Team or hackathon capability evidence is sparse. Recommendation scores prioritize general technical breadth and verified problem-solving ability.
            </div>
          </div>
        )}

        {/* State A: User does NOT have a team for this hackathon yet */}
        {!loading && !activeTeam && (
          <div className="glass-card rounded-3xl border border-purple-900/40 p-6 md:p-8 bg-[#0D1224]/80 backdrop-blur-2xl max-w-xl mx-auto space-y-6">
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 rounded-2xl bg-purple-950 border border-purple-500/40 flex items-center justify-center text-purple-300 mx-auto">
                <Plus className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Create a Team to Start Finding Teammates</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Give your team a name to compute capability gaps and discover builders with complementary skills for {hackathonTitle}.
              </p>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">Team Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quantum Builders, AI Syndicate"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-purple-900/60 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">Project Track / Idea (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Briefly describe what you're building or the roles you need..."
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-purple-900/60 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={creatingTeam || !teamName.trim()}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-purple-950/50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{creatingTeam ? 'Creating Team...' : 'Create Team & Discover Candidates'}</span>
              </button>
            </form>
          </div>
        )}

        {/* State B: User HAS an active team -> Show Intelligence breakdown + Recommended Candidates */}
        {activeTeam && (
          <div className="space-y-8">
            {/* Top Intelligence & Gap Summary */}
            {intelligence && (
              <TeamIntelligenceCard intelligence={intelligence} loading={false} />
            )}

            {/* Candidates Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>Recommended Complementary Candidates ({candidates.length})</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ranked by marginal capability contribution and critical gap resolution.
                  </p>
                </div>
              </div>

              {candidates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {candidates.map(candidate => (
                    <TeammateCandidateCard
                      key={candidate.userId}
                      candidate={candidate}
                      onInvite={handleInvite}
                      onConnect={handleConnect}
                      isInviting={invitingId === candidate.userId}
                      isConnecting={connectingId === candidate.userId}
                    />
                  ))}
                </div>
              ) : (
                <div className="glass-card rounded-3xl p-8 border border-purple-900/30 text-center space-y-3 bg-[#0D1224]/50">
                  <ShieldCheck className="w-10 h-10 text-slate-500 mx-auto" />
                  <h3 className="text-base font-bold text-white">No Additional Discoverable Candidates Found</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    All currently available discoverable builders are either in active teams for this hackathon or your team already has high capability coverage.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function TeammateDiscoveryPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#070913] pt-28 pb-16 px-4">
        <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
          <div className="h-32 bg-slate-900/60 rounded-3xl" />
          <div className="h-96 bg-slate-900/40 rounded-3xl" />
        </div>
      </main>
    }>
      <TeammateDiscoveryContent />
    </Suspense>
  );
}
