'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Code2,
  Cpu,
  Layers,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Unlink,
  Flame,
  Star
} from 'lucide-react';
import { DeveloperProfileDTO } from '@/lib/domain/mappers/developer-profile.mapper';

interface EvidenceItem {
  id: string;
  source: string;
  evidenceType: string;
  url?: string;
  signals: {
    name?: string;
    fullName?: string;
    description?: string;
    language?: string;
    stars?: number;
    isFork?: boolean;
    topics?: string[];
    username?: string;
    totalSolved?: number;
    easySolved?: number;
    mediumSolved?: number;
    hardSolved?: number;
    ranking?: number;
    contestRating?: number;
    attendedContestsCount?: number;
    sub?: string;
    email?: string;
    email_verified?: boolean;
    picture_url?: string;
    locale?: string;
    has_linkedin_connection?: boolean;
  };
  weight: number;
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178C6',
  JavaScript: '#F7DF1E',
  Python: '#3776AB',
  Java: '#B07219',
  'C++': '#F34B7D',
  C: '#555555',
  'C#': '#178600',
  Go: '#00ADD8',
  Rust: '#DEA584',
  HTML: '#E34F26',
  CSS: '#1572B6',
  Solidity: '#AA6746',
  Shell: '#89E051',
  PHP: '#4F5D95',
  Ruby: '#701516',
  Kotlin: '#A97BFF',
  Swift: '#F05138',
  Dart: '#00B4AB'
};

const SKILL_CATEGORY_LABELS: Record<string, { label: string; icon: typeof Layers; color: string }> = {
  dsa: { label: 'Data Structures & Algorithms', icon: Code2, color: 'from-amber-500/20 to-yellow-500/20 text-amber-300 border-amber-500/30' },
  problem_solving: { label: 'Problem Solving & Math', icon: Sparkles, color: 'from-emerald-500/20 to-cyan-500/20 text-emerald-300 border-emerald-500/30' },
  frontend: { label: 'Frontend & UI', icon: Layers, color: 'from-blue-500/20 to-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  backend: { label: 'Backend & APIs', icon: Code2, color: 'from-purple-500/20 to-indigo-500/20 text-purple-300 border-purple-500/30' },
  ai_ml: { label: 'AI & Machine Learning', icon: Sparkles, color: 'from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/30' },
  devops: { label: 'DevOps & Cloud', icon: Cpu, color: 'from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/30' },
  data: { label: 'Data & Databases', icon: Flame, color: 'from-pink-500/20 to-rose-500/20 text-pink-300 border-pink-500/30' }
};

const LEETCODE_ERROR_MESSAGES: Record<string, string> = {
  LEETCODE_USER_NOT_FOUND: 'LeetCode username not found. Check spelling.',
  LEETCODE_PROFILE_PRIVATE: 'This profile is private. Make it public in LeetCode settings.',
  LEETCODE_RATE_LIMITED: 'LeetCode is rate-limiting us. Try again in 5 minutes.',
  LEETCODE_NETWORK_ERROR: 'Could not reach LeetCode. Check your internet connection.',
  LEETCODE_SYNC_COOLDOWN: 'Please wait 60 seconds before syncing again.'
};

function GithubIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function LeetCodeIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .666-1.607c.041-.049.088-.094.135-.138l3.854-4.126 5.406-5.788a1.38 1.38 0 0 0-.97-2.355Z" />
      <path d="M9.833 13.92a1.377 1.377 0 0 0 0 1.95l2.42 2.42a1.378 1.378 0 0 0 1.95-1.95l-2.42-2.42a1.377 1.377 0 0 0-1.95 0Z" />
      <path d="M12.92 7.83a1.378 1.378 0 0 0-1.95 1.95l7.08 7.08a1.378 1.378 0 0 0 1.95-1.95l-7.08-7.08Z" />
    </svg>
  );
}

function LinkedInIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  );
}

export default function DeveloperIntelligence() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [profile, setProfile] = useState<DeveloperProfileDTO | null>(null);
  const [evidenceCount, setEvidenceCount] = useState<number>(0);
  const [recentRepos, setRecentRepos] = useState<EvidenceItem[]>([]);
  const [leetCodeSummary, setLeetCodeSummary] = useState<EvidenceItem['signals'] | null>(null);
  const [linkedInSummary, setLinkedInSummary] = useState<EvidenceItem['signals'] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // GitHub State
  const [syncing, setSyncing] = useState<boolean>(false);
  const [disconnecting, setDisconnecting] = useState<boolean>(false);

  // LeetCode State
  const [leetCodeUsername, setLeetCodeUsername] = useState<string>('');
  const [isConnectingLeetCode, setIsConnectingLeetCode] = useState<boolean>(false);
  const [isSyncingLeetCode, setIsSyncingLeetCode] = useState<boolean>(false);
  const [isDisconnectingLeetCode, setIsDisconnectingLeetCode] = useState<boolean>(false);
  const [leetCodeError, setLeetCodeError] = useState<string | null>(null);

  // LinkedIn State
  const [isConnectingLinkedIn, setIsConnectingLinkedIn] = useState<boolean>(false);
  const [isDisconnectingLinkedIn, setIsDisconnectingLinkedIn] = useState<boolean>(false);
  const [linkedInError, setLinkedInError] = useState<string | null>(null);

  // Global State
  const [recomputing, setRecomputing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const refreshProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/developer-profile');
      const data = await res.json();
      if (data.success && data.data) {
        setProfile(data.data.profile);
        setEvidenceCount(data.data.evidenceCount || 0);
        const repos = (data.data.recentEvidence || []).filter((e: EvidenceItem) => e.evidenceType === 'repo');
        setRecentRepos(repos.slice(0, 5));
        const lc = (data.data.recentEvidence || []).find(
          (e: EvidenceItem) => e.source === 'leetcode' && e.evidenceType === 'activity' && e.signals?.totalSolved !== undefined
        );
        setLeetCodeSummary(lc ? lc.signals : null);
        const li = (data.data.recentEvidence || []).find(
          (e: EvidenceItem) => e.source === 'linkedin' && e.evidenceType === 'identity_profile'
        );
        setLinkedInSummary(li ? li.signals : null);
        setError(null);
      } else {
        setError(data.error?.message || 'Failed to load developer intelligence profile');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error while fetching profile');
    } finally {
      setLoading(false);
    }
  };

  // Initial load and URL query feedback from OAuth redirects
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const res = await fetch('/api/v1/developer-profile');
        const data = await res.json();
        if (!isMounted) return;
        if (data.success && data.data) {
          setProfile(data.data.profile);
          setEvidenceCount(data.data.evidenceCount || 0);
          const repos = (data.data.recentEvidence || []).filter((e: EvidenceItem) => e.evidenceType === 'repo');
          setRecentRepos(repos.slice(0, 5));
          const lc = (data.data.recentEvidence || []).find(
            (e: EvidenceItem) => e.source === 'leetcode' && e.evidenceType === 'activity' && e.signals?.totalSolved !== undefined
          );
          setLeetCodeSummary(lc ? lc.signals : null);
          const li = (data.data.recentEvidence || []).find(
            (e: EvidenceItem) => e.source === 'linkedin' && e.evidenceType === 'identity_profile'
          );
          setLinkedInSummary(li ? li.signals : null);
        } else {
          setError(data.error?.message || 'Failed to load developer intelligence profile');
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Network error while fetching profile');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    const githubStatus = searchParams?.get('github');
    const githubError = searchParams?.get('github_error');
    const linkedinStatus = searchParams?.get('linkedin');
    const linkedinError = searchParams?.get('linkedin_error');

    if (githubStatus === 'connected') {
      const timer = setTimeout(() => {
        showToast('GitHub connected & developer intelligence computed! 🎉', 'success');
        refreshProfile();
        router.replace('/account?tab=intelligence', { scroll: false });
      }, 0);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    } else if (githubError) {
      const timer = setTimeout(() => {
        const errorText = decodeURIComponent(githubError);
        setError(errorText.includes('rate') ? 'GitHub is rate-limiting us. Please try again in a few minutes.' : errorText);
        showToast(`GitHub error: ${errorText}`, 'error');
        router.replace('/account?tab=intelligence', { scroll: false });
      }, 0);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    } else if (linkedinStatus === 'connected') {
      const timer = setTimeout(() => {
        showToast('LinkedIn profile connected! 💼', 'success');
        refreshProfile();
        router.replace('/account?tab=intelligence', { scroll: false });
      }, 0);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    } else if (linkedinError) {
      const timer = setTimeout(() => {
        const errorText = decodeURIComponent(linkedinError);
        setLinkedInError(errorText);
        showToast(`LinkedIn error: ${errorText}`, 'error');
        router.replace('/account?tab=intelligence', { scroll: false });
      }, 0);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [router, searchParams]);

  // GitHub Connection Handlers
  const handleConnectGitHub = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/developer-profile/connect/github');
      const data = await res.json();
      if (data.success && data.data?.authUrl) {
        window.location.href = data.data.authUrl;
      } else {
        setError(data.error?.message || 'Could not initialize GitHub OAuth flow');
        setSyncing(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to GitHub');
      setSyncing(false);
    }
  };

  const handleDisconnectGitHub = async () => {
    if (!confirm('Are you sure you want to disconnect your GitHub account? Extracted skill signals will be removed.')) {
      return;
    }
    setDisconnecting(true);
    try {
      const res = await fetch('/api/v1/developer-profile/accounts/github', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('GitHub account disconnected.', 'success');
        refreshProfile();
      } else {
        setError(data.error?.message || 'Failed to disconnect GitHub');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect GitHub');
    } finally {
      setDisconnecting(false);
    }
  };

  // LeetCode Connection Handlers
  const handleConnectLeetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isConnectingLeetCode || !leetCodeUsername.trim()) return;

    setIsConnectingLeetCode(true);
    setLeetCodeError(null);

    try {
      const res = await fetch('/api/v1/developer-profile/connect/leetcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: leetCodeUsername.trim() })
      });
      const data = await res.json();

      if (data.success && data.data?.profile) {
        setProfile(data.data.profile);
        showToast('LeetCode profile connected & intelligence updated! 🚀', 'success');
        setLeetCodeUsername('');
        refreshProfile();
      } else {
        const code = data.error?.code;
        const msg = (code && LEETCODE_ERROR_MESSAGES[code]) || data.error?.message || 'Failed to connect LeetCode profile';
        setLeetCodeError(msg);
      }
    } catch (err) {
      setLeetCodeError(err instanceof Error ? err.message : 'Network error while connecting LeetCode');
    } finally {
      setIsConnectingLeetCode(false);
    }
  };

  const handleSyncLeetCode = async () => {
    if (isSyncingLeetCode) return;
    setIsSyncingLeetCode(true);
    setLeetCodeError(null);

    try {
      const res = await fetch('/api/v1/developer-profile/accounts/leetcode/sync', { method: 'POST' });
      const data = await res.json();

      if (data.success && data.data?.profile) {
        setProfile(data.data.profile);
        showToast('LeetCode statistics synchronized! ✨', 'success');
        refreshProfile();
      } else {
        const code = data.error?.code;
        const msg = (code && LEETCODE_ERROR_MESSAGES[code]) || data.error?.message || 'Failed to sync LeetCode profile';
        showToast(msg, 'error');
        setLeetCodeError(msg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error during sync';
      showToast(msg, 'error');
      setLeetCodeError(msg);
    } finally {
      setIsSyncingLeetCode(false);
    }
  };

  const handleDisconnectLeetCode = async () => {
    if (!confirm('Are you sure you want to disconnect your LeetCode profile? Associated DSA and problem-solving evidence will be removed.')) {
      return;
    }
    setIsDisconnectingLeetCode(true);
    try {
      const res = await fetch('/api/v1/developer-profile/accounts/leetcode', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('LeetCode profile disconnected.', 'success');
        setLeetCodeSummary(null);
        refreshProfile();
      } else {
        showToast(data.error?.message || 'Failed to disconnect LeetCode', 'error');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to disconnect LeetCode', 'error');
    } finally {
      setIsDisconnectingLeetCode(false);
    }
  };

  // LinkedIn Connection Handlers
  const handleConnectLinkedIn = async () => {
    setIsConnectingLinkedIn(true);
    setLinkedInError(null);
    try {
      const res = await fetch('/api/v1/developer-profile/connect/linkedin');
      const data = await res.json();
      if (data.success && data.data?.authUrl) {
        window.location.href = data.data.authUrl;
      } else {
        setLinkedInError(data.error?.message || 'Could not initialize LinkedIn OAuth flow');
        setIsConnectingLinkedIn(false);
      }
    } catch (err) {
      setLinkedInError(err instanceof Error ? err.message : 'Failed to connect to LinkedIn');
      setIsConnectingLinkedIn(false);
    }
  };

  const handleDisconnectLinkedIn = async () => {
    if (!confirm('Are you sure you want to disconnect your LinkedIn account? Identity evidence will be removed.')) {
      return;
    }
    setIsDisconnectingLinkedIn(true);
    try {
      const res = await fetch('/api/v1/developer-profile/accounts/linkedin', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('LinkedIn account disconnected.', 'success');
        setLinkedInSummary(null);
        refreshProfile();
      } else {
        showToast(data.error?.message || 'Failed to disconnect LinkedIn', 'error');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to disconnect LinkedIn', 'error');
    } finally {
      setIsDisconnectingLinkedIn(false);
    }
  };

  const handleRecompute = async () => {
    setRecomputing(true);
    try {
      const res = await fetch('/api/v1/developer-profile/recompute', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.data?.profile) {
        setProfile(data.data.profile);
        showToast('Developer intelligence scores recomputed! ✨', 'success');
      } else {
        setError(data.error?.message || 'Failed to recompute profile');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to recompute profile');
    } finally {
      setRecomputing(false);
    }
  };

  const topLanguagesList = Object.entries(profile?.topLanguages || {});
  const topSkillsList = Object.entries(profile?.topSkills || {});
  const interestsList = profile?.interests || [];

  const getExperienceBadge = (level: string | null) => {
    switch (level) {
      case 'advanced':
        return { label: 'Advanced', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' };
      case 'intermediate':
        return { label: 'Intermediate', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
      default:
        return { label: 'Beginner', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' };
    }
  };

  return (
    <div className="space-y-8">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl text-sm font-semibold flex items-center gap-3 shadow-2xl border backdrop-blur-xl transition-all animate-in slide-in-from-bottom-5 ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40 shadow-emerald-900/30'
              : 'bg-rose-950/90 text-rose-200 border-rose-500/40 shadow-rose-900/30'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
          {toast.text}
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-purple-900/40 bg-gradient-to-br from-[#0D1224]/90 via-[#0a0f29]/80 to-[#060816]/90 p-6 md:p-8 backdrop-blur-2xl shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 border border-purple-500/30 text-purple-300">
              <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span>Multi-Source Developer Intelligence • Deterministic Scoring</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Verified Developer Intelligence
            </h2>
            <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
              Connect your GitHub and LeetCode accounts to deterministically score your language proficiencies, DSA skills, domain competencies, and estimated experience level.
            </p>
          </div>

          {profile?.lastComputedAt && (
            <button
              onClick={handleRecompute}
              disabled={recomputing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-200 bg-purple-900/30 hover:bg-purple-800/40 border border-purple-700/30 hover:border-purple-500/50 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${recomputing ? 'animate-spin text-purple-400' : ''}`} />
              {recomputing ? 'Recomputing...' : 'Recompute Profile'}
            </button>
          )}
        </div>
      </div>

      {/* Inline Global Error Message */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-200 flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={refreshProfile}
            className="px-3 py-1 bg-rose-900/40 hover:bg-rose-800/50 border border-rose-600/40 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card rounded-3xl p-6 h-48 animate-pulse bg-slate-900/40 border border-purple-900/20" />
          <div className="glass-card rounded-3xl p-6 h-48 animate-pulse bg-slate-900/40 border border-purple-900/20" />
          <div className="glass-card rounded-3xl p-6 h-48 animate-pulse bg-slate-900/40 border border-purple-900/20" />
        </div>
      ) : (
        <>
          {/* 1. External Accounts Section */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-purple-400" />
              Connected Developer Accounts
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* GitHub Card */}
              <div className="relative group overflow-hidden rounded-2xl border border-purple-900/30 bg-[#0D1224]/60 p-5 backdrop-blur-xl transition-all hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-950/20 flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-white">
                      <GithubIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">GitHub</h4>
                      <p className="text-xs text-slate-400">Public repos & activity</p>
                    </div>
                  </div>
                  {profile?.githubConnected ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" /> Connected
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-slate-500">Not connected</span>
                  )}
                </div>

                <div>
                  {profile?.githubConnected ? (
                    <div className="flex items-center justify-between pt-2 border-t border-purple-900/20">
                      <span className="text-xs text-slate-400">
                        {recentRepos.length} repos analyzed
                      </span>
                      <button
                        onClick={handleDisconnectGitHub}
                        disabled={disconnecting}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Unlink className="w-3 h-3" />
                        {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleConnectGitHub}
                      disabled={syncing}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border border-purple-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-purple-950/40 disabled:opacity-50"
                    >
                      <GithubIcon className="w-4 h-4" />
                      {syncing ? 'Connecting...' : 'Connect GitHub'}
                    </button>
                  )}
                </div>
              </div>

              {/* LeetCode Card */}
              <div className="relative group overflow-hidden rounded-2xl border border-amber-900/30 bg-[#0D1224]/60 p-5 backdrop-blur-xl transition-all hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-950/20 flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-center justify-center text-amber-400">
                      <LeetCodeIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">LeetCode</h4>
                      <p className="text-xs text-slate-400">DSA & problem solving</p>
                    </div>
                  </div>
                  {profile?.leetcodeConnected ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      <CheckCircle2 className="w-3 h-3" /> Connected
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-slate-500">Not connected</span>
                  )}
                </div>

                {leetCodeError && (
                  <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-[11px] text-rose-200 flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <span className="leading-tight">{leetCodeError}</span>
                  </div>
                )}

                <div>
                  {profile?.leetcodeConnected ? (
                    <div className="space-y-3 pt-2 border-t border-purple-900/20">
                      {/* Solved pills */}
                      {leetCodeSummary && typeof leetCodeSummary.totalSolved === 'number' && (
                        <div className="grid grid-cols-4 gap-1.5 text-center">
                          <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
                            <div className="text-[10px] text-slate-400">Total</div>
                            <div className="text-xs font-bold text-white">{leetCodeSummary.totalSolved}</div>
                          </div>
                          <div className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40">
                            <div className="text-[10px] text-emerald-400">Easy</div>
                            <div className="text-xs font-bold text-emerald-300">{leetCodeSummary.easySolved || 0}</div>
                          </div>
                          <div className="p-1.5 rounded-lg bg-amber-950/40 border border-amber-800/40">
                            <div className="text-[10px] text-amber-400">Med</div>
                            <div className="text-xs font-bold text-amber-300">{leetCodeSummary.mediumSolved || 0}</div>
                          </div>
                          <div className="p-1.5 rounded-lg bg-rose-950/40 border border-rose-800/40">
                            <div className="text-[10px] text-rose-400">Hard</div>
                            <div className="text-xs font-bold text-rose-300">{leetCodeSummary.hardSolved || 0}</div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <button
                          onClick={handleSyncLeetCode}
                          disabled={isSyncingLeetCode}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3 h-3 ${isSyncingLeetCode ? 'animate-spin' : ''}`} />
                          {isSyncingLeetCode ? 'Syncing...' : 'Sync Now'}
                        </button>
                        <button
                          onClick={handleDisconnectLeetCode}
                          disabled={isDisconnectingLeetCode}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Unlink className="w-3 h-3" />
                          {isDisconnectingLeetCode ? 'Disconnecting...' : 'Disconnect'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleConnectLeetCode} className="space-y-2">
                      <div className="flex min-w-0 flex-col min-[420px]:flex-row md:flex-col xl:flex-row items-stretch min-[420px]:items-center md:items-stretch xl:items-center gap-2">
                        <input
                          type="text"
                          placeholder="LeetCode username"
                          value={leetCodeUsername}
                          onChange={(e) => setLeetCodeUsername(e.target.value)}
                          disabled={isConnectingLeetCode}
                          className="min-w-0 flex-1 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/80 transition-colors"
                        />
                        <button
                          type="submit"
                          disabled={isConnectingLeetCode || !leetCodeUsername.trim()}
                          className="shrink-0 py-2 px-3.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 border border-amber-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-950/40 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <LeetCodeIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>{isConnectingLeetCode ? 'Connecting...' : 'Connect'}</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              {/* LinkedIn Card */}
              <div className="relative group overflow-hidden rounded-2xl border border-blue-900/30 bg-[#0D1224]/60 p-5 backdrop-blur-xl transition-all hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-950/20 flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-950/40 border border-blue-500/40 flex items-center justify-center text-blue-400">
                      <LinkedInIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">LinkedIn</h4>
                      <p className="text-xs text-slate-400">Verified identity & profile</p>
                    </div>
                  </div>
                  {profile?.linkedinConnected ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                      <CheckCircle2 className="w-3 h-3" /> Connected
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-slate-500">Not connected</span>
                  )}
                </div>

                {linkedInError && (
                  <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-[11px] text-rose-200 flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <span className="leading-tight">{linkedInError}</span>
                  </div>
                )}

                <div>
                  {profile?.linkedinConnected ? (
                    <div className="space-y-3 pt-2 border-t border-purple-900/20">
                      {/* Identity Details Card */}
                      <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2.5">
                        {linkedInSummary?.picture_url ? (
                          <img
                            src={String(linkedInSummary.picture_url)}
                            alt="LinkedIn Avatar"
                            className="w-8 h-8 rounded-full border border-blue-400/40 object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-900/50 border border-blue-500/30 text-blue-300 font-bold text-xs flex items-center justify-center">
                            {(typeof linkedInSummary?.name === 'string' && linkedInSummary.name.charAt(0)) || 'L'}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">
                            {(typeof linkedInSummary?.name === 'string' && linkedInSummary.name) || 'Connected Member'}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {(typeof linkedInSummary?.email === 'string' && linkedInSummary.email) || 'Identity Verified (OIDC)'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end">
                        <button
                          onClick={handleDisconnectLinkedIn}
                          disabled={isDisconnectingLinkedIn}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Unlink className="w-3 h-3" />
                          {isDisconnectingLinkedIn ? 'Disconnecting...' : 'Disconnect'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleConnectLinkedIn}
                      disabled={isConnectingLinkedIn}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 border border-blue-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-950/40 disabled:opacity-50"
                    >
                      <LinkedInIcon className="w-4 h-4" />
                      {isConnectingLinkedIn ? 'Connecting...' : 'Connect LinkedIn'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* LinkedIn-only Guidance Banner */}
            {profile?.linkedinConnected && !profile?.githubConnected && !profile?.leetcodeConnected && (
              <div className="p-3.5 rounded-2xl bg-blue-950/40 border border-blue-500/30 text-xs text-blue-200 flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                <span>
                  <strong>Professional identity verified.</strong> Connect your GitHub or LeetCode account for verified technical skills and personalized hackathon recommendations.
                </span>
              </div>
            )}

            {/* Privacy Note */}
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>
                We analyze public repository languages, problem counts, and topics. We never store raw passwords or modify external accounts.
              </span>
            </p>
          </div>

          {/* 2. Intelligence Details */}
          {profile?.lastComputedAt ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Languages & Domain Skills */}
              <div className="lg:col-span-2 space-y-6">
                {/* Languages Card */}
                <div className="glass-card rounded-3xl border border-purple-900/30 p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-white flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-purple-400" />
                        Top Programming Languages
                      </h4>
                      <p className="text-xs text-slate-400">
                        Weighted proficiency across repositories and solved problems
                      </p>
                    </div>
                    {profile.experienceLevel && (
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                          getExperienceBadge(profile.experienceLevel).color
                        }`}
                      >
                        <Sparkles className="w-3 h-3" />
                        {getExperienceBadge(profile.experienceLevel).label}
                      </span>
                    )}
                  </div>

                  {topLanguagesList.length > 0 ? (
                    <div className="space-y-3.5 pt-2">
                      {topLanguagesList.map(([lang, score]) => {
                        const pct = Math.round(score * 100);
                        const color = LANGUAGE_COLORS[lang] || '#A855F7';
                        return (
                          <div key={lang} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-200 flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-sm"
                                  style={{ backgroundColor: color }}
                                />
                                {lang}
                              </span>
                              <span className="text-slate-400 font-mono font-medium">{pct}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-900/80 border border-slate-800/80 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.max(5, pct)}%`,
                                  backgroundColor: color
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 py-4 text-center">No languages identified yet.</p>
                  )}
                </div>

                {/* Domain Competencies Card */}
                <div className="glass-card rounded-3xl border border-purple-900/30 p-6 space-y-5">
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      Technical Competencies & DSA
                    </h4>
                    <p className="text-xs text-slate-400">Classified across software engineering and algorithmic domains</p>
                  </div>

                  {topSkillsList.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {topSkillsList.map(([skillKey, score]) => {
                        const meta = SKILL_CATEGORY_LABELS[skillKey] || {
                          label: skillKey.toUpperCase(),
                          icon: Layers,
                          color: 'from-purple-500/20 to-indigo-500/20 text-purple-300 border-purple-500/30'
                        };
                        const Icon = meta.icon;
                        const pct = Math.round(score * 100);

                        return (
                          <div
                            key={skillKey}
                            className={`p-3.5 rounded-2xl border bg-gradient-to-r ${meta.color} flex items-center justify-between gap-3`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-slate-900/60 flex items-center justify-center shrink-0">
                                <Icon className="w-4 h-4" />
                              </div>
                              <div>
                                <h5 className="text-xs font-bold text-white">{meta.label}</h5>
                                <p className="text-[11px] opacity-80">{pct}% match</p>
                              </div>
                            </div>
                            <div className="text-xs font-mono font-bold">{pct}%</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 py-4 text-center">No domain competencies classified yet.</p>
                  )}
                </div>
              </div>

              {/* Right Column: Interests & Verified Repos */}
              <div className="space-y-6">
                {/* Interests Tag Cloud */}
                <div className="glass-card rounded-3xl border border-purple-900/30 p-6 space-y-4">
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Topics & Interests
                  </h4>
                  <p className="text-xs text-slate-400">Extracted from repository topics and problem categories</p>

                  {interestsList.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {interestsList.map((interest) => (
                        <span
                          key={interest}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-950/40 text-purple-200 border border-purple-700/30"
                        >
                          #{interest}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 py-3">No topics found.</p>
                  )}
                </div>

                {/* Evidence Summary & Top Repos */}
                <div className="rounded-3xl border border-purple-900/30 bg-[#0D1224]/80 p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Evidence Summary</h4>
                      <p className="text-xs text-slate-400">Based on {evidenceCount} verified skill signals</p>
                    </div>
                  </div>

                  {recentRepos.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-purple-900/20">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Analyzed Repositories
                      </div>
                      {recentRepos.map((repo) => (
                        <a
                          key={repo.id}
                          href={repo.url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-xl bg-slate-950/50 hover:bg-slate-900/60 border border-slate-800/80 transition-colors flex items-center justify-between text-xs group block"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-semibold text-slate-200 group-hover:text-purple-300 transition-colors truncate block">
                              {repo.signals.name || repo.signals.fullName || 'Repository'}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {repo.signals.language || 'Code'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {repo.signals.stars !== undefined && repo.signals.stars > 0 && (
                              <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-mono">
                                <Star className="w-3 h-3 fill-amber-400" />
                                {repo.signals.stars}
                              </span>
                            )}
                            <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-slate-300" />
                          </div>
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-purple-900/20 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Last analyzed:</span>
                    <span className="font-mono text-slate-400">
                      {new Date(profile.lastComputedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="glass-card rounded-3xl border border-purple-900/30 p-10 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h4 className="text-lg font-bold text-white">No Skills Extracted Yet</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Connect your GitHub or LeetCode account above to scan your public contributions and calculate your verified skill scores and estimated experience level.
                </p>
              </div>
              <button
                onClick={handleConnectGitHub}
                disabled={syncing}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold border border-purple-500/40 shadow-lg shadow-purple-950/40 transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <GithubIcon className="w-4 h-4" />
                {syncing ? 'Connecting...' : 'Connect GitHub Now'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
