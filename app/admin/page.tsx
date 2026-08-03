/* eslint-disable */
'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Inbox,
  CheckCircle,
  Calendar,
  Users,
  Eye,
  Search,
  ExternalLink,
  Bookmark,
  Star,
  Shield,
  UserCheck,
  UserX,
  Plus,
  Trash2,
  AlertTriangle,
  History,
  BarChart3,
  List,
  X
} from 'lucide-react';
import { RejectionModal } from '@/components/admin/RejectionModal';
import { useAuth } from '@/lib/auth-context';

function AdminDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, profile } = useAuth();

  const activeTab = searchParams.get('tab') || 'overview';

  // Overview Stats
  const [stats, setStats] = useState<any>(null);
  const [pending, setPending] = useState<any[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [topSearches, setTopSearches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Rejection Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedHackathon, setSelectedHackathon] = useState<{ id: string; title: string } | null>(null);

  // Manage Admins State
  const [allowlistEmail, setAllowlistEmail] = useState('');
  const [allowlist, setAllowlist] = useState<any[]>([]);
  const [adminProfiles, setAdminProfiles] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Users Tab State
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);

  // Fetch Dashboard Data
  const fetchData = async () => {
    try {
      const [statsRes, pendingRes, analyticsRes] = await Promise.all([
        fetch('/api/v1/admin/stats').then(r => r.json()),
        fetch('/api/v1/admin/hackathons?status=pending&pageSize=10').then(r => r.json()),
        fetch('/api/v1/admin/analytics').then(r => r.json())
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (pendingRes.success) setPending(pendingRes.data.hackathons);
      if (analyticsRes.success) {
        setRecentEvents(analyticsRes.data.recentEvents);
        setTopSearches(analyticsRes.data.searchTerms);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Allowlist & Admin Profiles
  const fetchAdminAllowlistData = async () => {
    setAdminLoading(true);
    try {
      const res = await fetch('/api/v1/admin/allowlist');
      const json = await res.json();
      if (json.success) {
        setAllowlist(json.data.allowlist || []);
        setAdminProfiles(json.data.adminProfiles || []);
        setAuditLogs(json.data.auditLogs || []);
      }
    } catch (err) {
      console.error('Failed to fetch admin allowlist', err);
    } finally {
      setAdminLoading(false);
    }
  };

  // Fetch Users List
  const fetchUsersData = async () => {
    setUsersLoading(true);
    try {
      const url = usersSearch
        ? `/api/v1/admin/users?search=${encodeURIComponent(usersSearch)}`
        : '/api/v1/admin/users';
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setUsersList(json.data.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'admins') {
      fetchAdminAllowlistData();
    } else if (activeTab === 'users') {
      fetchUsersData();
    }
  }, [activeTab]);

  const setTab = (tab: string) => {
    router.push(`/admin?tab=${tab}`);
  };

  // Allowlist Handlers
  const handleAddAllowlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allowlistEmail || !allowlistEmail.includes('@')) {
      setAdminMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    setAdminMessage(null);
    try {
      const res = await fetch('/api/v1/admin/allowlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: allowlistEmail })
      });
      const json = await res.json();

      if (json.success) {
        setAdminMessage({ type: 'success', text: json.message || 'Email added to admin allowlist.' });
        setAllowlistEmail('');
        fetchAdminAllowlistData();
      } else {
        setAdminMessage({ type: 'error', text: json.error || 'Failed to add email to allowlist.' });
      }
    } catch (err: any) {
      setAdminMessage({ type: 'error', text: err.message || 'Failed to execute allowlist request.' });
    }
  };

  const handleRemoveAllowlist = async (email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} from the admin allowlist?`)) return;

    try {
      const res = await fetch('/api/v1/admin/allowlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const json = await res.json();

      if (json.success) {
        setAdminMessage({ type: 'success', text: `Removed ${email} from allowlist.` });
        fetchAdminAllowlistData();
      } else {
        setAdminMessage({ type: 'error', text: json.error || 'Failed to remove allowlist entry.' });
      }
    } catch (err: any) {
      setAdminMessage({ type: 'error', text: err.message || 'Failed to delete allowlist entry.' });
    }
  };

  const handleRevokeAdminRole = async (targetId: string, targetName: string) => {
    if (!confirm(`Are you sure you want to revoke admin privileges for ${targetName}?`)) return;

    try {
      const res = await fetch(`/api/v1/admin/users/${targetId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user' })
      });
      const json = await res.json();

      if (json.success) {
        setAdminMessage({ type: 'success', text: `Revoked admin role for ${targetName}.` });
        fetchAdminAllowlistData();
      } else {
        setAdminMessage({ type: 'error', text: json.error || 'Failed to revoke admin role.' });
      }
    } catch (err: any) {
      setAdminMessage({ type: 'error', text: err.message || 'Failed to revoke admin role.' });
    }
  };

  // Submission Handlers
  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/admin/hackathons/${id}/approve`, { method: 'POST' });
      if (res.ok) {
        setPending(prev => prev.filter(h => h.id !== id));
        setStats((prev: any) => ({
          ...prev,
          pending: Math.max(0, prev.pending - 1),
          approved: (prev?.approved || 0) + 1
        }));
      }
    } catch (err) {
      console.error('Failed to approve', err);
    }
  };

  const openRejectModal = (id: string, title: string) => {
    setSelectedHackathon({ id, title });
    setRejectModalOpen(true);
  };

  const handleRejectSuccess = () => {
    if (selectedHackathon) {
      setPending(prev => prev.filter(h => h.id !== selectedHackathon.id));
      setStats((prev: any) => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        rejected: (prev?.rejected || 0) + 1
      }));
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'view': return <Eye className="w-4 h-4 text-blue-400" />;
      case 'bookmark': return <Bookmark className="w-4 h-4 text-purple-400" />;
      case 'review': return <Star className="w-4 h-4 text-yellow-400" />;
      case 'search': return <Search className="w-4 h-4 text-emerald-400" />;
      default: return <div className="w-2 h-2 rounded-full bg-slate-500" />;
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-10 w-64 bg-slate-900 animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-900 animate-pulse rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-400" />
            Findathon Control Center
          </h1>
          <p className="text-slate-400 text-sm mt-1">Enterprise Administration & Role Security Platform</p>
        </div>
        <div className="text-xs text-slate-400 font-mono-num bg-slate-900/80 px-3 py-1.5 rounded-xl border border-purple-900/30 shrink-0">
          {new Date().toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-purple-900/40 shadow-inner overflow-x-auto scrollbar-none">
        <button
          onClick={() => setTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'overview' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Inbox className="w-4 h-4" /> Overview
        </button>

        <button
          onClick={() => setTab('submissions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 relative ${
            activeTab === 'submissions' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <List className="w-4 h-4" /> Submissions
          {stats?.pending > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-slate-950 font-extrabold">
              {stats.pending}
            </span>
          )}
        </button>

        <button
          onClick={() => setTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'users' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-4 h-4" /> User Management
        </button>

        {profile?.role === 'admin' && (
          <button
            onClick={() => setTab('admins')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'admins' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <UserCheck className="w-4 h-4 text-emerald-400" /> Manage Admins
          </button>
        )}

        <button
          onClick={() => setTab('analytics')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'analytics' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Analytics
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fade-in">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-900/60 border border-purple-900/30 rounded-2xl p-6 relative overflow-hidden group">
              <div className="flex items-center gap-3 mb-2 text-slate-400 font-medium">
                <Inbox className="w-5 h-5 text-yellow-400" /> Pending Review
              </div>
              <div className="text-4xl font-bold text-yellow-400">{stats?.pending || 0}</div>
              {stats?.pending > 0 && <div className="text-xs text-yellow-500/70 mt-2 font-medium">Needs attention</div>}
            </div>

            <div className="bg-slate-900/60 border border-purple-900/30 rounded-2xl p-6 relative overflow-hidden group">
              <div className="flex items-center gap-3 mb-2 text-slate-400 font-medium">
                <CheckCircle className="w-5 h-5 text-green-400" /> Approved Events
              </div>
              <div className="text-4xl font-bold text-green-400">{stats?.approved || 0}</div>
            </div>

            <div className="bg-slate-900/60 border border-purple-900/30 rounded-2xl p-6 relative overflow-hidden group">
              <div className="flex items-center gap-3 mb-2 text-slate-400 font-medium">
                <Calendar className="w-5 h-5 text-purple-400" /> Total Hackathons
              </div>
              <div className="text-4xl font-bold text-purple-400">{stats?.total || 0}</div>
            </div>

            <div className="bg-slate-900/60 border border-purple-900/30 rounded-2xl p-6 relative overflow-hidden group">
              <div className="flex items-center gap-3 mb-2 text-slate-400 font-medium">
                <Users className="w-5 h-5 text-blue-400" /> Total Users
              </div>
              <div className="text-4xl font-bold text-blue-400">{stats?.totalUsers || 0}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Pending Submissions Queue</h2>
                <button onClick={() => setTab('submissions')} className="text-purple-400 text-sm hover:text-purple-300 font-semibold flex items-center gap-1">
                  View all <ExternalLink className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-slate-900/80 border border-purple-900/30 rounded-2xl overflow-hidden">
                {pending.length === 0 ? (
                  <div className="p-12 text-center text-emerald-400 font-semibold bg-emerald-950/10">
                    No pending submissions 🎉 All events are reviewed!
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {pending.map((h) => (
                      <div key={h.id} className="p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                        <div className="flex-1 min-w-0 pr-4">
                          <h3 className="text-slate-200 font-bold truncate">{h.title}</h3>
                          <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                            <span className="truncate">{h.organizer}</span>
                            <span>•</span>
                            <span>{new Date(h.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleApprove(h.id)}
                            className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/40 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => openRejectModal(h.id, h.title)}
                            className="bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/40 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-4">Recent Activity Logs</h2>
                <div className="bg-slate-900/80 border border-purple-900/30 rounded-2xl p-3">
                  <div className="max-h-[360px] overflow-y-auto space-y-2 scrollbar-none">
                    {recentEvents.length === 0 ? (
                      <p className="text-xs text-slate-400 p-4 text-center">No recent activity recorded</p>
                    ) : (
                      recentEvents.map(event => (
                        <div key={event.id} className="flex items-start gap-3 p-2 hover:bg-slate-800/50 rounded-xl">
                          <div className="mt-1 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                            {getEventIcon(event.event)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-300 capitalize">{event.event.replace('_', ' ')}</p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SUBMISSIONS */}
      {activeTab === 'submissions' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-purple-900/30 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Event Submissions Review</h2>
              <p className="text-xs text-slate-400 mt-1">Approve or reject hackathons submitted by hosts</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-500/40">
              {pending.length} Pending Approval
            </span>
          </div>

          <div className="bg-slate-900/80 border border-purple-900/30 rounded-2xl overflow-hidden">
            {pending.length === 0 ? (
              <div className="p-16 text-center text-slate-400 space-y-2">
                <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="font-bold text-white">All submissions are reviewed!</p>
                <p className="text-xs">No pending hackathons currently waiting for admin moderation.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {pending.map((h) => (
                  <div key={h.id} className="p-5 flex items-center justify-between hover:bg-slate-800/40 transition-all gap-4">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white truncate">{h.title}</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-500/30">
                          {h.is_online ? 'Online' : h.location_city || 'Offline'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 line-clamp-1">{h.description}</p>
                      <div className="text-[11px] text-slate-400 flex items-center gap-3 pt-1">
                        <span>Host: <strong className="text-slate-200">{h.organizer}</strong></span>
                        <span>•</span>
                        <span>Prize: <strong className="text-amber-300">{h.prize_pool || 'N/A'}</strong></span>
                        <span>•</span>
                        <span>Submitted: {new Date(h.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/hackathons/${h.slug || h.id}`}
                        target="_blank"
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700"
                      >
                        <Eye className="w-3.5 h-3.5" /> Preview
                      </Link>
                      <button
                        onClick={() => handleApprove(h.id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => openRejectModal(h.id, h.title)}
                        className="bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: USERS */}
      {activeTab === 'users' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-900/30 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">User Management</h2>
              <p className="text-xs text-slate-400 mt-1">Manage registered developer accounts and roles</p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-purple-400" />
              <input
                type="text"
                value={usersSearch}
                onChange={(e) => setUsersSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchUsersData()}
                placeholder="Search name, email..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-purple-900/40 text-xs text-white placeholder-slate-400"
              />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-purple-900/30 rounded-2xl overflow-hidden">
            {usersLoading ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading user profiles...</div>
            ) : usersList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-purple-900/30">
                    <tr>
                      <th className="p-4">User</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">XP Points</th>
                      <th className="p-4">Joined Date</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-semibold text-white flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-950 border border-purple-500/40 flex items-center justify-center font-bold text-purple-300">
                            {(u.fullName || u.full_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div>{u.fullName || u.full_name || 'User'}</div>
                            <div className="text-[11px] text-slate-400 font-mono-num">{u.id.substring(0, 8)}...</div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            u.role === 'admin' ? 'bg-purple-950 text-purple-300 border border-purple-500/40' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {u.role || 'user'}
                          </span>
                        </td>
                        <td className="p-4 font-mono-num text-amber-300 font-bold">{u.xpPoints || 0} XP</td>
                        <td className="p-4 text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="p-4 text-right">
                          <Link
                            href={`/profile/${u.id}`}
                            target="_blank"
                            className="text-purple-400 hover:text-purple-300 font-bold"
                          >
                            View Profile
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-slate-400">No users found matching query.</div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: MANAGE ADMINS */}
      {activeTab === 'admins' && (
        <div className="space-y-8 animate-fade-in">
          {/* Header Banner */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/80 to-slate-950 border border-purple-500/40 space-y-2">
            <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-emerald-400" /> Admin Role Allowlist & Security Controls
            </h2>
            <p className="text-xs text-purple-200 max-w-3xl leading-relaxed">
              Emails added to the allowlist automatically receive <strong className="text-white">Admin Privileges</strong> upon signing in via Google OAuth. Re-running promotion is idempotent and protected by <code className="text-emerald-300 font-mono">SECURITY DEFINER</code> database execution.
            </p>
          </div>

          {/* Alert Message Banner */}
          {adminMessage && (
            <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between ${
              adminMessage.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                : 'bg-red-950/80 border-red-500/50 text-red-200'
            }`}>
              <span>{adminMessage.text}</span>
              <button onClick={() => setAdminMessage(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Form: Add Email to Allowlist */}
          <form onSubmit={handleAddAllowlist} className="bg-slate-900/90 border border-purple-900/40 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4 text-purple-400" /> Grant Admin Access by Email
            </h3>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={allowlistEmail}
                onChange={(e) => setAllowlistEmail(e.target.value)}
                placeholder="enter.developer@gmail.com"
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-purple-900/40 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                required
              />
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 shrink-0"
              >
                <Plus className="w-4 h-4" /> Add to Allowlist
              </button>
            </div>
          </form>

          {/* Grid: Allowlist & Active Admins Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Allowlist Table */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" /> Pending / Active Allowlist ({allowlist.length})
              </h3>

              <div className="bg-slate-900/80 border border-purple-900/30 rounded-2xl overflow-hidden">
                {allowlist.length > 0 ? (
                  <div className="divide-y divide-slate-800">
                    {allowlist.map((item) => (
                      <div key={item.email} className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
                        <div>
                          <div className="font-bold text-white text-xs font-mono">{item.email}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Added: {new Date(item.created_at).toLocaleDateString()}</div>
                        </div>
                        <button
                          onClick={() => handleRemoveAllowlist(item.email)}
                          className="p-2 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/40 transition-all text-xs font-bold flex items-center gap-1"
                          title="Remove from allowlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">No emails currently in allowlist.</div>
                )}
              </div>
            </div>

            {/* Active Admin Profiles Table */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" /> Current Active Admin Profiles ({adminProfiles.length})
              </h3>

              <div className="bg-slate-900/80 border border-purple-900/30 rounded-2xl overflow-hidden">
                {adminProfiles.length > 0 ? (
                  <div className="divide-y divide-slate-800">
                    {adminProfiles.map((adm) => (
                      <div key={adm.id} className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-bold flex items-center justify-center text-xs">
                            {(adm.full_name || 'A').charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs">{adm.full_name || 'Admin User'}</div>
                            <div className="text-[10px] text-slate-400 font-mono-num">{adm.id.substring(0, 8)}...</div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRevokeAdminRole(adm.id, adm.full_name || 'Admin')}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950 hover:text-red-300 text-slate-400 text-xs font-bold border border-slate-700 transition-all"
                        >
                          Revoke Role
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">No active admin profiles.</div>
                )}
              </div>
            </div>
          </div>

          {/* Audit History Log Table */}
          <div className="space-y-4 pt-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-amber-400" /> Security Audit Log History
            </h3>

            <div className="bg-slate-900/80 border border-purple-900/30 rounded-2xl overflow-hidden">
              {auditLogs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-purple-900/30">
                      <tr>
                        <th className="p-3">Timestamp</th>
                        <th className="p-3">Action</th>
                        <th className="p-3">Target Email / User</th>
                        <th className="p-3">Performed By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-800/40">
                          <td className="p-3 text-slate-400 font-mono">{new Date(log.created_at).toLocaleString()}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-950 text-purple-300 border border-purple-500/30">
                              {log.action}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-white">{log.target_email || log.target_user_id || 'N/A'}</td>
                          <td className="p-3 text-slate-400 font-mono text-[11px]">{log.performed_by ? log.performed_by.substring(0, 8) + '...' : 'System'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">No security audit logs recorded yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-fade-in">
          <div className="border-b border-purple-900/30 pb-4">
            <h2 className="text-2xl font-bold text-white">Platform Analytics & Trends</h2>
            <p className="text-xs text-slate-400 mt-1">Real-time search queries and interaction insights</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/80 border border-purple-900/30 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Search className="w-4 h-4 text-emerald-400" /> Popular Search Terms
              </h3>
              <div className="space-y-2">
                {topSearches.map((t, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-purple-900/20 text-xs">
                    <span className="font-bold text-slate-200">#{t.term}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono-num font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                      {t.count} searches
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-purple-900/30 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-400" /> Activity Event Feed
              </h3>
              <div className="space-y-2 max-h-[320px] overflow-y-auto scrollbar-none">
                {recentEvents.map((ev) => (
                  <div key={ev.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-purple-900/20 text-xs">
                    <span className="capitalize font-bold text-purple-300">{ev.event.replace('_', ' ')}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(ev.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      <RejectionModal
        isOpen={rejectModalOpen}
        hackathonId={selectedHackathon?.id || ''}
        hackathonTitle={selectedHackathon?.title || ''}
        onClose={() => setRejectModalOpen(false)}
        onSuccess={handleRejectSuccess}
      />
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading admin control center...</div>}>
      <AdminDashboardContent />
    </Suspense>
  );
}
