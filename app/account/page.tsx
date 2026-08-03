'use client';

import React, { useState, useEffect, use } from 'react';
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
  X,
} from 'lucide-react';

export default function AccountDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const resolvedParams = searchParams ? use(searchParams) : { tab: 'dashboard' };
  const initialTab = resolvedParams?.tab || 'dashboard';

  const router = useRouter();
  const { user, profile, role, loading: authLoading, signOut, refreshProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [loadingStats, setLoadingStats] = useState(true);

  // Data
  const [stats, setStats] = useState({ saved: 0, submissions: 0, notifications: 0 });
  const [savedHackathons, setSavedHackathons] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);

  // Profile form — uses snake_case to match DB exactly
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    organization: '',
    phone: '',
    website: '',
    social_twitter: '',
    social_linkedin: '',
    social_instagram: '',
    social_discord: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Settings
  const [deleteInput, setDeleteInput] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Sync tab from URL
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Sync profile → form (snake_case)
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        organization: profile.organization || '',
        phone: profile.phone || '',
        website: profile.website || '',
        social_twitter: profile.social_twitter || '',
        social_linkedin: profile.social_linkedin || '',
        social_instagram: profile.social_instagram || '',
        social_discord: profile.social_discord || '',
      });
    }
  }, [profile]);

  // Fetch all dashboard data directly from Supabase (avoids broken API routes)
  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    const fetchAllData = async () => {
      setLoadingStats(true);
      try {
        const [savedRes, subsRes, notifsRes, reviewsRes] = await Promise.all([
          supabase
            .from('saved_hackathons')
            .select('*, hackathons(*)')
            .eq('user_id', user.id)
            .order('saved_at', { ascending: false }),
          supabase
            .from('hackathons')
            .select('id, title, status, start_date, end_date, cover_image_url, location_city, is_online, tags, organizer')
            .eq('submitted_by', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20),
          supabase
            .from('hackathon_reviews')
            .select('id')
            .eq('user_id', user.id),
        ]);

        if (!isMounted) return;

        const saved = savedRes.data || [];
        const subs = subsRes.data || [];
        const notifs = notifsRes.data || [];
        const revs = reviewsRes.data || [];

        setSavedHackathons(saved);
        setSubmissions(subs);
        setNotifications(notifs);
        setReviews(revs);
        setStats({
          saved: saved.length,
          submissions: subs.length,
          notifications: notifs.filter((n: any) => !n.is_read).length,
        });
      } catch (e) {
        console.error('[Dashboard] fetchAllData error:', e);
      } finally {
        if (isMounted) setLoadingStats(false);
      }
    };

    fetchAllData();

    // Realtime notifications
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (!isMounted) return;
          setNotifications((prev) => [payload.new as any, ...prev]);
          setStats((prev) => ({ ...prev, notifications: prev.notifications + 1 }));
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const showToast = (text: string, type: 'success' | 'error') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, ...formData, updated_at: new Date().toISOString() });
      if (error) throw error;
      await refreshProfile();
      showToast('Profile saved!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnsave = async (savedId: string, hackathonId: string) => {
    await supabase.from('saved_hackathons').delete().eq('id', savedId);
    setSavedHackathons((prev) => prev.filter((h) => h.id !== savedId));
    setStats((prev) => ({ ...prev, saved: Math.max(0, prev.saved - 1) }));
  };

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setStats((prev) => ({ ...prev, notifications: Math.max(0, prev.notifications - 1) }));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setStats((prev) => ({ ...prev, notifications: 0 }));
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  // Derived values — all snake_case
  const xp = profile?.xp_points || 0;
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Developer';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const userEmail = profile?.email || user?.email || '';

  const filledFields = ['full_name', 'bio', 'organization', 'phone', 'website', 'social_twitter', 'social_linkedin', 'social_instagram', 'social_discord']
    .filter((f) => formData[f as keyof typeof formData]?.length > 0).length;
  const completeness = Math.round((filledFields / 9) * 100);

  const upcomingSaved = savedHackathons
    .filter((h) => h.hackathons && new Date(h.hackathons.start_date) > new Date())
    .sort((a, b) => new Date(a.hackathons.start_date).getTime() - new Date(b.hackathons.start_date).getTime())
    .slice(0, 3);

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
    navItems.push({ id: 'admin', label: 'Admin Panel', icon: ShieldCheck } as any);
  }

  // Loading / unauthed guard
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#060816] flex flex-col">
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

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-[#060816] flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-slate-400 text-sm">Please sign in to view your dashboard.</p>
            <button onClick={() => router.push('/')} className="px-6 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-500 transition-all">
              Go Home
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060816] text-slate-100 selection:bg-purple-600 selection:text-white">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-24 flex flex-col md:flex-row gap-8">

        {/* ── SIDEBAR ── */}
        <aside className="w-full md:w-64 shrink-0 space-y-6 h-fit md:sticky md:top-24">
          <div className="glass-card rounded-3xl border border-purple-900/30 p-6 space-y-6">
            {/* Avatar + name */}
            <div className="flex flex-col items-center text-center pb-6 border-b border-purple-900/30">
              <div className="w-20 h-20 rounded-full border-2 border-purple-500/50 overflow-hidden mb-3 flex items-center justify-center bg-slate-900">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <h3 className="font-bold text-base text-white">{displayName}</h3>
              <div className="text-xs text-purple-400 font-mono mt-1">Level {level} Builder</div>
              <p className="text-xs text-slate-500 mt-1 truncate max-w-full">{userEmail}</p>
            </div>

            {/* Nav */}
            <nav className="space-y-1">
              {navItems.map((item) =>
                item.id === 'admin' ? (
                  <Link
                    key={item.id}
                    href="/admin"
                    className="w-full p-3 rounded-xl text-xs font-bold flex items-center gap-3 transition-all bg-red-600/10 text-red-400 hover:bg-red-600/20"
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                ) : (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); router.push(`/account?tab=${item.id}`, { scroll: false }); }}
                    className={`w-full p-3 rounded-xl text-sm font-semibold flex items-center justify-between transition-all ${activeTab === item.id
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {(item as any).badge && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500 text-[10px] text-white font-bold">
                        {(item as any).badge}
                      </span>
                    )}
                  </button>
                )
              )}
            </nav>

            <div className="pt-2 border-t border-purple-900/30">
              <button
                onClick={handleSignOut}
                className="w-full p-3 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-950/40 flex items-center gap-3 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <section className="flex-1 space-y-6 min-w-0">

          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in-up">
              {/* Welcome */}
              <div className="glass-card rounded-3xl border border-purple-500/30 p-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-black text-white">Welcome back, {displayName}! 👋</h1>
                    <p className="text-xs text-slate-400 mt-1">Ready to build something amazing today?</p>
                  </div>
                  <div className="px-4 py-2 rounded-2xl glass-card border border-purple-500/30 text-center">
                    <div className="text-xs text-slate-400 font-mono">Level {level}</div>
                    <div className="text-sm font-black text-amber-300 font-mono">{xp} XP</div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Saved', value: stats.saved, icon: Bookmark, color: 'text-purple-400' },
                  { label: 'Submissions', value: stats.submissions, icon: FileText, color: 'text-cyan-400' },
                  { label: 'Achievements', value: 1 + (completeness === 100 ? 1 : 0) + (stats.saved > 0 ? 1 : 0) + (stats.submissions > 0 ? 1 : 0) + (submissions.some((s) => s.status === 'approved') ? 1 : 0), icon: Award, color: 'text-emerald-400' },
                  { label: 'Notifications', value: stats.notifications, icon: Bell, color: 'text-rose-400' },
                ].map((stat, i) => (
                  <div key={i} className="glass-card rounded-2xl border border-purple-900/30 p-4 flex flex-col items-center justify-center text-center">
                    <stat.icon className={`w-5 h-5 mb-2 ${stat.color}`} />
                    <div className="text-2xl font-black text-white font-mono">{loadingStats ? '—' : stat.value}</div>
                    <div className="text-xs text-slate-400">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Quick actions */}
              <div className="glass-card rounded-2xl border border-purple-900/30 p-6">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" /> Quick Actions
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Link href="/submit" className="p-4 rounded-2xl bg-purple-600/10 border border-purple-500/30 hover:bg-purple-600/20 transition-all text-center group">
                    <Sparkles className="w-6 h-6 text-purple-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-xs font-bold text-white">Submit Hackathon</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">List your event</p>
                  </Link>
                  <Link href="/" className="p-4 rounded-2xl bg-cyan-600/10 border border-cyan-500/30 hover:bg-cyan-600/20 transition-all text-center group">
                    <Bookmark className="w-6 h-6 text-cyan-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-xs font-bold text-white">Discover Events</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Find hackathons</p>
                  </Link>
                  <button onClick={() => setActiveTab('profile')} className="p-4 rounded-2xl bg-emerald-600/10 border border-emerald-500/30 hover:bg-emerald-600/20 transition-all text-center group">
                    <UserIcon className="w-6 h-6 text-emerald-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-xs font-bold text-white">Edit Profile</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{completeness}% complete</p>
                  </button>
                </div>
              </div>

              {/* Upcoming saved */}
              <div className="glass-card rounded-2xl border border-purple-900/30 p-6">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-400" /> Upcoming from Saved
                </h3>
                {loadingStats ? (
                  <div className="h-24 bg-purple-900/20 animate-pulse rounded-xl" />
                ) : upcomingSaved.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {upcomingSaved.map((h) => (
                      <HackathonCard key={h.id} hackathon={h.hackathons} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Bookmark className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">Save hackathons to track deadlines</p>
                    <Link href="/" className="text-purple-400 text-xs mt-2 block hover:underline">Discover Hackathons →</Link>
                  </div>
                )}
              </div>

              {/* Recent submissions */}
              <div className="glass-card rounded-2xl border border-purple-900/30 p-6">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" /> Recent Submissions
                </h3>
                {loadingStats ? (
                  <div className="h-24 bg-purple-900/20 animate-pulse rounded-xl" />
                ) : submissions.slice(0, 3).length > 0 ? (
                  <div className="space-y-3">
                    {submissions.slice(0, 3).map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                        <p className="text-sm font-semibold text-white truncate pr-4">{s.title}</p>
                        <span className={`shrink-0 text-xs px-2 py-1 rounded-full border font-medium ${s.status === 'approved' ? 'bg-green-950/30 border-green-500/30 text-green-400' :
                            s.status === 'rejected' ? 'bg-red-950/30 border-red-500/30 text-red-400' :
                              'bg-yellow-950/30 border-yellow-500/30 text-yellow-400'
                          }`}>
                          {s.status?.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">No submissions yet</p>
                    <Link href="/submit" className="text-purple-400 text-xs mt-2 block hover:underline">Submit a hackathon →</Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="glass-card rounded-2xl border border-purple-900/30 p-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-white">Profile Completeness</h3>
                  <span className="text-sm font-bold text-purple-400">{completeness}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full transition-all duration-500" style={{ width: `${completeness}%` }} />
                </div>
              </div>

              <form onSubmit={handleProfileSave} className="glass-card rounded-2xl border border-purple-900/30 p-6 space-y-6">
                {/* Avatar preview */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full border-2 border-purple-500/40 overflow-hidden flex items-center justify-center bg-slate-900 shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{displayName}</p>
                    <p className="text-xs text-slate-400">{userEmail}</p>
                    <p className="text-[10px] text-purple-400 mt-1">Avatar synced from Google</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 text-xs font-bold mb-2">Full Name *</label>
                    <input type="text" required value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full bg-slate-950 border border-purple-900/40 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-xs font-bold mb-2">Organization / College</label>
                    <input type="text" value={formData.organization}
                      onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                      className="w-full bg-slate-950 border border-purple-900/40 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm" />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 text-xs font-bold mb-2">Bio ({formData.bio.length}/200)</label>
                  <textarea maxLength={200} rows={3} value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Tell the community about yourself..."
                    className="w-full bg-slate-950 border border-purple-900/40 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none text-sm" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 text-xs font-bold mb-2">Phone / WhatsApp</label>
                    <input type="text" placeholder="+91 XXXXX XXXXX" value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-purple-900/40 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-xs font-bold mb-2">Website</label>
                    <input type="url" placeholder="https://" value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="w-full bg-slate-950 border border-purple-900/40 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm" />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <h4 className="font-semibold text-white text-sm mb-4">Social Links</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: 'Twitter/X', key: 'social_twitter', prefix: '@', placeholder: 'handle' },
                      { label: 'Instagram', key: 'social_instagram', prefix: '@', placeholder: 'handle' },
                    ].map(({ label, key, prefix, placeholder }) => (
                      <div key={key}>
                        <label className="block text-slate-300 text-xs font-bold mb-2">{label}</label>
                        <div className="flex">
                          <span className="bg-slate-900 border border-purple-900/40 border-r-0 px-3 py-3 rounded-l-xl text-slate-500 text-sm">{prefix}</span>
                          <input type="text" placeholder={placeholder} value={formData[key as keyof typeof formData]}
                            onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                            className="w-full bg-slate-950 border border-purple-900/40 text-white rounded-r-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm" />
                        </div>
                      </div>
                    ))}
                    <div>
                      <label className="block text-slate-300 text-xs font-bold mb-2">LinkedIn URL</label>
                      <input type="url" placeholder="https://linkedin.com/in/..." value={formData.social_linkedin}
                        onChange={(e) => setFormData({ ...formData, social_linkedin: e.target.value })}
                        className="w-full bg-slate-950 border border-purple-900/40 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm" />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-xs font-bold mb-2">Discord</label>
                      <input type="text" placeholder="username" value={formData.social_discord}
                        onChange={(e) => setFormData({ ...formData, social_discord: e.target.value })}
                        className="w-full bg-slate-950 border border-purple-900/40 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button type="submit" disabled={isSaving}
                    className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-3 px-8 rounded-xl transition-all hover:scale-105 active:scale-95 text-sm flex items-center gap-2">
                    {isSaving ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                    ) : 'Save Profile'}
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
                  {[1, 2, 3].map((i) => <div key={i} className="h-64 bg-purple-900/20 animate-pulse rounded-2xl" />)}
                </div>
              ) : savedHackathons.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedHackathons.map((h) => (
                    <div key={h.id} className="relative group">
                      {h.hackathons && <HackathonCard hackathon={h.hackathons} />}
                      <button
                        onClick={() => handleUnsave(h.id, h.hackathon_id)}
                        className="absolute top-3 right-3 p-1.5 bg-slate-900/80 rounded-full text-slate-400 hover:text-white hover:bg-rose-500 transition-colors opacity-0 group-hover:opacity-100 z-10"
                        title="Remove from saved"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass-card rounded-2xl border border-purple-900/30 p-12 text-center">
                  <Bookmark className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-300 mb-2">No saved hackathons yet</h3>
                  <p className="text-slate-500 mb-6 text-sm">Discover hackathons and bookmark the ones you love</p>
                  <Link href="/" className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-xl transition-all inline-block text-sm">
                    Discover Hackathons →
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* TAB: SUBMISSIONS */}
          {activeTab === 'submissions' && (
            <div className="animate-fade-in-up space-y-4">
              {loadingStats ? (
                <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-24 bg-purple-900/20 animate-pulse rounded-2xl" />)}</div>
              ) : submissions.length > 0 ? (
                submissions.map((s) => (
                  <div key={s.id} className="glass-card rounded-2xl border border-purple-900/30 p-4 flex gap-4 items-center">
                    <div className="w-16 h-12 rounded-lg bg-slate-800 overflow-hidden shrink-0 hidden sm:block">
                      {s.cover_image_url ? (
                        <img src={s.cover_image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-900 to-indigo-900" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white text-sm truncate">{s.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        {s.location_city || (s.is_online ? 'Online' : 'TBD')} •{' '}
                        {s.start_date ? new Date(s.start_date).toLocaleDateString() : 'Date TBD'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${s.status === 'approved' ? 'bg-green-950/30 border-green-500/30 text-green-400' :
                          s.status === 'rejected' ? 'bg-red-950/30 border-red-500/30 text-red-400' :
                            'bg-yellow-950/30 border-yellow-500/30 text-yellow-400'
                        }`}>
                        {s.status === 'approved' ? '✓ Live' : s.status === 'rejected' ? '✗ Rejected' : '⏳ Pending'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="glass-card rounded-2xl border border-purple-900/30 p-12 text-center">
                  <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-300 mb-2">No submissions yet</h3>
                  <p className="text-slate-500 mb-6 text-sm">Share a hackathon with the Findathon community</p>
                  <Link href="/submit" className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-xl transition-all inline-block text-sm">
                    Submit a Hackathon →
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* TAB: ACHIEVEMENTS */}
          {activeTab === 'achievements' && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="glass-card rounded-2xl border border-purple-900/30 p-6 flex items-center justify-between">
                <div>
                  <div className="text-4xl font-black text-purple-400 mb-1">Level {level}</div>
                  <div className="text-slate-300 font-semibold text-sm">Builder Tier</div>
                  <div className="text-sm font-mono text-purple-300 mt-1">{xp} / {level * level * 100} XP</div>
                </div>
                <div className="hidden sm:block text-xs text-slate-400 space-y-1 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div><strong className="text-purple-400">+50 XP</strong> Complete profile</div>
                  <div><strong className="text-purple-400">+100 XP</strong> Submit hackathon</div>
                  <div><strong className="text-purple-400">+200 XP</strong> Approved submission</div>
                  <div><strong className="text-purple-400">+25 XP</strong> Save hackathon</div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { name: 'First Steps', desc: 'Welcome to Findathon!', icon: '🚀', unlocked: true },
                  { name: 'Profile Complete', desc: 'Fill all profile fields', icon: '✨', unlocked: completeness === 100 },
                  { name: 'Scout', desc: 'Save your first hackathon', icon: '🔖', unlocked: stats.saved > 0 },
                  { name: 'Contributor', desc: 'Submit first hackathon', icon: '📝', unlocked: stats.submissions > 0 },
                  { name: 'Verified Builder', desc: 'Get a hackathon approved', icon: '✅', unlocked: submissions.some((s) => s.status === 'approved') },
                  { name: 'Reviewer', desc: 'Write your first review', icon: '⭐', unlocked: reviews.length > 0 },
                ].map((ach, i) => (
                  <div key={i} className={`glass-card rounded-2xl border border-purple-900/30 p-4 flex gap-4 items-center transition-all ${!ach.unlocked ? 'opacity-40 grayscale' : ''}`}>
                    <div className="text-3xl">{ach.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-bold text-white text-sm">{ach.name}</h4>
                      <p className="text-xs text-slate-400">{ach.desc}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${ach.unlocked ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
                      {ach.unlocked ? 'Earned' : 'Locked'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="animate-fade-in-up space-y-4">
              {stats.notifications > 0 && (
                <div className="flex justify-end">
                  <button onClick={markAllRead} className="text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors">
                    Mark all as read
                  </button>
                </div>
              )}
              {loadingStats ? (
                <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-purple-900/20 animate-pulse rounded-xl" />)}</div>
              ) : notifications.length > 0 ? (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => !n.is_read && markRead(n.id)}
                    className={`glass-card rounded-xl border p-4 flex gap-4 items-start transition-all ${!n.is_read ? 'border-purple-500/50 cursor-pointer hover:bg-slate-800/60' : 'border-purple-900/30'
                      }`}
                  >
                    <div className="mt-1 text-lg">
                      {n.type === 'hackathon_approved' ? '✅' :
                        n.type === 'hackathon_rejected' ? '❌' :
                          n.type === 'deadline_reminder' ? '⏰' : '🔔'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white text-sm">{n.title}</h4>
                      <p className="text-xs text-slate-300 mt-1">{n.message || n.body}</p>
                      <p className="text-[10px] text-slate-500 mt-2">{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                    {!n.is_read && <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 shrink-0" />}
                  </div>
                ))
              ) : (
                <div className="glass-card rounded-2xl border border-purple-900/30 p-12 text-center">
                  <Bell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-300 mb-2">You're all caught up! 🎉</h3>
                  <p className="text-slate-500 text-sm">No new notifications right now</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="glass-card rounded-2xl border border-purple-900/30 p-6 space-y-6">
                <div>
                  <h3 className="font-bold text-white text-lg mb-4">Account Settings</h3>
                  <div className="mb-4">
                    <label className="block text-slate-300 text-xs font-bold mb-2">Email Address</label>
                    <input type="text" disabled value={userEmail}
                      className="w-full md:w-1/2 bg-slate-950 border border-slate-800 text-slate-400 rounded-xl px-4 py-3 cursor-not-allowed text-sm" />
                    <p className="text-xs text-slate-500 mt-1">Managed by Google</p>
                  </div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-sm font-medium">
                    <span className="font-bold">G</span> Connected with Google
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-800">
                  <h4 className="font-bold text-sm text-white mb-4">Notification Preferences</h4>
                  <div className="space-y-3">
                    {['Email me about hackathon deadlines', 'Notify me about new events matching my interests', 'Notify me when my submission is reviewed'].map((label, i) => (
                      <label key={i} className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" defaultChecked
                          className="w-4 h-4 rounded text-purple-600 bg-slate-900 border-slate-700 focus:ring-purple-500" />
                        <span className="text-sm text-slate-300">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-2xl border border-red-900/40 p-6">
                <h3 className="font-bold text-lg text-red-400 flex items-center gap-2 mb-4">
                  <TriangleAlert className="w-5 h-5" /> Danger Zone
                </h3>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-sm text-white">Delete My Account</h4>
                    <p className="text-xs text-slate-400 mt-1">Permanently removes your account and all data. Cannot be undone.</p>
                  </div>
                  <button onClick={() => setShowDeleteModal(true)}
                    className="shrink-0 border border-red-900 text-red-400 hover:bg-red-900/30 font-bold py-2 px-4 rounded-xl transition-all text-sm">
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}

        </section>
      </main>

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-red-900/40 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-red-400 mb-2">Delete Account</h3>
            <p className="text-sm text-slate-300 mb-4">This permanently deletes your profile, saved hackathons, and submissions.</p>
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-300 mb-2">Type "DELETE" to confirm</label>
              <input type="text" value={deleteInput} onChange={(e) => setDeleteInput(e.target.value)}
                className="w-full bg-slate-950 border border-red-900/40 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none text-sm" />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setShowDeleteModal(false); setDeleteInput(''); }}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-800 transition-all">
                Cancel
              </button>
              <button disabled={deleteInput !== 'DELETE'}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toastMessage && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-xl border flex items-center gap-3 shadow-2xl z-50 animate-fade-in-up ${toastMessage.type === 'success' ? 'bg-green-900/90 border-green-500/40 text-green-300' : 'bg-red-900/90 border-red-500/40 text-red-300'
          }`}>
          {toastMessage.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span className="text-sm font-bold">{toastMessage.text}</span>
        </div>
      )}

      <Footer />
    </div>
  );
}