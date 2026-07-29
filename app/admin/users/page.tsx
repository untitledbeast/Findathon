/* eslint-disable */
'use client';

import React, { useEffect, useState } from 'react';
import { Search, Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function UsersPage() {
  const { profile: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, userId: string, userName: string, currentRole: string, newRole: string } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      const res = await fetch(`/api/v1/admin/users?page=${page}&pageSize=20${searchParam}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.data.users);
        setTotal(data.data.total);
      }
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const initiateRoleChange = (userId: string, userName: string, currentRole: string, newRole: string) => {
    if (userId === currentUser?.id) return; // Prevent self-editing
    if (currentRole === newRole) return;
    setConfirmModal({ isOpen: true, userId, userName, currentRole, newRole });
  };

  const confirmRoleChange = async () => {
    if (!confirmModal) return;
    
    try {
      const res = await fetch(`/api/v1/admin/users/${confirmModal.userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: confirmModal.newRole })
      });
      
      if (res.ok) {
        // Optimistic update
        setUsers(prev => prev.map(u => 
          u.id === confirmModal.userId ? { ...u, role: confirmModal.newRole } : u
        ));
      }
    } catch (error) {
      console.error('Failed to update role', error);
    } finally {
      setConfirmModal(null);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">User Management</h1>
        <span className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-sm font-medium border border-blue-500/30">
          {total} Users
        </span>
      </div>

      <div className="bg-slate-900/60 p-4 rounded-2xl border border-purple-900/30">
        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        </form>
      </div>

      <div className="bg-slate-900/80 border border-purple-900/30 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Organization</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse bg-slate-900/50">
                    <td className="px-6 py-4"><div className="h-10 flex gap-3"><div className="w-10 h-10 rounded-full bg-slate-800"/><div className="h-4 w-32 bg-slate-800 rounded mt-2"/></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-40 bg-slate-800 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-800 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-8 w-28 bg-slate-800 rounded-lg" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-800 rounded" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map(u => {
                  const isSelf = currentUser?.id === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt={u.fullName} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-purple-900/50 flex items-center justify-center text-xs font-medium text-purple-200">
                              {u.fullName?.substring(0, 2).toUpperCase() || 'U'}
                            </div>
                          )}
                          <div className="font-medium text-slate-200">{u.fullName}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400">{u.email || '-'}</td>
                      <td className="px-6 py-4 text-slate-400">{u.organization || '-'}</td>
                      <td className="px-6 py-4">
                        {isSelf ? (
                          <div className="flex items-center gap-2 text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-lg w-max">
                            <Lock className="w-3 h-3" /> {u.role}
                          </div>
                        ) : (
                          <select
                            value={u.role}
                            onChange={(e) => initiateRoleChange(u.id, u.fullName, u.role, e.target.value)}
                            className="bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full p-2"
                          >
                            <option value="user">user</option>
                            <option value="organizer">organizer</option>
                            <option value="moderator">moderator</option>
                            <option value="admin">admin</option>
                          </select>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {total > 20 && (
          <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total}
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
                disabled={page * 20 >= total} 
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 bg-slate-800 rounded text-slate-300 hover:bg-slate-700 disabled:opacity-50 text-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Role Change Confirmation Modal */}
      {confirmModal?.isOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-slate-900 border border-purple-900/30 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-2">Change Role?</h3>
            <p className="text-sm text-slate-300 mb-6">
              Are you sure you want to change <span className="font-bold text-white">{confirmModal.userName}</span>'s role from <span className="text-red-400">{confirmModal.currentRole}</span> to <span className="text-green-400">{confirmModal.newRole}</span>? This will immediately change their access level.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRoleChange}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
