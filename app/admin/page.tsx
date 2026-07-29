/* eslint-disable */
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Inbox, CheckCircle, Calendar, Users, Eye, Search, ExternalLink, Bookmark, Star } from 'lucide-react';
import { RejectionModal } from '@/components/admin/RejectionModal';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [pending, setPending] = useState<any[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [topSearches, setTopSearches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedHackathon, setSelectedHackathon] = useState<{ id: string, title: string } | null>(null);

  const fetchData = async () => {
    try {
      const [statsRes, pendingRes, analyticsRes] = await Promise.all([
        fetch('/api/v1/admin/stats').then(r => r.json()),
        fetch('/api/v1/admin/hackathons?status=pending&pageSize=5').then(r => r.json()),
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

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      // Refresh time only, data refreshed manually or via hook
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/admin/hackathons/${id}/approve`, { method: 'POST' });
      if (res.ok) {
        setPending(prev => prev.filter(h => h.id !== id));
        setStats((prev: any) => ({
          ...prev,
          pending: Math.max(0, prev.pending - 1),
          approved: prev.approved + 1
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
        rejected: prev.rejected + 1
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
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Admin Dashboard</h1>
          <p className="text-slate-400">Findathon Control Center</p>
        </div>
        <div className="text-sm text-slate-500">
          {new Date().toLocaleString(undefined, { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900/60 border border-purple-900/30 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Inbox className="w-16 h-16 text-yellow-500" />
          </div>
          <div className="flex items-center gap-3 mb-2 text-slate-400 font-medium">
            <Inbox className="w-5 h-5 text-yellow-400" />
            Pending Review
          </div>
          <div className="text-4xl font-bold text-yellow-400">{stats?.pending || 0}</div>
          {stats?.pending > 0 && <div className="text-xs text-yellow-500/70 mt-2 font-medium">Needs attention</div>}
        </div>
        
        <div className="bg-slate-900/60 border border-purple-900/30 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <div className="flex items-center gap-3 mb-2 text-slate-400 font-medium">
            <CheckCircle className="w-5 h-5 text-green-400" />
            Approved
          </div>
          <div className="text-4xl font-bold text-green-400">{stats?.approved || 0}</div>
        </div>

        <div className="bg-slate-900/60 border border-purple-900/30 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Calendar className="w-16 h-16 text-purple-500" />
          </div>
          <div className="flex items-center gap-3 mb-2 text-slate-400 font-medium">
            <Calendar className="w-5 h-5 text-purple-400" />
            Total Hackathons
          </div>
          <div className="text-4xl font-bold text-purple-400">{stats?.total || 0}</div>
        </div>

        <div className="bg-slate-900/60 border border-purple-900/30 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users className="w-16 h-16 text-blue-500" />
          </div>
          <div className="flex items-center gap-3 mb-2 text-slate-400 font-medium">
            <Users className="w-5 h-5 text-blue-400" />
            Total Users
          </div>
          <div className="text-4xl font-bold text-blue-400">{stats?.totalUsers || 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Submissions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Pending Submissions</h2>
            <Link href="/admin/submissions" className="text-purple-400 text-sm hover:text-purple-300 font-medium flex items-center gap-1">
              View all <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="bg-slate-900/80 border border-purple-900/30 rounded-2xl overflow-hidden">
            {pending.length === 0 ? (
              <div className="p-12 text-center text-green-400 font-medium bg-green-950/10">
                No pending submissions 🎉
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {pending.map((h) => (
                  <div key={h.id} className="p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                    <div className="flex-1 min-w-0 pr-4">
                      <h3 className="text-slate-200 font-medium truncate">{h.title}</h3>
                      <div className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                        <span className="truncate">{h.organizer}</span>
                        <span>•</span>
                        <span>{new Date(h.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link 
                        href={`/hackathons/${h.slug || h.id}`}
                        target="_blank"
                        className="bg-slate-800 text-slate-300 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5"
                      >
                        <Eye className="w-4 h-4" /> View
                      </Link>
                      <button 
                        onClick={() => handleApprove(h.id)}
                        className="bg-green-600/20 text-green-400 hover:bg-green-600/40 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" /> Approve
                      </button>
                      <button 
                        onClick={() => openRejectModal(h.id, h.title)}
                        className="bg-red-600/20 text-red-400 hover:bg-red-600/40 px-3 py-1.5 rounded-lg text-sm transition-colors"
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

        {/* Right Column - Activity */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Top Searches Today</h2>
            <div className="flex flex-wrap gap-2">
              {topSearches.slice(0, 5).map((t, i) => (
                <span key={i} className="bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1 rounded-full text-xs flex items-center gap-1.5">
                  <Search className="w-3 h-3 text-emerald-500" />
                  {t.term} <span className="opacity-50">({t.count})</span>
                </span>
              ))}
              {topSearches.length === 0 && <span className="text-sm text-slate-500 italic">No recent searches</span>}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
            <div className="bg-slate-900/80 border border-purple-900/30 rounded-2xl p-1">
              <div className="max-h-[400px] overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
                {recentEvents.length === 0 ? (
                  <p className="text-sm text-slate-500 p-4 text-center">No recent activity</p>
                ) : (
                  recentEvents.map(event => (
                    <div key={event.id} className="flex items-start gap-3 p-2 hover:bg-slate-800/50 rounded-lg">
                      <div className="mt-1 bg-slate-950 p-1.5 rounded-md border border-slate-800">
                        {getEventIcon(event.event)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-300 capitalize">{event.event.replace('_', ' ')}</p>
                        <p className="text-xs text-slate-500 truncate">
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
