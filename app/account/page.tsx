'use client';

import React, { useState, useEffect, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HackathonCard from '@/components/HackathonCard';
import { useAuth } from '@/lib/auth-context';
import { profileApi } from '@/lib/modules/profile/api/profile';
import { ProfileDTO } from '@/lib/modules/profile';
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
  Plus,
  Check,
  ShieldCheck,
  Edit3
} from 'lucide-react';

export default function AccountDashboardPage({ searchParams }: { searchParams?: Promise<{ tab?: string }> }) {
  const resolvedParams = searchParams ? use(searchParams) : { tab: 'overview' };
  const initialTab = resolvedParams?.tab || 'overview';

  const { user, profile, signOut, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [profileData, setProfileData] = useState<ProfileDTO | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit profile state
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [organization, setOrganization] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    let isActive = true;
    async function loadData() {
      try {
        const data = await profileApi.getProfile();
        if (isActive) {
          setProfileData(data);
          setFullName(data.fullName || '');
          setBio(data.bio || '');
          setOrganization(data.organization || '');
          setPhone(data.phone || '');
          setWebsite(data.website || '');
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isActive) setLoading(false);
      }
    }
    loadData();
    return () => { isActive = false; };
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await profileApi.updateProfile({
        fullName,
        bio,
        organization,
        phone,
        website
      });
      setProfileData(updated);
      await refreshProfile();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const xp = profileData?.xpPoints || 150;
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;

  const NAV_ITEMS = [
    { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'profile', label: 'My Profile', icon: UserIcon },
    { id: 'saved', label: 'Saved Hackathons', icon: Bookmark },
    { id: 'submissions', label: 'My Submissions', icon: FileText },
    { id: 'achievements', label: 'Achievements', icon: Award },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#060816] text-[#F6F8FC] flex flex-col selection:bg-purple-600 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-24 flex flex-col md:flex-row gap-8">
        {/* SIDEBAR */}
        <aside className="w-full md:w-64 glass-card p-6 rounded-3xl border border-purple-900/30 space-y-6 shrink-0 h-fit">
          {/* USER INFO HEADER */}
          <div className="flex items-center gap-3 pb-4 border-b border-purple-900/30">
            <div className="w-12 h-12 rounded-full border-2 border-purple-500 bg-slate-900 overflow-hidden relative shrink-0">
              <Image
                src={profileData?.avatarUrl || user?.user_metadata?.avatar_url || '/images/default-avatar.png'}
                alt={fullName || 'User'}
                fill
                className="object-cover"
              />
            </div>
            <div className="truncate">
              <h4 className="text-sm font-bold text-white truncate">{profileData?.fullName || user?.user_metadata?.full_name || 'User'}</h4>
              <span className="text-[10px] font-mono text-purple-400">Level {level} Builder</span>
            </div>
          </div>

          {/* NAVIGATION ITEMS */}
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full p-3 rounded-2xl text-xs font-bold flex items-center gap-3 transition-all ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="pt-4 border-t border-purple-900/30">
            <button
              onClick={() => signOut()}
              className="w-full p-3 rounded-2xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 flex items-center gap-3 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* MAIN TAB CONTENT */}
        <section className="flex-1 space-y-8">
          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="glass-card p-8 rounded-3xl border border-purple-500/30 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-black text-white">Welcome back, {profileData?.fullName || 'Developer'}! 👋</h1>
                    <p className="text-xs text-slate-400 mt-1">Ready to build something amazing today?</p>
                  </div>

                  <div className="px-4 py-2 rounded-2xl glass-card border border-purple-500/30 flex items-center gap-3 font-mono">
                    <span className="text-xs text-slate-400">Level {level}</span>
                    <span className="text-sm font-bold text-amber-300">{xp} XP</span>
                  </div>
                </div>
              </div>

              {/* STATS GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="glass-card p-5 rounded-2xl border border-purple-900/30 text-center space-y-1">
                  <div className="text-2xl font-black text-purple-400 font-mono">12</div>
                  <p className="text-xs font-bold text-slate-400">Saved Hackathons</p>
                </div>
                <div className="glass-card p-5 rounded-2xl border border-cyan-900/30 text-center space-y-1">
                  <div className="text-2xl font-black text-cyan-400 font-mono">3</div>
                  <p className="text-xs font-bold text-slate-400">Submissions</p>
                </div>
                <div className="glass-card p-5 rounded-2xl border border-emerald-900/30 text-center space-y-1">
                  <div className="text-2xl font-black text-emerald-400 font-mono">2</div>
                  <p className="text-xs font-bold text-slate-400">Approved Events</p>
                </div>
                <div className="glass-card p-5 rounded-2xl border border-amber-900/30 text-center space-y-1">
                  <div className="text-2xl font-black text-amber-400 font-mono">5</div>
                  <p className="text-xs font-bold text-slate-400">Achievements</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PROFILE */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="glass-card p-8 rounded-3xl border border-purple-900/30 space-y-6">
              <div>
                <h2 className="text-xl font-black text-white">Edit Profile</h2>
                <p className="text-xs text-slate-400 mt-1">Update your personal information & public bio.</p>
              </div>

              {saveSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4" /> Profile updated successfully!
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl glass-card bg-slate-900/60 border border-purple-900/40 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Bio</label>
                  <textarea
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl glass-card bg-slate-900/60 border border-purple-900/40 text-white text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Organization / University</label>
                    <input
                      type="text"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl glass-card bg-slate-900/60 border border-purple-900/40 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Phone Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl glass-card bg-slate-900/60 border border-purple-900/40 text-white text-sm"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="py-3.5 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 disabled:opacity-50"
              >
                {isSaving ? 'Saving Changes...' : 'Save Profile'}
              </button>
            </form>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
