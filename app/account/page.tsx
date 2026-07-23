'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/lib/auth-context';
import { useAuthModal } from '@/components/AuthModal';
import { discoveryEngine } from '@/lib/discovery-engine';
import { storageService } from '@/lib/storage-service';
import { updateProfile, getUserHackathons, Hackathon } from '@/lib/supabase';
import {
  LayoutDashboard,
  User as UserIcon,
  Bookmark,
  FileText,
  Users,
  Trophy,
  Bell,
  Settings,
  LogOut,
  Send,
  ArrowRight,
  Camera,
  CheckCircle2,
  AlertCircle,
  X,
  Globe,
  Sparkles,
  PlusCircle,
  Calendar,
  MapPin,
  Loader2,
  Save,
  MessageSquare,
  ShieldCheck,
  Award,
  Compass,
  Rocket,
  Zap,
  Mail
} from 'lucide-react';

// Social SVG Icons
function TwitterIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedinIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.74a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2z" />
    </svg>
  );
}

function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

// Hexagon SVG Badge Icon Component
function HexagonBadge({ className = "w-16 h-16", color = "violet" }: { className?: string; color?: string }) {
  const gradientId = `hex-grad-${color}`;
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color === "cyan" ? "#4CC9F0" : color === "emerald" ? "#00FFA3" : color === "amber" ? "#F59E0B" : "#8B5CF6"} />
          <stop offset="100%" stopColor={color === "cyan" ? "#00E5FF" : color === "emerald" ? "#10B981" : color === "amber" ? "#D97706" : "#4F46E5"} />
        </linearGradient>
      </defs>
      <polygon points="50 5, 90 25, 90 75, 50 95, 10 75, 10 25" fill={`url(#${gradientId})`} opacity="0.2" stroke={`url(#${gradientId})`} strokeWidth="4" />
      <polygon points="50 15, 80 30, 80 70, 50 85, 20 70, 20 30" fill={`url(#${gradientId})`} opacity="0.4" />
    </svg>
  );
}

// Animated Stat Counter Component
function AnimatedNumber({ value }: { value: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const duration = 1500;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * value));

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, [value]);

  return <span className="font-mono-num">{count}</span>;
}

// SVG Circle Completion Ring
function CompletionRing({ percentage }: { percentage: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * percentage) / 100;

  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke="rgba(139, 92, 246, 0.15)"
          strokeWidth="6"
          fill="transparent"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke="#8B5CF6"
          strokeWidth="6"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-base font-black text-white font-mono-num">{percentage}%</span>
        <span className="text-[9px] text-slate-400 font-semibold uppercase">Profile</span>
      </div>
    </div>
  );
}

// MOCK NOTIFICATIONS
const INITIAL_NOTIFICATIONS = [
  { id: '1', title: '🎉 Hackathon Approved', desc: 'Your submission "AI Innovators 2026" was verified and published.', time: '2 hours ago', icon: Sparkles, color: 'text-emerald-400', unread: true },
  { id: '2', title: '⏰ Deadline Alert', desc: 'Registration for "Web3 Summit" closes in 2 days.', time: '5 hours ago', icon: Bell, color: 'text-amber-400', unread: true },
  { id: '3', title: '🆕 New Hackathon in San Francisco', desc: 'GenAI & Agentic Systems Hackathon has opened registrations.', time: '1 day ago', icon: Globe, color: 'text-cyan-400', unread: false },
  { id: '4', title: '✅ Profile Completed', desc: 'You updated your social profiles and background bio.', time: '2 days ago', icon: CheckCircle2, color: 'text-purple-400', unread: false },
  { id: '5', title: '🏆 Achievement Unlocked', desc: 'You earned the "Early Bird" pioneer developer badge.', time: '3 days ago', icon: Trophy, color: 'text-amber-400', unread: false }
];

function AccountDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, profile, loading: authLoading, signOut, refreshProfile } = useAuth();
  const { openAuthModal } = useAuthModal();

  const tabParam = searchParams.get('tab') || 'dashboard';
  const [internalTab, setInternalTab] = useState<string | null>(null);
  const activeTab = internalTab || tabParam;

  const setActiveTab = (tab: string) => {
    setInternalTab(tab);
    router.push(`/account?tab=${tab}`);
  };

  // Profile Form State with derived defaults
  const [rawFormData, setFormData] = useState<Record<string, string>>({});

  const formData = useMemo(() => ({
    full_name: rawFormData.full_name ?? profile?.full_name ?? '',
    bio: rawFormData.bio ?? profile?.bio ?? '',
    organization: rawFormData.organization ?? profile?.organization ?? '',
    phone: rawFormData.phone ?? profile?.phone ?? '',
    website: rawFormData.website ?? profile?.website ?? '',
    social_twitter: rawFormData.social_twitter ?? profile?.social_twitter ?? '',
    social_linkedin: rawFormData.social_linkedin ?? profile?.social_linkedin ?? '',
    social_instagram: rawFormData.social_instagram ?? profile?.social_instagram ?? '',
    social_discord: rawFormData.social_discord ?? profile?.social_discord ?? ''
  }), [rawFormData, profile]);

  const [savingProfile, setSavingProfile] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Supabase fetched data
  const [userHackathons, setUserHackathons] = useState<Hackathon[]>([]);
  const [savedHackathons, setSavedHackathons] = useState<Hackathon[]>([]);
  const [allHackathons, setAllHackathons] = useState<Hackathon[]>([]);

  // Settings & Delete modal
  const [notificationsList, setNotificationsList] = useState(INITIAL_NOTIFICATIONS);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  // Settings Toggles State
  const [settingsToggles, setSettingsToggles] = useState({
    emailNotifs: true,
    deadlineReminders: true,
    cityHackathons: true,
    weeklyDigest: false,
    publicProfile: true,
    publicSubmissions: true
  });

  // Load User Data via Discovery Engine & Storage Service
  useEffect(() => {
    async function loadDashboardData() {
      const { results: all } = await discoveryEngine.discover();
      setAllHackathons(all as unknown as Hackathon[]);

      if (user?.id) {
        const userSubs = await getUserHackathons(user.id);
        setUserHackathons(userSubs);

        const savedIdsArray = storageService.getSavedIds();
        const savedItems = all.filter(h => savedIdsArray.includes(h.id));
        setSavedHackathons(savedItems as unknown as Hackathon[]);
      }
    }

    loadDashboardData();
  }, [user?.id]);

  // Profile Completeness Calculation
  const completeness = useMemo(() => {
    const fields = [
      formData.full_name,
      formData.bio,
      formData.organization,
      formData.phone,
      formData.website,
      formData.social_twitter,
      formData.social_linkedin,
      formData.social_instagram,
      formData.social_discord
    ];
    const filled = fields.filter(f => f && f.trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  }, [formData]);

  // Toast Auto-Dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setSavingProfile(true);
    const res = await updateProfile(user.id, formData);
    setSavingProfile(false);

    if (res.success) {
      await refreshProfile();
      setToastMessage('Profile updated successfully!');
    } else {
      setToastMessage(`Error: ${res.error || 'Failed to save profile'}`);
    }
  };

  const handleUnsave = (hackathonId: string) => {
    setSavedHackathons(prev => prev.filter(item => item.id !== hackathonId));
    try {
      const stored = localStorage.getItem('findathon_saved_ids');
      const ids: string[] = stored ? JSON.parse(stored) : [];
      const updated = ids.filter(id => id !== hackathonId);
      localStorage.setItem('findathon_saved_ids', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = notificationsList.filter(n => n.unread).length;

  const markAllNotificationsRead = () => {
    setNotificationsList(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const switchTab = (tabKey: string) => {
    setActiveTab(tabKey);
    router.push(`/account?tab=${tabKey}`);
  };

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-[#060816] text-[#F6F8FC]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
          <p className="text-sm font-semibold text-purple-300">Loading your account dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#060816] text-[#F6F8FC] flex flex-col justify-between">
        <Navbar />
        <main className="flex-1 max-w-xl w-full mx-auto px-4 py-24 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-3xl glass-card border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-xl">
            <UserIcon className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-black text-white glow-text">Sign In Required</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Please sign in to access your dashboard, saved hackathons, submissions, and account settings.
          </p>
          <button
            onClick={openAuthModal}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold bg-white text-slate-900 hover:bg-slate-100 shadow-xl transition-all"
          >
            <span>Sign In with Google</span>
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const userName = formData.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Builder';

  // Navigation Items Config
  const NAV_ITEMS = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'profile', label: 'Profile', icon: UserIcon },
    { key: 'saved', label: 'Saved Hackathons', icon: Bookmark },
    { key: 'submissions', label: 'My Submissions', icon: FileText },
    { key: 'teams', label: 'My Teams', icon: Users },
    { key: 'achievements', label: 'Achievements', icon: Trophy },
    { key: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
    { key: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-[#060816] text-[#F6F8FC] flex relative">
      
      {/* 1. FIXED LEFT SIDEBAR (Desktop) */}
      <aside className="fixed top-0 left-0 h-full w-64 z-30 bg-[#0D1224]/80 backdrop-blur-xl border-r border-purple-900/20 flex-col justify-between hidden md:flex">
        
        {/* TOP BRAND SECTION */}
        <div className="p-6 border-b border-purple-900/20">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="text-purple-400 text-lg group-hover:rotate-12 transition-transform">✦</span>
            <span className="text-lg font-black tracking-tight text-white flex items-center gap-1">
              Find<span className="text-gradient">athon</span>
            </span>
          </Link>
        </div>

        {/* NAVIGATION LINKS LIST */}
        <div className="px-3 py-4 flex-1 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => switchTab(item.key)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <IconComponent className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                ) : null}
              </button>
            );
          })}
        </div>

        {/* BOTTOM USER PROFILE & LOGOUT */}
        <div className="p-4 border-t border-purple-900/20 space-y-3">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt={userName} className="w-8 h-8 rounded-full object-cover ring-1 ring-purple-500/40" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center">
                {userName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="overflow-hidden text-left">
              <p className="text-xs font-bold text-white truncate">{userName}</p>
              <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
            </div>
          </div>

          <button
            onClick={() => signOut().then(() => router.push('/'))}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/40 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>

      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 md:ml-64 p-4 sm:p-8 min-h-screen overflow-y-auto pb-24 md:pb-8">
        
        {/* ========================================================= */}
        {/* TAB 1: DASHBOARD (DEFAULT) */}
        {/* ========================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fade-in-up">
            
            {/* TOP ROW — Welcome + Level Card */}
            <div className="flex flex-col lg:flex-row items-stretch justify-between gap-6">
              
              <div className="flex-1 space-y-2">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                  Welcome back, <span className="glow-text">{userName}</span>! 👋
                </h1>
                <p className="text-sm sm:text-base text-slate-400">
                  Ready to build something amazing today? Track deadlines, save hackathons, and manage your events.
                </p>
              </div>

              {/* Level 12 Builder Card */}
              <div className="glass-card w-full lg:w-80 p-5 rounded-2xl border border-purple-500/20 shadow-2xl relative overflow-hidden flex flex-col justify-between shrink-0">
                <div className="flex items-center justify-between z-10">
                  <div>
                    <h3 className="text-2xl font-black text-white font-mono-num">Level 12</h3>
                    <span className="text-xs font-bold text-purple-400">Builder Tier</span>
                  </div>
                  <HexagonBadge className="w-14 h-14" color="violet" />
                </div>

                <div className="space-y-1.5 pt-4 z-10">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-400">XP Progress</span>
                    <span className="text-purple-300 font-mono-num">2,410 / 5,000 XP</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-purple-900/40">
                    <div className="h-full bg-gradient-to-r from-purple-600 via-indigo-500 to-cyan-400 w-[48%] rounded-full transition-all duration-1000" />
                  </div>
                </div>
              </div>

            </div>

            {/* STATS ROW (4 Cards with Count-Up Animation) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Saved Hackathons */}
              <div className="glass-card glass-card-hover p-5 rounded-2xl flex items-center gap-4 border border-purple-500/20">
                <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                  <Bookmark className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-3xl font-black text-purple-300 font-mono-num">
                    <AnimatedNumber value={savedHackathons.length} />
                  </div>
                  <span className="text-xs text-slate-400 font-medium">Saved Hackathons</span>
                </div>
              </div>

              {/* Card 2: My Submissions */}
              <div className="glass-card glass-card-hover p-5 rounded-2xl flex items-center gap-4 border border-purple-500/20">
                <div className="w-12 h-12 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                  <Send className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-3xl font-black text-cyan-300 font-mono-num">
                    <AnimatedNumber value={userHackathons.length} />
                  </div>
                  <span className="text-xs text-slate-400 font-medium">My Submissions</span>
                </div>
              </div>

              {/* Card 3: My Teams */}
              <div className="glass-card glass-card-hover p-5 rounded-2xl flex items-center gap-4 border border-purple-500/20">
                <div className="w-12 h-12 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-3xl font-black text-rose-300 font-mono-num">
                    <AnimatedNumber value={2} />
                  </div>
                  <span className="text-xs text-slate-400 font-medium">My Teams</span>
                </div>
              </div>

              {/* Card 4: Achievements */}
              <div className="glass-card glass-card-hover p-5 rounded-2xl flex items-center gap-4 border border-purple-500/20">
                <div className="w-12 h-12 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-3xl font-black text-amber-300 font-mono-num">
                    <AnimatedNumber value={5} />
                  </div>
                  <span className="text-xs text-slate-400 font-medium">Achievements</span>
                </div>
              </div>

            </div>

            {/* BOTTOM ROW (2 Columns) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Left Column: Upcoming Deadlines */}
              <div className="glass-card rounded-2xl p-6 border border-purple-500/20 space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Upcoming Deadlines</h3>

                  {savedHackathons.length > 0 ? (
                    <div className="space-y-3">
                      {savedHackathons.slice(0, 3).map((item) => {
                        const deadline = new Date(item.registration_deadline || item.start_date);
                        const daysLeft = Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        let colorClass = 'text-cyan-400';
                        if (daysLeft <= 5) colorClass = 'text-rose-400';
                        else if (daysLeft <= 14) colorClass = 'text-amber-400';

                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-4 py-3 border-b border-purple-900/20 last:border-none"
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                {item.title[0]}
                              </div>
                              <div className="overflow-hidden">
                                <h4 className="text-xs sm:text-sm font-bold text-white truncate">{item.title}</h4>
                                <p className={`text-xs font-semibold ${colorClass}`}>
                                  {daysLeft <= 0 ? 'Deadline Today' : `Submission in ${daysLeft} days`}
                                </p>
                              </div>
                            </div>

                            <Link
                              href={`/hackathons/${item.id}`}
                              className="p-2 rounded-full bg-slate-900 hover:bg-purple-600 text-slate-300 hover:text-white transition-colors shrink-0"
                            >
                              <ArrowRight className="w-4 h-4" />
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center space-y-3 text-slate-400">
                      <Globe className="w-10 h-10 mx-auto text-purple-400 animate-float" />
                      <p className="text-xs font-semibold text-slate-300">No upcoming deadlines tracked</p>
                      <p className="text-[11px] text-slate-400">Save hackathons to track deadlines and receive reminders.</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => switchTab('saved')}
                  className="w-full py-3 rounded-xl text-xs font-bold bg-purple-900/40 hover:bg-purple-800/40 border border-purple-700/40 text-purple-300 transition-all text-center"
                >
                  View all saved deadlines →
                </button>
              </div>

              {/* Right Column: Recommended For You */}
              <div className="glass-card rounded-2xl p-6 border border-purple-500/20 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">Recommended for you</h3>
                  <Link href="/#discover" className="text-xs font-bold text-purple-400 hover:text-purple-300">
                    View all →
                  </Link>
                </div>

                <div className="space-y-3">
                  {allHackathons.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-4 py-3 border-b border-purple-900/20 last:border-none">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                          {item.tags?.includes('AI') ? '🤖' : item.tags?.includes('Web3') ? '⛓' : '☁'}
                        </div>
                        <div className="overflow-hidden">
                          <Link href={`/hackathons/${item.id}`}>
                            <h4 className="text-xs sm:text-sm font-bold text-white truncate hover:text-purple-300">
                              {item.title}
                            </h4>
                          </Link>
                          <p className="text-[11px] text-slate-400 font-mono-num">
                            {item.start_date} — {item.end_date}
                          </p>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold glass-card border border-purple-800/40 text-purple-300 shrink-0">
                        #{item.tags?.[0] || 'Tech'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: PROFILE */}
        {/* ========================================================= */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in-up">
            
            {/* LEFT PROFILE CARD */}
            <div className="glass-card rounded-3xl p-6 sm:p-8 text-center space-y-6 border border-purple-500/20 flex flex-col items-center">
              
              <div className="relative">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={userName} className="w-24 h-24 rounded-full object-cover ring-4 ring-purple-500/40 shadow-xl" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-black text-3xl flex items-center justify-center ring-4 ring-purple-500/40 shadow-xl">
                    {userName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <label className="absolute bottom-0 right-0 p-2 rounded-full bg-purple-600 text-white shadow-lg cursor-pointer hover:bg-purple-500 transition-colors">
                  <Camera className="w-4 h-4" />
                  <input type="file" className="hidden" accept="image/*" />
                </label>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white">{userName}</h3>
                <p className="text-xs text-purple-300">{user.email}</p>
                {formData.bio && <p className="text-xs text-slate-300 italic pt-2">&quot;{formData.bio}&quot;</p>}
              </div>

              {/* Completion Ring */}
              <div className="pt-2 flex flex-col items-center space-y-2">
                <CompletionRing percentage={completeness} />
                <span className="text-xs font-bold text-slate-300">Profile {completeness}% Complete</span>
              </div>

              <div className="text-[11px] text-slate-400 pt-4 border-t border-purple-900/30 w-full text-center font-mono-num">
                Member since July 2026
              </div>

            </div>

            {/* RIGHT EDIT FORM */}
            <form onSubmit={handleProfileSave} className="lg:col-span-2 glass-card rounded-3xl p-6 sm:p-8 space-y-6 border border-purple-500/20 shadow-2xl">
              
              <div className="border-b border-purple-900/30 pb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white glow-text">Edit Profile Details</h3>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="aurora-border px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{savingProfile ? 'Saving...' : 'Save Profile'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Full Name</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleProfileChange}
                    placeholder="Your full name"
                    className="w-full px-4 py-3 rounded-xl bg-[#0D1224] border border-violet-900/40 text-white text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Organization / College</label>
                  <input
                    type="text"
                    name="organization"
                    value={formData.organization}
                    onChange={handleProfileChange}
                    placeholder="e.g. Stanford University"
                    className="w-full px-4 py-3 rounded-xl bg-[#0D1224] border border-violet-900/40 text-white text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-slate-300">Bio</label>
                    <span className="text-slate-500 font-mono-num">{formData.bio.length}/200</span>
                  </div>
                  <textarea
                    name="bio"
                    rows={3}
                    maxLength={200}
                    value={formData.bio}
                    onChange={handleProfileChange}
                    placeholder="Short summary about your coding skills and interests..."
                    className="w-full px-4 py-3 rounded-xl bg-[#0D1224] border border-violet-900/40 text-white text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Phone / WhatsApp</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleProfileChange}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-3 rounded-xl bg-[#0D1224] border border-violet-900/40 text-white text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Website URL</label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleProfileChange}
                    placeholder="https://yourportfolio.com"
                    className="w-full px-4 py-3 rounded-xl bg-[#0D1224] border border-violet-900/40 text-white text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* SOCIAL LINKS SECTION */}
              <div className="pt-4 border-t border-purple-900/30 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400">Social Profiles</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-purple-400"><TwitterIcon /></div>
                    <input
                      type="text"
                      name="social_twitter"
                      value={formData.social_twitter}
                      onChange={handleProfileChange}
                      placeholder="@twitter_handle"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0D1224] border border-violet-900/40 text-white text-sm focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-purple-400"><LinkedinIcon /></div>
                    <input
                      type="text"
                      name="social_linkedin"
                      value={formData.social_linkedin}
                      onChange={handleProfileChange}
                      placeholder="linkedin.com/in/..."
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0D1224] border border-violet-900/40 text-white text-sm focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-purple-400"><InstagramIcon /></div>
                    <input
                      type="text"
                      name="social_instagram"
                      value={formData.social_instagram}
                      onChange={handleProfileChange}
                      placeholder="@instagram_handle"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0D1224] border border-violet-900/40 text-white text-sm focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="relative flex items-center">
                    <MessageSquare className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
                    <input
                      type="text"
                      name="social_discord"
                      value={formData.social_discord}
                      onChange={handleProfileChange}
                      placeholder="username#0000"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0D1224] border border-violet-900/40 text-white text-sm focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

            </form>

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: SAVED HACKATHONS */}
        {/* ========================================================= */}
        {activeTab === 'saved' && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-white glow-text">Saved Hackathons</h3>
                <p className="text-xs text-slate-400">Bookmarked events you are tracking.</p>
              </div>
              <Link href="/#discover" className="text-xs font-bold text-purple-400 hover:text-purple-300">
                Explore More →
              </Link>
            </div>

            {savedHackathons.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedHackathons.map((h) => (
                  <div key={h.id} className="glass-card p-5 rounded-2xl border border-purple-500/20 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <Link href={`/hackathons/${h.id}`}>
                          <h4 className="font-bold text-white text-base hover:text-purple-300 transition-colors">{h.title}</h4>
                        </Link>
                        <button
                          onClick={() => handleUnsave(h.id)}
                          className="text-slate-400 hover:text-rose-400 p-1"
                          title="Remove bookmark"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-purple-400 font-medium pt-1">{h.organizer || 'Host'}</p>
                    </div>

                    <div className="space-y-2 text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-purple-400" />
                        <span className="font-mono-num">{h.start_date} to {h.end_date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-purple-400" />
                        <span>{h.is_online ? 'Worldwide Online' : h.location_city || 'Campus'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-purple-900/20">
                      <div className="flex gap-1.5">
                        {h.tags?.slice(0, 2).map((t, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded text-[10px] bg-purple-950 text-purple-300 border border-purple-800/40">
                            #{t}
                          </span>
                        ))}
                      </div>

                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 animate-pulse">
                        ⚡ Closing Soon
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-16 rounded-3xl glass-card text-center space-y-4 border border-purple-500/20">
                <div className="w-16 h-16 mx-auto rounded-full bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Bookmark className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-white">No saved hackathons yet</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">Explore hackathons on the home page and bookmark your favorites to track deadlines.</p>
                <Link
                  href="/"
                  className="aurora-border px-6 py-2.5 rounded-xl text-xs font-bold text-white inline-flex items-center gap-2"
                >
                  <span>Explore Hackathons</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: MY SUBMISSIONS */}
        {/* ========================================================= */}
        {activeTab === 'submissions' && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-white glow-text">My Submissions</h3>
                <p className="text-xs text-slate-400">Published hackathons and verification statuses.</p>
              </div>
              <Link
                href="/submit"
                className="aurora-border px-4 py-2 rounded-xl text-xs font-bold text-white inline-flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Submit New Event</span>
              </Link>
            </div>

            {userHackathons.length > 0 ? (
              <div className="glass-card rounded-2xl overflow-hidden border border-purple-500/20">
                <div className="bg-purple-950/40 px-6 py-4 grid grid-cols-4 text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-purple-900/30">
                  <span className="col-span-2">Event</span>
                  <span>Status</span>
                  <span className="text-right">Actions</span>
                </div>

                {userHackathons.map((h) => {
                  const status = h.status || 'pending';
                  let statusBadgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                  let statusText = '⏳ Under Review';
                  if (status === 'approved') {
                    statusBadgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                    statusText = '✅ Approved';
                  } else if (status === 'rejected') {
                    statusBadgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
                    statusText = '❌ Rejected';
                  }

                  return (
                    <div key={h.id} className="px-6 py-4 grid grid-cols-4 items-center text-xs border-b border-purple-900/10 hover:bg-white/5 transition-colors">
                      <div className="col-span-2 space-y-0.5">
                        <h4 className="font-bold text-white text-sm">{h.title}</h4>
                        <p className="text-[11px] text-slate-400">{h.organizer || 'Host'}</p>
                      </div>

                      <div>
                        <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${statusBadgeClass}`}>
                          {statusText}
                        </span>
                      </div>

                      <div className="text-right">
                        <Link
                          href={`/hackathons/${h.id}`}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-purple-600 text-slate-300 hover:text-white border border-purple-900/40 transition-colors"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-16 rounded-3xl glass-card text-center space-y-4 border border-purple-500/20">
                <Rocket className="w-12 h-12 mx-auto text-purple-400 animate-float" />
                <h4 className="text-lg font-bold text-white">No submissions yet</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">Be the first to list your college tech fest or virtual hackathon on Findathon.</p>
                <Link href="/submit" className="aurora-border px-6 py-2.5 rounded-xl text-xs font-bold text-white inline-flex items-center gap-2">
                  <PlusCircle className="w-4 h-4" />
                  <span>Submit a Hackathon</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: ACHIEVEMENTS */}
        {/* ========================================================= */}
        {activeTab === 'achievements' && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="border-b border-purple-900/30 pb-3">
              <h3 className="text-xl font-black text-white glow-text flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-400" />
                Achievements & Badges
              </h3>
              <p className="text-xs text-slate-400">Earn badges through active participation, event bookmarking, and submissions.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[
                { name: 'Early Bird', desc: 'Save your first hackathon', earned: savedHackathons.length > 0, icon: Award, color: 'violet' },
                { name: 'Explorer', desc: 'Save 10 hackathons', earned: savedHackathons.length >= 10, icon: Compass, color: 'cyan' },
                { name: 'Pathfinder', desc: 'Save 25 hackathons', earned: savedHackathons.length >= 25, icon: MapPin, color: 'emerald' },
                { name: 'Organizer', desc: 'Submit your first hackathon', earned: userHackathons.length > 0, icon: Rocket, color: 'amber' },
                { name: 'Community Builder', desc: 'Get 5 hackathons approved', earned: false, icon: Users, color: 'rose' },
                { name: 'Veteran', desc: 'Member for 6 months', earned: true, icon: ShieldCheck, color: 'purple' },
                { name: 'Speedrunner', desc: 'Register within 24h of opening', earned: true, icon: Zap, color: 'blue' },
                { name: 'Champion', desc: 'Profile 100% complete', earned: completeness === 100, icon: Trophy, color: 'gold' }
              ].map((badge, idx) => (
                <div
                  key={idx}
                  className={`glass-card p-5 rounded-2xl text-center space-y-3 border relative overflow-hidden transition-all ${
                    badge.earned ? 'aurora-border' : 'border-purple-900/30 opacity-60 grayscale'
                  }`}
                >
                  <HexagonBadge className="w-14 h-14 mx-auto" color={badge.color} />
                  <div>
                    <h4 className="font-bold text-white text-xs">{badge.name}</h4>
                    <p className="text-[10px] text-slate-400 pt-0.5">{badge.desc}</p>
                  </div>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    badge.earned ? 'bg-emerald-950 text-emerald-300 border-emerald-500/30' : 'bg-slate-900 text-slate-500 border-slate-700'
                  }`}>
                    {badge.earned ? 'Unlocked' : 'Locked'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: NOTIFICATIONS */}
        {/* ========================================================= */}
        {activeTab === 'notifications' && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-purple-900/30 pb-3">
              <div>
                <h3 className="text-xl font-black text-white glow-text">Notifications</h3>
                <p className="text-xs text-slate-400">Updates regarding your submissions, reminders, and platform activity.</p>
              </div>
              <button
                onClick={markAllNotificationsRead}
                className="text-xs font-bold text-purple-400 hover:text-purple-300"
              >
                Mark all as read
              </button>
            </div>

            <div className="space-y-3">
              {notificationsList.map((n) => {
                const IconComp = n.icon;
                return (
                  <div key={n.id} className="glass-card p-4 rounded-2xl border border-purple-500/20 flex items-start gap-4">
                    <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${n.unread ? 'bg-purple-500' : 'bg-slate-700'}`} />
                    <div className="p-2 rounded-xl bg-[#0D1224] border border-purple-900/30 shrink-0">
                      <IconComp className={`w-4 h-4 ${n.color}`} />
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white">{n.title}</h4>
                        <span className="text-[10px] text-slate-500 font-mono-num">{n.time}</span>
                      </div>
                      <p className="text-xs text-slate-300">{n.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 7: SETTINGS */}
        {/* ========================================================= */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fade-in-up max-w-3xl">
            
            {/* ACCOUNT SETTINGS */}
            <div className="glass-card rounded-2xl p-6 border border-purple-500/20 space-y-4">
              <h3 className="text-base font-bold text-white">Account Settings</h3>
              
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">Registered Google Email</label>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0D1224] border border-purple-900/30">
                  <Mail className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-white font-medium flex-1">{user.email}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800/40">
                    via Google OAuth
                  </span>
                </div>
              </div>
            </div>

            {/* NOTIFICATION PREFERENCES */}
            <div className="glass-card rounded-2xl p-6 border border-purple-500/20 space-y-4">
              <h3 className="text-base font-bold text-white">Notification Preferences</h3>

              {[
                { key: 'emailNotifs', label: 'Email Notifications', desc: 'Receive important updates regarding submissions' },
                { key: 'deadlineReminders', label: 'Deadline Reminders', desc: 'Get alerts when bookmarked hackathons are closing' },
                { key: 'cityHackathons', label: 'Local City Hackathons', desc: 'Notifications for new on-campus events in your region' },
                { key: 'weeklyDigest', label: 'Weekly Digest', desc: 'Curated list of top prize pool hackathons every Monday' }
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-2 border-b border-purple-900/20 last:border-none">
                  <div>
                    <h4 className="text-xs font-bold text-white">{item.label}</h4>
                    <p className="text-[11px] text-slate-400">{item.desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettingsToggles(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                    className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                      settingsToggles[item.key as keyof typeof settingsToggles] ? 'bg-purple-600' : 'bg-slate-800'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      settingsToggles[item.key as keyof typeof settingsToggles] ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              ))}
            </div>

            {/* DANGER ZONE */}
            <div className="glass-card rounded-2xl p-6 border border-rose-500/30 space-y-4 bg-rose-950/10">
              <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Danger Zone
              </h3>
              <p className="text-xs text-slate-300">Permanently delete your Findathon profile and stored submission data.</p>
              
              <button
                onClick={() => setDeleteModalOpen(true)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-rose-400 bg-rose-950/40 border border-rose-500/40 hover:bg-rose-900/40 transition-colors"
              >
                Delete Account
              </button>
            </div>

          </div>
        )}

      </main>

      {/* 3. MOBILE BOTTOM NAVIGATION DOCK (md:hidden) */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md glass-card rounded-full p-2 flex items-center justify-around md:hidden shadow-2xl border border-purple-500/30">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const IconComp = item.icon;
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => switchTab(item.key)}
              className={`p-2.5 rounded-full transition-colors ${
                isActive ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
              title={item.label}
            >
              <IconComp className="w-5 h-5" />
            </button>
          );
        })}
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-card rounded-3xl p-6 border border-rose-500/40 space-y-4 text-center">
            <h3 className="text-xl font-extrabold text-rose-400">Are you sure?</h3>
            <p className="text-xs text-slate-300">This action cannot be undone. Type <span className="font-mono-num font-bold text-white">DELETE</span> below to confirm account removal.</p>

            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="Type DELETE"
              className="w-full px-4 py-3 rounded-xl bg-[#0D1224] border border-rose-500/40 text-white text-center text-sm focus:outline-none"
            />

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 py-3 rounded-xl text-xs font-bold bg-slate-900 text-slate-300 border border-purple-900/30"
              >
                Cancel
              </button>
              <button
                disabled={deleteInput !== 'DELETE'}
                onClick={() => signOut().then(() => router.push('/'))}
                className="flex-1 py-3 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl glass-card border border-purple-500/40 text-slate-100 shadow-2xl flex items-center gap-3 animate-fade-in-up">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center min-h-screen bg-[#060816] text-center">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin mx-auto mb-2" />
        <p className="text-sm font-semibold text-purple-300">Loading Account Dashboard...</p>
      </div>
    }>
      <AccountDashboard />
    </Suspense>
  );
}
