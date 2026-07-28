'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Eye, CheckCircle, XCircle, ShieldCheck } from 'lucide-react';
import { RejectionModal } from '@/components/admin/RejectionModal';
import { StatusBadge } from '@/components/admin/StatusBadge';

export default function SubmissionsPage() {
  const [hackathons, setHackathons] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedHackathon, setSelectedHackathon] = useState<{ id: string, title: string } | null>(null);
  
  // Expanded row state
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const statusParam = filter !== 'All' ? `&status=${filter.toLowerCase()}` : '';
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      const res = await fetch(`/api/v1/admin/hackathons?page=${page}&pageSize=15${statusParam}${searchParam}`);
      const data = await res.json();
      if (data.success) {
        setHackathons(data.data.hackathons);
        setTotal(data.data.total);
      }
    } catch (error) {
      console.error('Failed to fetch submissions', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [page, filter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSubmissions();
  };

  const handleApprove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/v1/admin/hackathons/${id}/approve`, { method: 'POST' });
      if (res.ok) fetchSubmissions();
    } catch (err) {
      console.error('Failed to approve', err);
    }
  };

  const handleVerify = async (id: string, currentStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/v1/admin/hackathons/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified: !currentStatus })
      });
      if (res.ok) fetchSubmissions();
    } catch (err) {
      console.error('Failed to verify', err);
    }
  };

  const openRejectModal = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedHackathon({ id, title });
    setRejectModalOpen(true);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-bold text-white">Submission Queue</h1>
        <span className="bg-purple-600/20 text-purple-400 px-3 py-1 rounded-full text-sm font-medium border border-purple-500/30">
          {total} Total
        </span>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-purple-900/30">
        <div className="flex gap-2">
          {['All', 'Pending', 'Approved', 'Rejected'].map(status => (
            <button
              key={status}
              onClick={() => { setFilter(status); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filter === status 
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search titles..."
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        </form>
      </div>

      {/* Table */}
      <div className="bg-slate-900/80 border border-purple-900/30 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium w-16">Cover</th>
                <th className="px-6 py-4 font-medium">Title & Organizer</th>
                <th className="px-6 py-4 font-medium">Location</th>
                <th className="px-6 py-4 font-medium">Submitted</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse bg-slate-900/50">
                    <td className="px-6 py-4"><div className="w-10 h-10 bg-slate-800 rounded-lg" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-48 bg-slate-800 rounded mb-2" /><div className="h-3 w-32 bg-slate-800 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-800 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-800 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-6 w-20 bg-slate-800 rounded-full" /></td>
                    <td className="px-6 py-4"><div className="h-8 w-24 bg-slate-800 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : hackathons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No hackathons found matching your criteria.
                  </td>
                </tr>
              ) : (
                hackathons.map((h) => (
                  <React.Fragment key={h.id}>
                    <tr 
                      onClick={() => toggleExpand(h.id)}
                      className={`hover:bg-slate-800/50 cursor-pointer transition-colors ${expandedId === h.id ? 'bg-slate-800/30' : ''}`}
                    >
                      <td className="px-6 py-4">
                        {h.coverImage ? (
                          <img src={h.coverImage} alt={h.title} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-900 to-indigo-900 flex items-center justify-center text-xs font-bold text-white">
                            {h.title.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <div className="font-semibold text-slate-200 truncate" title={h.title}>{h.title}</div>
                        <div className="text-xs text-slate-500 truncate mt-0.5">
                          {h.organizer} • {h.submitter?.email || h.submittedBy}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {h.isOnline ? '🌐 Online' : `${h.locationCity}${h.locationCollege ? `, ${h.locationCollege}` : ''}`}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(h.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={h.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {h.status === 'pending' && (
                            <>
                              <button onClick={(e) => handleApprove(h.id, e)} className="bg-green-600/20 text-green-400 hover:bg-green-600/40 p-2 rounded-lg" title="Approve">
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button onClick={(e) => openRejectModal(h.id, h.title, e)} className="bg-red-600/20 text-red-400 hover:bg-red-600/40 p-2 rounded-lg" title="Reject">
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {h.status === 'approved' && (
                            <button onClick={(e) => handleVerify(h.id, h.isVerified, e)} className={`${h.isVerified ? 'bg-blue-600 text-white' : 'bg-blue-600/20 text-blue-400'} hover:bg-blue-600/40 p-2 rounded-lg`} title="Toggle Verified Badge">
                              <ShieldCheck className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded Details Row */}
                    {expandedId === h.id && (
                      <tr className="bg-slate-900/40 border-b-2 border-purple-900/30">
                        <td colSpan={6} className="px-6 py-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div>
                              <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Description</h4>
                              <p className="text-sm text-slate-300 line-clamp-4">{h.description}</p>
                              {h.rejectionReason && (
                                <div className="mt-4 p-3 bg-red-950/30 border border-red-900/50 rounded-lg">
                                  <p className="text-xs text-red-400 font-medium mb-1">Rejection Reason</p>
                                  <p className="text-sm text-red-300">{h.rejectionReason}</p>
                                </div>
                              )}
                            </div>
                            
                            <div>
                              <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Event Details</h4>
                              <dl className="text-sm space-y-2">
                                <div className="flex justify-between"><dt className="text-slate-500">Dates:</dt><dd className="text-slate-300 text-right">{new Date(h.startDate).toLocaleDateString()} - {new Date(h.endDate).toLocaleDateString()}</dd></div>
                                <div className="flex justify-between"><dt className="text-slate-500">Deadline:</dt><dd className="text-slate-300 text-right">{new Date(h.registrationDeadline).toLocaleDateString()}</dd></div>
                                <div className="flex justify-between"><dt className="text-slate-500">Prize Pool:</dt><dd className="text-slate-300 text-right">{h.prizePool}</dd></div>
                                <div className="flex justify-between"><dt className="text-slate-500">Tags:</dt><dd className="text-slate-300 text-right">{h.tags?.join(', ') || 'None'}</dd></div>
                              </dl>
                            </div>

                            <div>
                              <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Submitter Info</h4>
                              {h.submitter ? (
                                <dl className="text-sm space-y-2">
                                  <div className="flex justify-between"><dt className="text-slate-500">Name:</dt><dd className="text-slate-300 text-right">{h.submitter.full_name}</dd></div>
                                  <div className="flex justify-between"><dt className="text-slate-500">Email:</dt><dd className="text-slate-300 text-right">{h.submitter.email}</dd></div>
                                </dl>
                              ) : (
                                <p className="text-sm text-slate-500">No profile attached ({h.submittedBy})</p>
                              )}
                              
                              <div className="mt-6">
                                <Link href={`/hackathons/${h.slug || h.id}`} target="_blank" className="text-purple-400 hover:text-purple-300 text-sm font-medium flex items-center gap-2">
                                  View Public Page <Eye className="w-4 h-4" />
                                </Link>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {total > 15 && (
          <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Showing {(page - 1) * 15 + 1} to {Math.min(page * 15, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button 
                disabled={page === 1} 
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 bg-slate-800 rounded text-slate-300 hover:bg-slate-700 disabled:opacity-50 text-sm"
              >
                Prev
              </button>
              <button 
                disabled={page * 15 >= total} 
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 bg-slate-800 rounded text-slate-300 hover:bg-slate-700 disabled:opacity-50 text-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <RejectionModal 
        isOpen={rejectModalOpen}
        hackathonId={selectedHackathon?.id || ''}
        hackathonTitle={selectedHackathon?.title || ''}
        onClose={() => setRejectModalOpen(false)}
        onSuccess={() => fetchSubmissions()}
      />
    </div>
  );
}
