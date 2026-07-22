'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HackathonCard from '@/components/HackathonCard';
import { CATEGORIES, CategoryDef } from '../page';
import { fetchHackathons, Hackathon } from '@/lib/supabase';
import {
  Brain,
  Boxes,
  ShieldCheck,
  Cloud,
  Bot,
  Smartphone,
  Link as LinkIcon,
  GitFork,
  Gamepad2,
  Code2,
  Sparkles,
  ArrowLeft,
  Filter,
  PlusCircle
} from 'lucide-react';

function CategoryIcon({ name, color, className = "w-10 h-10" }: { name: string; color: string; className?: string }) {
  const props = { className, style: { color } };
  switch (name) {
    case 'Brain': return <Brain {...props} />;
    case 'Boxes': return <Boxes {...props} />;
    case 'ShieldCheck': return <ShieldCheck {...props} />;
    case 'Cloud': return <Cloud {...props} />;
    case 'Bot': return <Bot {...props} />;
    case 'Smartphone': return <Smartphone {...props} />;
    case 'Link': return <LinkIcon {...props} />;
    case 'GitFork': return <GitFork {...props} />;
    case 'Gamepad2': return <Gamepad2 {...props} />;
    case 'Code2': return <Code2 {...props} />;
    default: return <Sparkles {...props} />;
  }
}

export default function CategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || 'ai-ml';

  const category: CategoryDef = useMemo(() => {
    return CATEGORIES.find(c => c.id === id) || CATEGORIES[0];
  }, [id]);

  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'Latest' | 'Earliest' | 'Prize Pool' | 'Deadline'>('Latest');
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    async function loadCategoryHackathons() {
      setLoading(true);
      const all = await fetchHackathons();

      // Filter by category tags
      const filtered = all.filter(h => {
        return h.tags?.some(tag =>
          category.tags.some(ct => tag.toLowerCase().includes(ct.toLowerCase()))
        );
      });

      // If database contains fewer than 2 results, combine with all data for a rich demonstration
      if (filtered.length === 0) {
        setHackathons(all);
      } else {
        setHackathons(filtered);
      }

      setLoading(false);
    }

    loadCategoryHackathons();

    try {
      const stored = localStorage.getItem('findathon_saved_ids');
      if (stored) setSavedIds(JSON.parse(stored));
    } catch (e) {
      console.error(e);
    }
  }, [category]);

  const handleToggleSave = (hId: string) => {
    setSavedIds(prev => {
      const next = prev.includes(hId) ? prev.filter(item => item !== hId) : [...prev, hId];
      try {
        localStorage.setItem('findathon_saved_ids', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  // Filter & Sort Logic
  const displayHackathons = useMemo(() => {
    let result = [...hackathons];

    if (activeTag !== 'All') {
      result = result.filter(h =>
        h.tags?.some(t => t.toLowerCase().includes(activeTag.toLowerCase()))
      );
    }

    if (sortBy === 'Latest') {
      result.sort((a, b) => new Date(b.created_at || b.start_date).getTime() - new Date(a.created_at || a.start_date).getTime());
    } else if (sortBy === 'Earliest') {
      result.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    } else if (sortBy === 'Deadline') {
      result.sort((a, b) => new Date(a.registration_deadline || a.start_date).getTime() - new Date(b.registration_deadline || b.start_date).getTime());
    } else if (sortBy === 'Prize Pool') {
      result.sort((a, b) => (b.prize_pool ? 1 : -1));
    }

    return result;
  }, [hackathons, activeTag, sortBy]);

  return (
    <div className="min-h-screen flex flex-col bg-[#060816] text-[#F6F8FC] selection:bg-purple-600 selection:text-white">
      <Navbar />

      {/* HEADER SECTION */}
      <header className="relative overflow-hidden pt-28 pb-12 px-4 sm:px-8 border-b border-purple-900/30">
        {/* TOP RIGHT GLOW ORB */}
        <div
          className="absolute -top-24 -right-24 w-[450px] h-[450px] rounded-full blur-[80px] animate-aurora pointer-events-none z-0"
          style={{
            background: `radial-gradient(circle, ${category.color} 0%, #8B5CF6 40%, transparent 70%)`,
            opacity: 0.18
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto space-y-6">
          
          {/* Back link */}
          <div>
            <Link
              href="/categories"
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Categories
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center shrink-0 border shadow-2xl"
              style={{
                backgroundColor: category.iconBg,
                borderColor: `${category.color}50`
              }}
            >
              <CategoryIcon name={category.icon} color={category.color} className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                {category.name} <span className="glow-text">Hackathons</span>
              </h1>
              <p className="text-sm font-bold font-mono-num" style={{ color: category.color }}>
                {displayHackathons.length} hackathons available in this domain
              </p>
            </div>
          </div>

          {/* TAG FILTER CHIPS */}
          <div className="flex items-center gap-2 overflow-x-auto pt-2 pb-1 scrollbar-none">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
              Filter Tag:
            </span>
            {['All', ...category.tags].map((t) => {
              const isSelected = activeTag === t;
              return (
                <button
                  key={t}
                  onClick={() => setActiveTag(t)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 border ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                      : 'glass-card text-slate-300 border-purple-900/30 hover:border-purple-500/40'
                  }`}
                >
                  #{t}
                </button>
              );
            })}
          </div>

        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-10 space-y-6">
        
        {/* SORT BAR */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-card p-4 rounded-2xl border border-purple-900/30">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Filter className="w-4 h-4 text-purple-400" />
            <span>Sort by:</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            {(['Latest', 'Earliest', 'Prize Pool', 'Deadline'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  sortBy === s
                    ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                    : 'bg-slate-950/60 text-slate-400 border-purple-900/30 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* HACKATHON GRID */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-96 rounded-2xl glass-card animate-pulse border border-purple-900/20" />
            ))}
          </div>
        ) : displayHackathons.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayHackathons.map((hackathon) => (
              <HackathonCard
                key={hackathon.id}
                hackathon={hackathon}
                isSaved={savedIds.includes(hackathon.id)}
                onToggleSave={handleToggleSave}
              />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center space-y-4 glass-card rounded-3xl border border-purple-900/20">
            {/* FLOATING ASTRONAUT SVG */}
            <div className="w-20 h-20 mx-auto text-purple-400 animate-float">
              <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
                <circle cx="50" cy="50" r="40" stroke="#8B5CF6" strokeWidth="2" strokeDasharray="6 6" />
                <circle cx="50" cy="40" r="18" fill="#0D1224" stroke="#4CC9F0" strokeWidth="3" />
                <path d="M30 75 Q 50 60, 70 75" stroke="#8B5CF6" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white">No {category.name} hackathons matching criteria</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">Be the first developer to organize and list a hackathon in this category.</p>
            <Link
              href="/submit"
              className="aurora-border px-6 py-3 rounded-xl text-xs font-bold text-white inline-flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Submit a Hackathon</span>
            </Link>
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}
