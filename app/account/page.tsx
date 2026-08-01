/* eslint-disable */
'use client';

import React, { useState, useEffect, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HackathonCard from '@/components/HackathonCard';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard,
  User as UserIcon,
  Bookmark,
  FileText,
  Award,
  Bell,
  Settings,
  LogOut,
  Sparkles,
  Clock,
  CheckCircle,
  XCircle,
  TriangleAlert,
  ShieldCheck,
  Check,
  X
} from 'lucide-react';

export default function AccountDashboardPage({ searchParams }: { searchParams?: Promise<{ tab?: string }> }) {
  const resolvedParams = searchParams ? use(searchParams) : { tab: 'dashboard' };
  const initialTab = resolvedParams?.tab || 'dashboard';

  const router = useRouter();
  const { user, profile, role, loading: authLoading, signOut, refreshProfile } = useAuth();
  
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [loadingStats, setLoadingStats] = useState(true);
  
  // Data States
  const [stats, setStats] = useState({ saved: 0, submissions: 0, notifications: 0, totalHackathons: 0, totalUsers: 0, pendingSubmissions: 0 });
  const [savedHackathons, setSavedHackathons] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  
  // Profile Form States
  const [formData, setFormData] = useState({
    fullName: '', bio: '', organization: '', phone: '', website: '',
    socialTwitter: '', socialLinkedin: '', socialInstagram: '', socialDiscord: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success'|'error', text: string } | null>(null);

  // Settings States
  const [deleteInput, setDeleteInput] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (activeTab !== initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || '',
        bio: profile.bio || '',
        organization: profile.organization || '',
        phone: profile.phone || '',
        website: profile.website || '',
        socialTwitter: profile.socialTwitter || '',
        socialLinkedin: profile.socialLinkedin || '',
        socialInstagram: profile.socialInstagram || '',
        socialDiscord: profile.socialDiscord || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    
    let isMounted = true;
    const fetchAllData = async () => {
      setLoadingStats(true);
      try {
        const [bookmarksRes, submissionsRes, notificationsRes, reviewsRes] = await Promise.all([
          fetch('/api/v1/bookmarks', { headers: { Authorization: `Bearer ${user?.id}` } }),
          fetch('/api/v1/profile/submissions', { headers: { Authorization: `Bearer ${user?.id}` } }),
          fetch('/api/v1/notifications', { headers: { Authorization: `Bearer ${user?.id}` } }),
          supabase.from('reviews').select('id').eq('user_id', user.id)
        ]);

        const bookmarks = await bookmarksRes.json();
        const subs = await submissionsRes.json();
        const notifs = await notificationsRes.json();

        if (isMounted) {
          setSavedHackathons(bookmarks.data || []);
          setSubmissions(subs.data || []);
          setNotifications(notifs.data || []);
          setReviews(reviewsRes.data || []);
          
          setStats(prev => ({
            ...prev,
            saved: (bookmarks.data || []).length,
            submissions: (subs.data || []).length,
            notifications: (notifs.data || []).filter((n: any) => !n.is_read).length,
          }));
        }

        // Admin stats
        if (role === 'admin' || role === 'moderator') {
          const adminStatsRes = await fetch('/api/v1/admin/stats');
          if (adminStatsRes.ok) {
            const adminStats = await adminStatsRes.json();
            if (isMounted) {
              setStats(prev => ({
                ...prev,
                totalHackathons: adminStats.data?.hackathons || 0,
                totalUsers: adminStats.data?.users || 0,
                pendingSubmissions: adminStats.data?.pending_hackathons || 0
              }));
            }
          }
        }

      } catch (e) {
        console.error(e);
      } finally {
        if (isMounted) setLoadingStats(false);
      }
    };
    
    fetchAllData();

    // Setup Supabase Realtime for Notifications
    const channel = supabase.channel(`public:notifications:user_id=eq.${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
        setStats(prev => ({ ...prev, notifications: prev.notifications + 1 }));
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user, role]);

  const showToast = (text: string, type: 'success' | 'error') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/v1/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.id}` },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Failed to update profile');
      await refreshProfile();
      showToast('Profile updated!', 'success');
    } catch (err: unknown) {
      if (err instanceof Error) {
        showToast(err.message, 'error');
      } else {
        showToast('An unknown error occurred', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnsave = async (id: string) => {
    try {
      await fetch(`/api/v1/bookmarks?hackathonId=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${user?.id}` } });
      setSavedHackathons(prev => prev.filter(h => h.id !== id));
      setStats(prev => ({ ...prev, saved: prev.saved - 1 }));
    } catch (e) {
      console.error(e);
    }
  };

  const markRead = async (id: string) => {
    try {
      await fetch('/api/v1/notifications/read', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.id}` },
        body: JSON.stringify({ notificationIds: [id] })
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setStats(prev => ({ ...prev, notifications: Math.max(0, prev.notifications - 1) }));
    } catch (e) { console.error(e); }
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/v1/notifications/read-all', { method: 'POST', headers: { Authorization: `Bearer ${user?.id}` } });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setStats(prev => ({ ...prev, notifications: 0 }));
    } catch (e) { console.error(e); }
  };

  const handleExport = () => {
    window.location.href = '/api/v1/profile/export';
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== 'DELETE') return;
    try {
      const res = await fetch('/api/v1/profile/delete', { method: 'POST', headers: { Authorization: `Bearer ${user?.id}` } });
      if (!res.ok) throw new Error('Failed to delete account');
      await signOut();
      router.push('/');
    } catch (err: unknown) {
      if (err instanceof Error) {
        showToast(err.message, 'error');
      }
    }
  };

  // Logic Calculations
  const xp = profile?.xpPoints || 0;
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  const filledFields = ['fullName', 'bio', 'organization', 'phone', 'website', 'socialTwitter', 'socialLinkedin', 'socialInstagram', 'socialDiscord']
    .filter(f => formData[f as keyof typeof formData]?.length > 0).length;
  const completeness = Math.round((filledFields / 9) * 100);

  const upcomingSaved = savedHackathons
    .filter(h => new Date(h.start_date) > new Date())
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
    .slice(0, 3);
  
  const recentSubmissions = submissions.slice(0, 3);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'profile', label: 'My Profile', icon: UserIcon },
    { id: 'saved', label: 'Saved Hackathons', icon: Bookmark },
    { id: 'submissions', label: 'My Submissions', icon: FileText },
    { id: 'achievements', label: 'Achievements', icon: Award },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: stats.notifications > 0 ? stats.notifications : null },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (role === 'admin' || role === 'moderator') {
    navItems.push({ id: 'admin', label: 'Admin Panel', icon: ShieldCheck } as unknown as typeof navItems[0]);
  }

  if (authLoading || !user || !profile) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-400 text-sm">Loading your dashboard...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 selection:bg-purple-600 selection:text-white">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-24 flex flex-col md:flex-row gap-8">
        
        {/* LEFT SIDEBAR */}
        <aside className="w-full md:w-64 shrink-0 space-y-6 h-fit sticky top-24">
          <div className="flex flex-col items-center text-center pb-6 border-b border-purple-900/30">
            <div className="w-20 h-20 rounded-full border border-purple-500/50 overflow-hidden mb-3">
              {profile.avatarUrl ? (
                <Image src={profile.avatarUrl} alt={profile.fullName || 'User'} width={80} height={80} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-purple-900 flex items-center justify-center text-2xl font-bold">{profile.fullName?.[0] || 'U'}</div>
              )}
            </div>
            <h3 className="font-bold text-lg">{profile.fullName || 'User'}</h3>
            <div className="text-xs text-purple-400 font-mono mt-1">Level {level} Builder</div>
            <p className="text-xs text-slate-400 mt-1">{profile.email}</p>
          </div>

          <nav className="space-y-1">
            {navItems.map(item => (
              item.id === 'admin' ? (
                <Link
                  key={item.id}
                  href="/admin"
                  className="w-full p-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all bg-red-600/10 text-red-400 hover:bg-red-600/20"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                </Link>
              ) : (
                <button
                  key={item.id}
                  onClick={() => router.push(`/account?tab=${item.id}`)}
                  className={`w-full p-3 rounded-xl text-sm font-semibold flex items-center justify-between transition-all ${
                    activeTab === item.id ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500 text-[10px] text-white font-bold">{item.badge}</span>
                  )}
                </button>
              )
            ))}
          </nav>

          <div className="pt-2 border-t border-purple-900/30">
            <button onClick={signOut} className="w-full p-3 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-950/40 flex items-center gap-3 transition-all">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </aside>

        {/* RIGHT CONTENT AREA */}
        <section className="flex-1 space-y-6">
          
          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in-up">
              
              {(role === 'admin' || role === 'moderator') && (
                <div className="bg-red-950/20 border border-red-900/30 rounded-2xl p-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-red-400 font-bold flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Admin Overview</h3>
                    <div className="flex gap-4 mt-2 text-sm text-slate-300">
                      <span>Pending: <strong className="text-white">{stats.pendingSubmissions}</strong></span>
                      <span>Total: <strong className="text-white">{stats.totalHackathons}</strong></span>
                      <span>Users: <strong className="text-white">{stats.totalUsers}</strong></span>
                    </div>
                  </div>
                  <Link href="/admin" className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-500 transition-colors">Go to Admin Panel →</Link>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Saved Hackathons', value: stats.saved, icon: Bookmark, color: 'text-purple-400' },
                  { label: 'My Submissions', value: stats.submissions, icon: FileText, color: 'text-cyan-400' },
                  { label: 'Achievements', value: 1 + (completeness===100?1:0) + (stats.saved>0?1:0) + (stats.submissions>0?1:0) + (submissions.some(s=>s.status==='approved')?1:0) + (reviews.length>0?1:0), icon: Award, color: 'text-emerald-400' },
                  { label: 'Notifications', value: stats.notifications, icon: Bell, color: 'text-rose-400' }
                ].map((stat, i) => (
                  <div key={i} className="bg-slate-900/60 border border-purple-900/30 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                    <stat.icon className={`w-6 h-6 mb-2 opacity-80 ${stat.color}`} />
                    <div className="text-2xl font-black text-white">{loadingStats ? '-' : stat.value}</div>
                    <div className="text-xs text-slate-400 font-medium">{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-900/60 border border-purple-900/30 rounded-2xl p-6">
                <h3 className="font-bold text-lg mb-4">Upcoming from Saved</h3>
                {loadingStats ? <div className="h-24 bg-purple-900/20 animate-pulse rounded-xl" /> : upcomingSaved.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {upcomingSaved.map(h => <HackathonCard key={h.id} hackathon={h} />)}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Bookmark className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-300 font-semibold">Save hackathons to track their deadlines</p>
                    <button onClick={() => router.push('/')} className="text-purple-400 text-sm mt-2 hover:underline">Discover Hackathons →</button>
                  </div>
                )}
              </div>

              <div className="bg-slate-900/60 border border-purple-900/30 rounded-2xl p-6">
                <h3 className="font-bold text-lg mb-4">My Recent Submissions</h3>
                {loadingStats ? <div className="h-24 bg-purple-900/20 animate-pulse rounded-xl" /> : recentSubmissions.length > 0 ? (
                  <div className="space-y-3">
                    {recentSubmissions.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                        <div className="font-semibold text-sm">{s.title}</div>
                        <div className={`text-xs px-2 py-1 rounded-full border ${
                          s.status === 'approved' ? 'bg-green-950/30 border-green-500/30 text-green-400' :
                          s.status === 'rejected' ? 'bg-red-950/30 border-red-500/30 text-red-400' :
                          'bg-yellow-950/30 border-yellow-500/30 text-yellow-400'
                        }`}>{s.status.toUpperCase()}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-300 font-semibold">You haven&apos;t submitted any hackathons yet</p>
                    <button onClick={() => router.push('/submit')} className="text-purple-400 text-sm mt-2 hover:underline">Submit a hackathon →</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="bg-slate-900/60 border border-purple-900/30 rounded-2xl p-6">
                <div className="flex justify-between items-end mb-2">
                  <h3 className="font-bold">Profile Completeness</h3>
                  <span className="text-sm font-bold text-purple-400">{completeness}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full transition-all duration-500" style={{ width: `${completeness}%` }} />
                </div>
              </div>

              <form onSubmit={handleProfileSave} className="bg-slate-900/60 border border-purple-900/30 rounded-2xl p-6 space-y-6">
                <div className="flex items-center gap-4">
                  {profile.avatarUrl ? (
                    <Image src={profile.avatarUrl} alt="Avatar" width={64} height={64} className="rounded-full bg-slate-800 object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-purple-900 flex items-center justify-center text-xl font-bold">{profile.fullName?.[0] || 'U'}</div>
                  )}
                  <div className="text-xs text-slate-400">Profile photo synced from Google.<br/>It cannot be changed here.</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">Full Name *</label>
                    <input type="text" required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full bg-slate-950 border border-purple-900/40 text-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">Organization / College</label>
                    <input type="text" value={formData.organization} onChange={e => setFormData({...formData, organization: e.target.value})} className="w-full bg-slate-950 border border-purple-900/40 text-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Bio ({formData.bio.length}/200)</label>
                  <textarea maxLength={200} rows={3} value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} className="w-full bg-slate-950 border border-purple-900/40 text-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">Phone / WhatsApp</label>
                    <input type="text" placeholder="+91 XXXXX XXXXX" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-950 border border-purple-900/40 text-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">Website</label>
                    <input type="url" placeholder="https://" value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} className="w-full bg-slate-950 border border-purple-900/40 text-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500" />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <h4 className="font-semibold text-slate-200 mb-4">Social Links</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-2">Twitter/X Handle</label>
                      <div className="flex">
                        <span className="bg-slate-900 border border-purple-900/40 border-r-0 px-4 py-3 rounded-l-xl text-slate-500">@</span>
                        <input type="text" value={formData.socialTwitter} onChange={e => setFormData({...formData, socialTwitter: e.target.value})} className="w-full bg-slate-950 border border-purple-900/40 text-slate-100 rounded-r-xl px-4 py-3 focus:ring-2 focus:ring-purple-500" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-2">LinkedIn URL</label>
                      <input type="url" placeholder="https://linkedin.com/in/..." value={formData.socialLinkedin} onChange={e => setFormData({...formData, socialLinkedin: e.target.value})} className="w-full bg-slate-950 border border-purple-900/40 text-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500" />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-2">Instagram Handle</label>
                      <div className="flex">
                        <span className="bg-slate-900 border border-purple-900/40 border-r-0 px-4 py-3 rounded-l-xl text-slate-500">@</span>
                        <input type="text" value={formData.socialInstagram} onChange={e => setFormData({...formData, socialInstagram: e.target.value})} className="w-full bg-slate-950 border border-purple-900/40 text-slate-100 rounded-r-xl px-4 py-3 focus:ring-2 focus:ring-purple-500" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-2">Discord Username</label>
                      <input type="text" value={formData.socialDiscord} onChange={e => setFormData({...formData, socialDiscord: e.target.value})} className="w-full bg-slate-950 border border-purple-900/40 text-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button type="submit" disabled={isSaving} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-8 rounded-xl transition-colors disabled:opacity-50">
                    {isSaving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: SAVED */}
          {activeTab === 'saved' && (
            <div className="animate-fade-in-up">
              {loadingStats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1,2,3].map(i => <div key={i} className="h-64 bg-purple-900/20 animate-pulse rounded-2xl" />)}
                </div>
              ) : savedHackathons.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedHackathons.map(h => (
                    <div key={h.id} className="relative group">
                      <HackathonCard hackathon={h.hackathons} />
                      <button onClick={() => handleUnsave(h.hackathon_id)} className="absolute top-3 right-3 p-1.5 bg-slate-900/80 rounded-full text-slate-400 hover:text-white hover:bg-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-900/60 border border-purple-900/30 rounded-2xl p-12 text-center">
                  <Bookmark className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-300 mb-2">No saved hackathons yet</h3>
                  <p className="text-slate-500 mb-6 max-w-sm mx-auto">Discover hackathons and save them to track deadlines</p>
                  <button onClick={() => router.push('/')} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-xl transition-colors">
                    Discover Hackathons →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB: SUBMISSIONS */}
          {activeTab === 'submissions' && (
            <div className="animate-fade-in-up space-y-4">
              {loadingStats ? (
                <div className="space-y-3">
                  {[1,2].map(i => <div key={i} className="h-24 bg-purple-900/20 animate-pulse rounded-2xl" />)}
                </div>
              ) : submissions.length > 0 ? (
                submissions.map(s => (
                  <div key={s.id} className="bg-slate-900/60 border border-purple-900/30 rounded-2xl p-4 flex gap-4 items-center">
                    <div className="w-16 h-12 rounded bg-slate-800 overflow-hidden shrink-0 hidden sm:block">
                      {s.cover_image_url ? (
                        <Image src={s.cover_image_url} alt="" width={64} height={48} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-900 to-indigo-900" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-white text-sm sm:text-base">{s.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">{s.mode} • {new Date(s.start_date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        s.status === 'approved' ? 'bg-green-950/30 border-green-500/30 text-green-400' :
                        s.status === 'rejected' ? 'bg-red-950/30 border-red-500/30 text-red-400' :
                        'bg-yellow-950/30 border-yellow-500/30 text-yellow-400'
                      }`}>
                        {s.status.toUpperCase()}
                      </span>
                      {s.status === 'pending' && <div className="text-[10px] text-slate-400 mt-1">Under review — usually 24-48 hours</div>}
                      {s.status === 'approved' && <div className="text-[10px] text-green-400 mt-1">Live on Findathon ✓</div>}
                      {s.status === 'rejected' && s.rejection_reason && <div className="text-[10px] text-red-400 mt-1 max-w-[150px] truncate" title={s.rejection_reason}>Reason: {s.rejection_reason}</div>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-slate-900/60 border border-purple-900/30 rounded-2xl p-12 text-center">
                  <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-300 mb-2">No submissions yet</h3>
                  <p className="text-slate-500 mb-6">Share a hackathon with the community</p>
                  <button onClick={() => router.push('/submit')} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-xl transition-colors">
                    Submit a Hackathon →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB: ACHIEVEMENTS */}
          {activeTab === 'achievements' && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="bg-slate-900/60 border border-purple-900/30 rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <div className="text-4xl font-black text-purple-400 mb-1">Level {level}</div>
                  <div className="text-slate-300 font-bold mb-3">Builder Tier</div>
                  <div className="text-sm font-mono text-purple-300">{xp} / {level*level*100} XP</div>
                </div>
                <div className="hidden sm:block text-xs text-slate-400 space-y-1 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div><strong className="text-purple-400">+50 XP</strong> Complete profile</div>
                  <div><strong className="text-purple-400">+100 XP</strong> Submit hackathon</div>
                  <div><strong className="text-purple-400">+200 XP</strong> Approved hackathon</div>
                  <div><strong className="text-purple-400">+25 XP</strong> Save hackathon</div>
                  <div><strong className="text-purple-400">+75 XP</strong> Write review</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { name: 'First Steps', desc: 'Welcome to Findathon!', icon: '🚀', unlocked: true },
                  { name: 'Profile Complete', desc: 'All profile fields filled', icon: '✨', unlocked: completeness === 100 },
                  { name: 'Scout', desc: 'Save first hackathon', icon: '🔖', unlocked: stats.saved > 0 },
                  { name: 'Contributor', desc: 'Submit first hackathon', icon: '📝', unlocked: stats.submissions > 0 },
                  { name: 'Verified Builder', desc: 'Get a hackathon approved', icon: '✅', unlocked: submissions.some(s => s.status === 'approved') },
                  { name: 'Reviewer', desc: 'Write first review', icon: '⭐', unlocked: reviews.length > 0 },
                ].map((ach, i) => (
                  <div key={i} className={`bg-slate-900/60 border border-purple-900/30 rounded-2xl p-4 flex gap-4 items-center transition-all ${!ach.unlocked ? 'opacity-40 grayscale' : ''}`}>
                    <div className="text-4xl">{ach.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-bold text-white">{ach.name}</h4>
                      <p className="text-xs text-slate-300">{ach.desc}</p>
                    </div>
                    {ach.unlocked ? (
                      <span className="text-[10px] font-bold px-2 py-1 bg-green-500/20 text-green-400 rounded-md">Earned</span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-1 bg-slate-800 text-slate-400 rounded-md">Locked</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="animate-fade-in-up space-y-4">
              <div className="flex justify-end">
                {stats.notifications > 0 && (
                  <button onClick={markAllRead} className="text-sm font-semibold text-purple-400 hover:text-purple-300">
                    Mark all as read
                  </button>
                )}
              </div>
              
              {loadingStats ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-16 bg-purple-900/20 animate-pulse rounded-xl" />)}
                </div>
              ) : notifications.length > 0 ? (
                notifications.map(n => (
                  <div key={n.id} onClick={() => !n.is_read && markRead(n.id)} className={`bg-slate-900/60 border rounded-xl p-4 flex gap-4 items-start ${!n.is_read ? 'border-purple-500/50 cursor-pointer hover:bg-slate-800/80' : 'border-purple-900/30'}`}>
                    <div className="mt-1">
                      {n.type === 'deadline_reminder' ? <Clock className="w-5 h-5 text-yellow-400" /> :
                       n.type === 'hackathon_approved' ? <CheckCircle className="w-5 h-5 text-green-400" /> :
                       n.type === 'hackathon_rejected' ? <XCircle className="w-5 h-5 text-red-400" /> :
                       n.type === 'new_hackathon' ? <Sparkles className="w-5 h-5 text-purple-400" /> :
                       <Bell className="w-5 h-5 text-slate-400" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-white text-sm">{n.title}</h4>
                      <p className="text-xs text-slate-300 mt-1">{n.body}</p>
                      <p className="text-[10px] text-slate-500 mt-2">{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                    {!n.is_read && <div className="w-2 h-2 rounded-full bg-purple-500 mt-2" />}
                  </div>
                ))
              ) : (
                <div className="bg-slate-900/60 border border-purple-900/30 rounded-2xl p-12 text-center">
                  <Bell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-300 mb-2">No notifications yet</h3>
                  <p className="text-slate-500">We&apos;ll notify you about hackathon deadlines and updates</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6 animate-fade-in-up">
              
              <div className="bg-slate-900/60 border border-purple-900/30 rounded-2xl p-6 space-y-6">
                <div>
                  <h3 className="font-bold text-lg mb-4">Account Settings</h3>
                  <div className="mb-4">
                    <label className="block text-slate-300 text-sm font-medium mb-1">Email Address</label>
                    <input type="text" disabled value={profile.email || user?.email || ''} className="w-full md:w-1/2 bg-slate-950 border border-slate-800 text-slate-400 rounded-xl px-4 py-3 cursor-not-allowed" />
                    <p className="text-xs text-slate-500 mt-1">Your email is managed by Google</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg inline-flex text-sm font-medium">
                      <span>G</span> Connected with Google
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-800">
                  <h4 className="font-bold text-sm mb-4">Notification Preferences</h4>
                  <div className="space-y-3">
                    {['Email me about hackathon deadlines', 'Notify me about new hackathons matching my interests', 'Notify me when my submission is reviewed'].map((label, i) => (
                      <label key={i} className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-purple-600 bg-slate-900 border-slate-700 focus:ring-purple-600 focus:ring-offset-slate-900" />
                        <span className="text-sm text-slate-300">{label}</span>
                      </label>
                    ))}
                  </div>
                  <button className="mt-4 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors">Save Preferences</button>
                </div>

                <div className="pt-6 border-t border-slate-800">
                  <h4 className="font-bold text-sm mb-4">Theme</h4>
                  <label className="flex items-center gap-3 cursor-not-allowed opacity-70">
                    <input type="checkbox" checked disabled className="w-4 h-4 rounded text-purple-600 bg-slate-900 border-slate-700" />
                    <span className="text-sm text-slate-300">Dark Mode</span>
                  </label>
                  <p className="text-xs text-slate-500 mt-2">More themes coming soon</p>
                </div>
              </div>

              <div className="bg-red-950/20 border border-red-900/40 rounded-2xl p-6">
                <h3 className="font-bold text-lg text-red-400 flex items-center gap-2 mb-4"><TriangleAlert className="w-5 h-5" /> Danger Zone</h3>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 border-b border-red-900/20">
                  <div>
                    <h4 className="font-bold text-sm text-slate-200">Export My Data</h4>
                    <p className="text-xs text-slate-400 max-w-md mt-1">Download all your data including saved hackathons, submissions, and profile information.</p>
                  </div>
                  <button onClick={handleExport} className="shrink-0 bg-transparent border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold py-2 px-4 rounded-lg transition-colors text-sm">
                    Export Data
                  </button>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4">
                  <div>
                    <h4 className="font-bold text-sm text-slate-200">Delete My Account</h4>
                    <p className="text-xs text-slate-400 max-w-md mt-1">Permanently delete your account and all associated data. This action cannot be undone.</p>
                  </div>
                  <button onClick={() => setShowDeleteModal(true)} className="shrink-0 bg-transparent border border-red-900 text-red-400 hover:bg-red-900/30 font-bold py-2 px-4 rounded-lg transition-colors text-sm">
                    Delete Account
                  </button>
                </div>
              </div>

            </div>
          )}

        </section>
      </main>

      {/* DELETE ACCOUNT MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-red-900/40 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-red-400 mb-2">Delete Account</h3>
            <p className="text-sm text-slate-300 mb-4">This will permanently delete:</p>
            <ul className="text-xs text-slate-400 list-disc list-inside mb-6 space-y-1">
              <li>Your profile and all personal information</li>
              <li>All saved hackathons</li>
              <li>All submitted hackathons (pending ones will be removed)</li>
              <li>All notifications</li>
            </ul>
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-300 mb-2">Type &quot;DELETE&quot; to confirm</label>
              <input type="text" value={deleteInput} onChange={e => setDeleteInput(e.target.value)} className="w-full bg-slate-950 border border-red-900/40 text-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none" />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setShowDeleteModal(false); setDeleteInput(''); }} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-800">
                Cancel
              </button>
              <button onClick={handleDeleteAccount} disabled={deleteInput !== 'DELETE'} className="px-4 py-2 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed">
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toastMessage && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-xl border flex items-center gap-3 shadow-2xl z-50 animate-fade-in-up ${
          toastMessage.type === 'success' ? 'bg-green-900/90 border-green-500/40 text-green-300' : 'bg-red-900/90 border-red-500/40 text-red-300'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span className="text-sm font-bold">{toastMessage.text}</span>
        </div>
      )}

      <Footer />
    </div>
  );
}
