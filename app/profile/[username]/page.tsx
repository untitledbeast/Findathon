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
import { Trophy, ShieldCheck, MapPin, Globe, ExternalLink, Award, Check } from 'lucide-react';

function HexagonBadge({ title, xp, earned, icon }: { title: string; xp: number; earned: boolean; icon: string }) {
  return (
    <div className={`p-4 rounded-2xl border text-center space-y-2 relative transition-all ${
      earned
        ? 'glass-card border-purple-500/40 shadow-lg shadow-purple-900/20'
        : 'glass-card border-purple-900/20 opacity-40 grayscale'
    }`}>
      <div className="text-3xl">{icon}</div>
      <div>
        <h4 className="text-xs font-bold text-white">{title}</h4>
        <span className="text-[10px] font-mono text-purple-300">+{xp} XP</span>
      </div>
      {earned && (
        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
          ✓
        </div>
      )}
    </div>
  );
}

export default function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { user } = useAuth();

  const [profileData, setProfileData] = useState<ProfileDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    let isActive = true;
    async function loadProfile() {
      try {
        const data = await profileApi.getProfile();
        if (isActive) setProfileData(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (isActive) setLoading(false);
      }
    }
    loadProfile();
    return () => { isActive = false; };
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060816] text-[#F6F8FC] flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-4xl mx-auto w-full p-6 animate-pulse space-y-6">
          <div className="w-full h-64 bg-slate-900/80 rounded-3xl shimmer" />
        </main>
        <Footer />
      </div>
    );
  }

  const xp = profileData?.xpPoints || 150;
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;

  const achievements = [
    { title: 'Early Bird', xp: 25, earned: true, icon: '🐦' },
    { title: 'Explorer', xp: 50, earned: true, icon: '🧭' },
    { title: 'Pathfinder', xp: 100, earned: true, icon: '🗺' },
    { title: 'Organizer', xp: 100, earned: false, icon: '📋' },
    { title: 'Builder', xp: 250, earned: true, icon: '🏗' },
    { title: 'Champion', xp: 75, earned: false, icon: '👑' },
    { title: 'Speedrunner', xp: 50, earned: false, icon: '⚡' },
    { title: 'Veteran', xp: 100, earned: false, icon: '🎖' },
  ];

  return (
    <div className="min-h-screen bg-[#060816] text-[#F6F8FC] flex flex-col selection:bg-purple-600 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-24 space-y-8">
        {/* HERO HEADER */}
        <div className="glass-card p-8 rounded-3xl border border-purple-500/30 space-y-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-24 h-24 rounded-full border-4 border-purple-500/50 bg-slate-900 overflow-hidden relative shrink-0">
              <Image
                src={profileData?.avatarUrl || '/images/default-avatar.png'}
                alt={profileData?.fullName || username}
                fill
                className="object-cover"
              />
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl font-black text-white">{profileData?.fullName || username}</h1>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-950 text-purple-300 border border-purple-500/30">
                  Level {level} Builder
                </span>
              </div>

              <p className="text-xs font-mono text-purple-400">@{username}</p>
              <p className="text-xs text-slate-300 max-w-md">{profileData?.bio || 'Passionate developer building innovative hackathon projects.'}</p>

              <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-400 font-semibold">
                {profileData?.organization && <span>📍 {profileData.organization}</span>}
                <span className="font-mono text-amber-300 font-bold">{xp} XP</span>
              </div>
            </div>

            <div>
              <button
                onClick={() => setIsFollowing(prev => !prev)}
                className={`py-2.5 px-6 rounded-xl border text-xs font-bold transition-all ${
                  isFollowing ? 'bg-purple-600 text-white border-purple-400' : 'glass-card border-purple-900/30 text-slate-300 hover:text-white'
                }`}
              >
                {isFollowing ? '✓ Following' : '+ Follow'}
              </button>
            </div>
          </div>

          {/* SKILLS CHIPS */}
          <div className="pt-4 border-t border-purple-900/30 flex flex-wrap gap-2">
            {(profileData?.skills || ['React', 'Next.js', 'TypeScript', 'Node.js']).map(s => (
              <span key={s} className="px-3 py-1 rounded-lg text-xs font-bold glass-card border border-purple-900/30 text-slate-300">
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* ACHIEVEMENTS GRID */}
        <div className="space-y-4">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" /> Earned Achievements
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {achievements.map((a, i) => (
              <HexagonBadge key={i} title={a.title} xp={a.xp} earned={a.earned} icon={a.icon} />
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
