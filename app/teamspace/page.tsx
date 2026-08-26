/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Users,
  Sparkles,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  UserCheck,
  UserX,
  Lock,
  UserPlus
} from 'lucide-react';
import { TeamDTO, TeamInvitationDTO, ConnectionDTO } from '@/types';

export default function TeamSpaceHubPage() {
  const router = useRouter();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();

  const [teams, setTeams] = useState<TeamDTO[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitationDTO[]>([]);
  const [incomingConnections, setIncomingConnections] = useState<ConnectionDTO[]>([]);
  const [acceptedConnections, setAcceptedConnections] = useState<ConnectionDTO[]>([]);
  const [discoverable, setDiscoverable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingConsent, setSavingConsent] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [teamspaceRes, connRes] = await Promise.all([
        fetch('/api/v1/teamspace'),
        fetch('/api/v1/connections')
      ]);

      const tsJson = await teamspaceRes.json();
      const connJson = await connRes.json();

      if (tsJson.success && tsJson.data) {
        setTeams(tsJson.data.teams || []);
        setInvitations(tsJson.data.pendingInvitations || []);
        setDiscoverable(Boolean(tsJson.data.discoverableForTeams));
      }

      if (connJson.success && connJson.data) {
        setIncomingConnections(connJson.data.pendingReceived || []);
        setAcceptedConnections(connJson.data.connections || []);
      }
    } catch {
      showToast('Failed to load TeamSpace data', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [authLoading, loadData]);

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
      showToast('Failed to update discovery settings', 'error');
    } finally {
      setSavingConsent(false);
    }
  };

  const handleAcceptInvite = async (invitationId: string) => {
    try {
      const res = await fetch(`/api/v1/invitations/${invitationId}/accept`, {
        method: 'POST'
      });
      const json = await res.json();
      if (json.success && json.data?.team) {
        showToast('Invitation accepted! Welcome to the team! ✨', 'success');
        loadData();
        router.push(`/teamspace/${json.data.team.id}`);
      } else {
        showToast(json.error?.message || 'Failed to accept invitation', 'error');
      }
    } catch {
      showToast('Failed to accept invitation', 'error');
    }
  };

  const handleDeclineInvite = async (invitationId: string) => {
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
      showToast('Failed to decline invitation', 'error');
    }
  };

  const handleAcceptConnection = async (connectionId: string) => {
    try {
      const res = await fetch(`/api/v1/connections/${connectionId}/accept`, {
        method: 'POST'
      });
      const json = await res.json();
      if (json.success) {
        showToast('Connection request accepted! 🤝', 'success');
        loadData();
      } else {
        showToast(json.error?.message || 'Failed to accept connection request', 'error');
      }
    } catch {
      showToast('Failed to accept connection request', 'error');
    }
  };

  const handleDeclineConnection = async (connectionId: string) => {
    try {
      const res = await fetch(`/api/v1/connections/${connectionId}/decline`, {
        method: 'POST'
      });
      const json = await res.json();
      if (json.success) {
        showToast('Connection request declined', 'success');
        setIncomingConnections(prev => prev.filter(c => c.id !== connectionId));
      } else {
        showToast(json.error?.message || 'Failed to decline connection request', 'error');
      }
    } catch {
      showToast('Failed to decline connection request', 'error');
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen bg-[#070913] pt-28 pb-16 px-4">
        <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
          <div className="h-44 bg-slate-900/60 rounded-3xl" />
          <div className="h-64 bg-slate-900/40 rounded-3xl" />
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
          <h1 className="text-3xl font-black text-white">Findathon TeamSpace</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Form complementary hackathon teams with verified developer intelligence, discover teammates based on required skill gaps, and collaborate seamlessly.
          </p>
          <button
            onClick={signInWithGoogle}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-purple-950/50 transition-all cursor-pointer"
          >
            Sign in with Google to Access TeamSpace
          </button>
        </div>
      </main>
    );
  }

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
        {/* Header Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-purple-900/40 bg-gradient-to-br from-[#0D1224]/90 via-[#0a0f29]/80 to-[#060816]/90 p-6 md:p-8 backdrop-blur-2xl shadow-2xl">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 border border-purple-500/30 text-purple-300">
                <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                <span>Deterministic Team Formation • Hackathon Intelligence</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                TeamSpace Hub
              </h1>
              <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
                Build and manage your hackathon teams. Find complementary teammates with verified skills that fill critical project gaps.
              </p>
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border border-purple-500/40 shadow-lg shadow-purple-950/40 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Explore Hackathons</span>
            </Link>
          </div>
        </div>

        {/* Teammate Discovery Consent Card */}
        <div className="glass-card rounded-2xl border border-purple-900/30 p-5 bg-[#0D1224]/60 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              discoverable ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Discoverable for Teammate Matching</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  discoverable ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {discoverable ? 'Opted In' : 'Private'}
                </span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                Allow Findathon Team Intelligence to suggest your verified skills to hackathon teams looking for your technical capabilities. We never share raw contact info or private code.
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleDiscoverability}
            disabled={savingConsent}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border disabled:opacity-50 ${
              discoverable
                ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-500/40 shadow-md'
            }`}
          >
            {savingConsent ? 'Saving...' : (discoverable ? 'Turn Off Discovery' : 'Enable Discovery')}
          </button>
        </div>

        {/* Incoming Connection Requests */}
        {incomingConnections.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-purple-400" />
              <span>Incoming Connection Requests ({incomingConnections.length})</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {incomingConnections.map(conn => (
                <div
                  key={conn.id}
                  className="glass-card rounded-2xl border border-purple-900/40 p-4 bg-[#0D1224]/80 backdrop-blur-xl flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-500/40 flex items-center justify-center text-purple-300 font-bold text-sm shrink-0">
                      {conn.partner?.fullName?.charAt(0).toUpperCase() || 'D'}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{conn.partner?.fullName || 'Developer'}</h4>
                      <p className="text-[11px] text-slate-400 truncate">{conn.partner?.bio || 'Findathon Builder'}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleAcceptConnection(conn.id)}
                      className="py-1.5 px-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-sm cursor-pointer"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDeclineConnection(conn.id)}
                      className="py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-bold border border-slate-800 cursor-pointer"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Accepted Connections Bar */}
        {acceptedConnections.length > 0 && (
          <div className="glass-card rounded-2xl border border-purple-900/30 p-4 bg-[#0D1224]/60 backdrop-blur-xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <UserCheck className="w-4 h-4 text-purple-400" />
              <span>Connected Builders ({acceptedConnections.length})</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
              {acceptedConnections.slice(0, 6).map(conn => (
                <div
                  key={conn.id}
                  className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium flex items-center gap-1.5 shrink-0"
                >
                  <div className="w-4 h-4 rounded-full bg-purple-950 text-purple-300 font-bold text-[9px] flex items-center justify-center">
                    {conn.partner?.fullName?.charAt(0).toUpperCase() || 'D'}
                  </div>
                  <span>{conn.partner?.fullName || 'Developer'}</span>
                </div>
              ))}
              {acceptedConnections.length > 6 && (
                <span className="text-[11px] text-slate-500 font-mono">+{acceptedConnections.length - 6} more</span>
              )}
            </div>
          </div>
        )}

        {/* Pending Team Invitations Section */}
        {invitations.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>Pending Team Invitations ({invitations.length})</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {invitations.map(inv => (
                <div
                  key={inv.id}
                  className="glass-card rounded-2xl border border-purple-900/40 p-5 bg-[#0D1224]/80 backdrop-blur-xl space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                          Invitation Received
                        </span>
                        <h4 className="text-base font-bold text-white">
                          {inv.team?.name || 'Hackathon Team'}
                        </h4>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                        Pending
                      </span>
                    </div>

                    {inv.message && (
                      <p className="text-xs text-slate-300 italic bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                        &ldquo;{inv.message}&rdquo;
                      </p>
                    )}

                    {inv.inviter && (
                      <p className="text-xs text-slate-400">
                        Invited by <strong className="text-slate-200">{inv.inviter.fullName || 'Team Lead'}</strong>
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-purple-900/20">
                    <button
                      onClick={() => handleAcceptInvite(inv.id)}
                      className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Accept</span>
                    </button>
                    <button
                      onClick={() => handleDeclineInvite(inv.id)}
                      className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-rose-300 border border-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Teams Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span>My Active Teams ({teams.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map(i => (
                <div key={i} className="glass-card rounded-2xl h-48 animate-pulse bg-slate-900/40 border border-purple-900/20" />
              ))}
            </div>
          ) : teams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {teams.map(team => (
                <div
                  key={team.id}
                  className="glass-card rounded-2xl border border-purple-900/30 hover:border-purple-500/40 p-5 bg-[#0D1224]/80 backdrop-blur-xl transition-all shadow-lg flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                          {team.hackathon?.title || 'Hackathon Event'}
                        </span>
                        <h3 className="text-base font-bold text-white truncate mt-0.5">{team.name}</h3>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800 capitalize shrink-0">
                        {team.status}
                      </span>
                    </div>

                    {team.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {team.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-purple-400" />
                        <strong>{team.memberCount}</strong> / {team.maxMembers} Members
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Lock className="w-3 text-slate-500" /> Private
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-purple-900/20">
                    <Link
                      href={`/teamspace/${team.id}`}
                      className="flex-1 py-2 px-3 rounded-xl bg-purple-900/30 hover:bg-purple-800/40 border border-purple-500/30 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <span>TeamSpace</span>
                      <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
                    </Link>
                    <Link
                      href={`/teamspace/discover?hackathon=${team.hackathonId}`}
                      className="py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-md"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Find Teammates</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card rounded-3xl p-8 border border-purple-900/30 text-center space-y-4 bg-[#0D1224]/50">
              <div className="w-12 h-12 rounded-2xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">You have no active teams yet</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Browse upcoming hackathons and click &ldquo;Find Teammates&rdquo; to create a team, view complementary candidates, and start building.
                </p>
              </div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold shadow-md hover:scale-105 transition-all"
              >
                <span>Browse Hackathons</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
