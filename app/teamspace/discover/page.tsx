/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Navbar from '@/components/Navbar';
import {
  ArrowLeft,
  Users,
  Search,
  Filter,
  Sparkles,
  Loader2,
  Trophy,
  Check
} from 'lucide-react';
import { TeammateRecommendation, TeamWithMemberCount } from '@/lib/teamspace/types';
import DeveloperCard from '@/components/teamspace/DeveloperCard';
import SkeletonCard from '@/components/teamspace/SkeletonCard';
import CreateTeamModal from '@/components/teamspace/CreateTeamModal';

const FILTER_SKILLS = [
  'TypeScript',
  'JavaScript',
  'Python',
  'Rust',
  'Go',
  'React',
  'Next.js',
  'Node.js',
  'Solidity',
  'FastAPI',
  'Docker',
  'AWS'
];

function DiscoverContent() {
  const searchParams = useSearchParams();
  const teamIdParam = searchParams.get('team_id');

  const { user } = useAuth();

  const [recommendations, setRecommendations] = useState<TeammateRecommendation[]>([]);
  const [myTeams, setMyTeams] = useState<TeamWithMemberCount[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(teamIdParam);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<string>('all');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'match_score' | 'overall_score'>('match_score');

  // Inviting state
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [invitedUserIds, setInvitedUserIds] = useState<Set<string>>(new Set());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Fetch user's teams
  useEffect(() => {
    if (!user) return;
    async function loadTeams() {
      try {
        const res = await fetch('/api/v1/teamspace/teams');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setMyTeams(json.data);
          if (!selectedTeamId && json.data.length > 0) {
            setSelectedTeamId(json.data[0].id);
          }
        }
      } catch {}
    }
    loadTeams();
  }, [user, selectedTeamId]);

  // Fetch discoverable developers
  const fetchDevelopers = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedTeamId
        ? `/api/v1/teamspace/discover?team_id=${selectedTeamId}`
        : '/api/v1/teamspace/discover';

      const res = await fetch(url);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRecommendations(json.data);

        const alreadyInvited = new Set<string>();
        json.data.forEach((r: any) => {
          if (r.has_pending_invite) {
            alreadyInvited.add(r.developer.user_id);
          }
        });
        setInvitedUserIds(alreadyInvited);
      }
    } catch {
      showToast('Error loading developers');
    } finally {
      setLoading(false);
    }
  }, [selectedTeamId]);

  useEffect(() => {
    fetchDevelopers();
  }, [fetchDevelopers]);

  // Handler: Invite developer
  const handleInvite = async (candidateUserId: string) => {
    if (myTeams.length === 0) {
      setIsCreateModalOpen(true);
      return;
    }

    const targetTeam = selectedTeamId || myTeams[0].id;
    setInvitingUserId(candidateUserId);

    try {
      const res = await fetch('/api/v1/teamspace/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: targetTeam,
          invited_user_id: candidateUserId
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Failed to send invitation');
      }

      setInvitedUserIds((prev) => new Set([...prev, candidateUserId]));
      showToast('Invitation sent!');
    } catch (err: any) {
      showToast(err.message || 'Failed to send invitation');
    } finally {
      setInvitingUserId(null);
    }
  };

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  // Filter and sort candidates
  const filteredCandidates = useMemo(() => {
    return recommendations
      .filter((item) => {
        const dev = item.developer;
        const name = (dev.full_name || '').toLowerCase();
        const q = searchQuery.toLowerCase().trim();

        // Search query filter
        if (q && !name.includes(q)) {
          const hasLang = dev.top_languages.some((l) => l.toLowerCase().includes(q));
          if (!hasLang) return false;
        }

        // Experience level filter
        if (experienceLevel !== 'all') {
          if (dev.experience_level !== experienceLevel) return false;
        }

        // Skills filter
        if (selectedSkills.length > 0) {
          const hasSelectedSkill = selectedSkills.some((s) =>
            dev.top_languages.some((l) => l.toLowerCase().includes(s.toLowerCase()))
          );
          if (!hasSelectedSkill) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'match_score') {
          return b.match_score - a.match_score;
        } else {
          return b.developer.overall_score - a.developer.overall_score;
        }
      });
  }, [recommendations, searchQuery, experienceLevel, selectedSkills, sortBy]);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 space-y-8 pb-24">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-purple-950/90 border border-purple-500/40 text-sm font-semibold text-white shadow-2xl backdrop-blur-md animate-fade-in-up flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Breadcrumb & Header */}
      <div className="space-y-4">
        <Link
          href="/teamspace"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to TeamSpace</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-500/15 pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-purple-400" />
              <span>Discover Teammates</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Browse verified developers, filter by stack and experience, and invite them to your team.
            </p>
          </div>

          {/* Team Context Selector */}
          {myTeams.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-900/80 p-2 rounded-2xl border border-slate-800 shrink-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                Matching For:
              </span>
              <select
                value={selectedTeamId || ''}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="bg-purple-950/60 border border-purple-500/30 text-xs font-bold text-purple-200 rounded-xl px-3 py-1.5 outline-none focus:border-purple-400 cursor-pointer"
              >
                {myTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.member_count}/{t.max_members})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="glass-card rounded-3xl p-5 border border-purple-500/15 bg-[#0D1224]/80 shadow-lg space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or language..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 outline-none focus:border-purple-500 transition"
            />
          </div>

          {/* Experience Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 shrink-0">Level:</span>
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none focus:border-purple-500"
            >
              <option value="all">All Experience Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 shrink-0">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none focus:border-purple-500"
            >
              <option value="match_score">Match Score (High to Low)</option>
              <option value="overall_score">Overall Developer Score</option>
            </select>
          </div>
        </div>

        {/* Skill Tags */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
          <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-purple-400" />
            <span>Technologies:</span>
          </span>
          {FILTER_SKILLS.map((skill) => {
            const isSelected = selectedSkills.includes(skill);
            return (
              <button
                key={skill}
                onClick={() => toggleSkill(skill)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {skill}
              </button>
            );
          })}
          {selectedSkills.length > 0 && (
            <button
              onClick={() => setSelectedSkills([])}
              className="text-xs text-slate-400 hover:text-white underline ml-2 cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ─── DEVELOPER CANDIDATE GRID ─── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center border border-slate-800 bg-[#0D1224]/60 space-y-3">
          <Users className="w-8 h-8 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No matching developers</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search query, clearing filters, or checking back as more builders join Findathon.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCandidates.map((rec) => (
            <DeveloperCard
              key={rec.developer.user_id}
              developer={rec}
              onInvite={() => handleInvite(rec.developer.user_id)}
              inviting={invitingUserId === rec.developer.user_id}
              invited={invitedUserIds.has(rec.developer.user_id)}
            />
          ))}
        </div>
      )}

      <CreateTeamModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newTeam) => {
          setMyTeams((prev) => [newTeam, ...prev]);
          setSelectedTeamId(newTeam.id);
          showToast('Team created!');
        }}
      />
    </main>
  );
}

export default function TeammateDiscoverPage() {
  return (
    <div className="min-h-screen bg-[#060816] text-[#F6F8FC] selection:bg-purple-500 selection:text-white">
      <Navbar />
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#060816] flex items-center justify-center text-white">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          </div>
        }
      >
        <DiscoverContent />
      </Suspense>
    </div>
  );
}
