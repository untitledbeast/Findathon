'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/lib/auth-context';
import { useAuthModal } from '@/components/AuthModal';
import { updateProfile, getUserHackathons, Hackathon } from '@/lib/supabase';
import {
  User as UserIcon,
  FileCode2,
  Building2,
  Phone,
  Globe,
  CheckCircle2,
  Sparkles,
  PlusCircle,
  Calendar,
  MapPin,
  ExternalLink,
  Loader2,
  Save,
  MessageSquare,
  Trophy,
  Award,
  Compass,
  Rocket,
  ShieldCheck,
  Zap
} from 'lucide-react';

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

// SVG Circle Completion Ring Component
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

function AccountDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const { openAuthModal } = useAuthModal();

  const initialTab = searchParams.get('tab') === 'submissions' ? 'submissions' : 'profile';
  const [activeTab, setActiveTab] = useState<'profile' | 'submissions'>(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'submissions') {
      setActiveTab('submissions');
    } else {
      setActiveTab('profile');
    }
  }, [searchParams]);

  // Profile Form State
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    organization: '',
    phone: '',
    website: '',
    social_twitter: '',
    social_linkedin: '',
    social_instagram: '',
    social_discord: ''
  });

  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Submissions State
  const [userHackathons, setUserHackathons] = useState<Hackathon[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  // Sync profile data when loaded
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
        social_discord: profile.social_discord || ''
      });
    }
  }, [profile]);

  // Load user submissions
  useEffect(() => {
    if (user?.id) {
      setSubmissionsLoading(true);
      getUserHackathons(user.id)
        .then(data => setUserHackathons(data))
        .finally(() => setSubmissionsLoading(false));
    }
  }, [user?.id]);

  // Toast Auto-Dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Profile completeness calculation
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

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setSaving(true);
    const res = await updateProfile(user.id, formData);
    setSaving(false);

    if (res.success) {
      await refreshProfile();
      setToastMessage('Profile updated successfully!');
    } else {
      setToastMessage(`Error: ${res.error || 'Failed to save profile'}`);
    }
  };

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
          <p className="text-sm font-semibold text-purple-300">Loading your account dashboard...</p>
        </div>
      </div>
    );
  }

  // Protected route guard
  if (!user) {
    return (
      <div className="flex-1 max-w-xl w-full mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-3xl glass-card border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-xl">
          <UserIcon className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white glow-text">Sign In Required</h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          Please sign in to access your profile settings, view submitted hackathons, and manage your account.
        </p>
        <button
          onClick={openAuthModal}
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold bg-white text-slate-900 hover:bg-slate-100 shadow-xl transition-all"
        >
          <span>Sign In with Google</span>
        </button>
      </div>
    );
  }

  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture;

  return (
    <div className="space-y-8 animate-fade-in-up">
      
      {/* FLOATING DASHBOARD GRID HEADER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Profile Card (2 cols) */}
        <div className="md:col-span-2 glass-card rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
          
          <div className="flex items-center gap-5 z-10">
            {/* Avatar */}
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile avatar"
                className="w-20 h-20 rounded-2xl object-cover ring-2 ring-purple-500/50 shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg">
                {formData.full_name ? formData.full_name.slice(0, 2).toUpperCase() : 'U'}
              </div>
            )}

            <div className="space-y-1 text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight glow-text">
                {formData.full_name || user.email?.split('@')[0]}
              </h1>
              <p className="text-xs text-purple-300 font-medium">{user.email}</p>
              {formData.organization && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-950/80 text-purple-300 border border-purple-800/40">
                  <Building2 className="w-3.5 h-3.5 text-purple-400" />
                  {formData.organization}
                </span>
              )}
            </div>
          </div>

          {/* SVG Completion Ring */}
          <div className="z-10 shrink-0">
            <CompletionRing percentage={completeness} />
          </div>

        </div>

        {/* Quick Stats Panel (1 col) */}
        <div className="glass-card rounded-3xl p-6 flex flex-col justify-between space-y-4 border border-purple-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Metrics</span>
            <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-2xl bg-[#0D1224] border border-purple-900/30">
              <span className="text-xs text-slate-400 block">Submissions</span>
              <span className="text-2xl font-black text-white font-mono-num">{userHackathons.length}</span>
            </div>
            <div className="p-3 rounded-2xl bg-[#0D1224] border border-purple-900/30">
              <span className="text-xs text-slate-400 block">Status</span>
              <span className="text-2xl font-black text-emerald-400 font-mono-num">Active</span>
            </div>
          </div>
        </div>

      </div>

      {/* ACHIEVEMENT BADGES SECTION */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-4 border border-purple-500/20">
        <div className="flex items-center justify-between border-b border-purple-900/30 pb-3">
          <div>
            <h3 className="text-lg font-black text-white glow-text flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              Achievement Badges
            </h3>
            <p className="text-xs text-slate-400">Badges earned through platform activity and event submissions.</p>
          </div>
          <span className="text-xs font-bold text-purple-400 font-mono-num">
            {userHackathons.length > 0 ? '4 / 4 Unlocked' : '3 / 4 Unlocked'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Badge 1: Early Bird */}
          <div className="p-4 rounded-2xl bg-[#0D1224] aurora-border space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Award className="w-5 h-5" />
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                Unlocked
              </span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Early Bird</h4>
              <p className="text-[11px] text-slate-400">Pioneer member of Findathon</p>
            </div>
          </div>

          {/* Badge 2: Explorer */}
          <div className="p-4 rounded-2xl bg-[#0D1224] aurora-border space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <Compass className="w-5 h-5" />
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                Unlocked
              </span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Explorer</h4>
              <p className="text-[11px] text-slate-400">Discovered global hackathons</p>
            </div>
          </div>

          {/* Badge 3: Participant */}
          <div className="p-4 rounded-2xl bg-[#0D1224] aurora-border space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Zap className="w-5 h-5" />
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                Unlocked
              </span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Participant</h4>
              <p className="text-[11px] text-slate-400">Active builder & hacker</p>
            </div>
          </div>

          {/* Badge 4: Top Organizer */}
          <div className={`p-4 rounded-2xl bg-[#0D1224] space-y-2 relative overflow-hidden border ${
            userHackathons.length > 0 ? 'aurora-border' : 'border-purple-900/30 opacity-70'
          }`}>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Rocket className="w-5 h-5" />
              </div>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                userHackathons.length > 0
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}>
                {userHackathons.length > 0 ? 'Unlocked' : 'Locked'}
              </span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Top Organizer</h4>
              <p className="text-[11px] text-slate-400">Published a hackathon event</p>
            </div>
          </div>

        </div>
      </div>

      {/* DASHBOARD TAB CONTROLS */}
      <div className="flex items-center gap-3 border-b border-purple-900/30 pb-4">
        <button
          onClick={() => {
            setActiveTab('profile');
            router.push('/account');
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'profile'
              ? 'aurora-border text-white shadow-lg'
              : 'glass-card text-slate-400 hover:text-white border-purple-900/30'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          <span>My Profile</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('submissions');
            router.push('/account?tab=submissions');
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'submissions'
              ? 'aurora-border text-white shadow-lg'
              : 'glass-card text-slate-400 hover:text-white border-purple-900/30'
          }`}
        >
          <FileCode2 className="w-4 h-4" />
          <span>My Submissions ({userHackathons.length})</span>
        </button>
      </div>

      {/* TAB 1: MY PROFILE FORM */}
      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSave} className="glass-card rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl border border-purple-500/20">
          
          <div className="border-b border-purple-900/30 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white glow-text">Personal & Account Information</h3>
              <p className="text-xs text-slate-400">Manage your profile details and contact links.</p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="aurora-border px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Profile</span>
            </button>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Full Name
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleProfileChange}
                placeholder="Your full name"
                className="w-full px-4 py-3 rounded-xl bg-[#0D1224] border border-violet-900/40 text-[#F6F8FC] text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
              />
            </div>

            {/* Organization */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Organization / College Name
              </label>
              <input
                type="text"
                name="organization"
                value={formData.organization}
                onChange={handleProfileChange}
                placeholder="e.g. Stanford University or Acme Inc"
                className="w-full px-4 py-3 rounded-xl bg-[#0D1224] border border-violet-900/40 text-[#F6F8FC] text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
              />
            </div>

            {/* Bio */}
            <div className="sm:col-span-2 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-300">Bio</label>
                <span className="text-slate-500 font-mono-num">{formData.bio.length}/200</span>
              </div>
              <textarea
                name="bio"
                maxLength={200}
                rows={3}
                value={formData.bio}
                onChange={handleProfileChange}
                placeholder="Tell us briefly about your background and interests..."
                className="w-full px-4 py-3 rounded-xl bg-[#0D1224] border border-violet-900/40 text-[#F6F8FC] text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Phone / WhatsApp Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleProfileChange}
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0D1224] border border-violet-900/40 text-[#F6F8FC] text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                />
              </div>
            </div>

            {/* Website */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Website URL
              </label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleProfileChange}
                  placeholder="https://yourportfolio.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0D1224] border border-violet-900/40 text-[#F6F8FC] text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                />
              </div>
            </div>

          </div>

          {/* Social Handles */}
          <div className="pt-4 border-t border-purple-900/30 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400">Social Profiles</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-purple-400">
                  <TwitterIcon />
                </div>
                <input
                  type="text"
                  name="social_twitter"
                  value={formData.social_twitter}
                  onChange={handleProfileChange}
                  placeholder="Twitter/X handle"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0D1224] border border-violet-900/40 text-[#F6F8FC] text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                />
              </div>

              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-purple-400">
                  <LinkedinIcon />
                </div>
                <input
                  type="text"
                  name="social_linkedin"
                  value={formData.social_linkedin}
                  onChange={handleProfileChange}
                  placeholder="LinkedIn URL"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0D1224] border border-violet-900/40 text-[#F6F8FC] text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                />
              </div>

              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-purple-400">
                  <InstagramIcon />
                </div>
                <input
                  type="text"
                  name="social_instagram"
                  value={formData.social_instagram}
                  onChange={handleProfileChange}
                  placeholder="Instagram handle"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0D1224] border border-violet-900/40 text-[#F6F8FC] text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                />
              </div>

              <div className="relative flex items-center">
                <MessageSquare className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
                <input
                  type="text"
                  name="social_discord"
                  value={formData.social_discord}
                  onChange={handleProfileChange}
                  placeholder="Discord username or invite link"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0D1224] border border-violet-900/40 text-[#F6F8FC] text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                />
              </div>
            </div>
          </div>

        </form>
      )}

      {/* TAB 2: MY SUBMISSIONS PANEL */}
      {activeTab === 'submissions' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-white glow-text">Your Submitted Hackathons</h3>
              <p className="text-xs text-slate-400">Track verification & approval statuses of hackathons you published.</p>
            </div>

            <Link
              href="/submit"
              className="aurora-border px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md inline-flex items-center gap-2 hover:scale-105 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Submit New</span>
            </Link>
          </div>

          {submissionsLoading ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-purple-500 mb-2" />
              <p className="text-xs">Fetching your submissions...</p>
            </div>
          ) : userHackathons.length > 0 ? (
            <div className="space-y-4">
              {userHackathons.map((h) => {
                const status = h.status || 'pending';
                let statusBadgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                if (status === 'approved') statusBadgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                if (status === 'rejected') statusBadgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/30';

                return (
                  <div
                    key={h.id}
                    className="p-5 rounded-2xl glass-card border border-purple-900/30 hover:border-purple-500/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-[#060816] overflow-hidden shrink-0 border border-purple-900/30">
                        <img
                          src={h.cover_image_url || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=300&auto=format&fit=crop'}
                          alt={h.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-white text-base">{h.title}</h4>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1 font-mono-num">
                            <Calendar className="w-3.5 h-3.5 text-purple-400" />
                            {h.start_date} to {h.end_date}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-purple-400" />
                            {h.is_online ? 'Online' : h.location_city || 'In-Person'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <span className={`px-3 py-1 rounded-full text-xs uppercase font-bold tracking-wider border ${statusBadgeClass}`}>
                        {status}
                      </span>

                      <Link
                        href={`/hackathons/${h.id}`}
                        className="p-2 rounded-xl bg-[#060816] text-slate-300 hover:text-purple-300 border border-purple-900/30"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 rounded-3xl glass-card border border-purple-900/20 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <FileCode2 className="w-7 h-7" />
              </div>
              <h4 className="text-lg font-bold text-white">You haven&apos;t submitted any hackathons yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Submit your upcoming online or on-campus hackathon to reach thousands of student developers.
              </p>
              <Link
                href="/submit"
                className="aurora-border px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md inline-flex items-center gap-2 hover:scale-105 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Submit a Hackathon Now</span>
              </Link>
            </div>
          )}
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
    <div className="min-h-screen flex flex-col bg-[#060816] text-[#F6F8FC] selection:bg-purple-600 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <Suspense fallback={
          <div className="flex-1 flex items-center justify-center py-20 text-center">
            <Loader2 className="w-10 h-10 text-purple-500 animate-spin mx-auto mb-2" />
            <p className="text-sm font-semibold text-purple-300">Loading dashboard...</p>
          </div>
        }>
          <AccountDashboard />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
