'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HackathonCard from '@/components/HackathonCard';
import { CATEGORIES, CategoryDef } from '../page';
import { useDiscovery } from '@/hooks/useDiscovery';
import { storageService } from '@/lib/storage-service';
import { Hackathon } from '@/lib/supabase';
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
  Filter
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

function CategoryDetailPageContent() {
  const params = useParams();
  const id = (params?.id as string) || 'ai-ml';

  const category: CategoryDef = useMemo(() => {
    return CATEGORIES.find(c => c.id === id) || CATEGORIES[0];
  }, [id]);

  const { results, loading, error, updateFilters } = useDiscovery({
    initialFilters: { tags: category.tags },
    autoFetch: true,
    source: 'categories'
  });

  const [savedIds, setSavedIds] = useState<string[]>(() => storageService.getSavedIds());
  const [activeTag, setActiveTag] = useState<string>('All');

  const handleToggleSave = (hId: string) => {
    const updated = storageService.toggleSavedId(hId);
    setSavedIds(updated);
  };

  const handleTagFilter = (tag: string) => {
    setActiveTag(tag);
    if (tag === 'All') {
      updateFilters(prev => ({ ...prev, tags: category.tags }));
    } else {
      updateFilters(prev => ({ ...prev, tags: [tag] }));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#060816] text-[#F6F8FC] selection:bg-purple-600 selection:text-white">
      <Navbar savedCount={savedIds.length} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 space-y-8">
        
        {/* BREADCRUMB */}
        <Link
          href="/categories"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-purple-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to All Categories
        </Link>

        {/* HERO BANNER */}
        <div className="glass-card rounded-3xl p-8 border border-purple-500/30 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 z-10">
            <div className="flex items-center gap-3">
              <CategoryIcon name={category.icon} color={category.color} className="w-10 h-10" />
              <h1 className="text-3xl sm:text-4xl font-black text-white">{category.name} Hackathons</h1>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl">Explore premier {category.name} hackathons and builder events worldwide.</p>

            <div className="flex items-center gap-4 text-xs font-mono font-bold pt-2">
              <span className="text-purple-400">{results.length} Active Events</span>
              <span className="text-slate-500">•</span>
              <span className="text-emerald-400">Verified Organizers</span>
            </div>
          </div>
        </div>

        {/* SUB-TAGS FILTER ROW */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-purple-900/30">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-purple-400" /> Sub-Tags:
          </span>

          <button
            onClick={() => handleTagFilter('All')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
              activeTag === 'All'
                ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                : 'glass-card text-slate-300 border-purple-900/30 hover:text-white'
            }`}
          >
            All Sub-Tags
          </button>

          {category.tags.map(tag => (
            <button
              key={tag}
              onClick={() => handleTagFilter(tag)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                activeTag === tag
                  ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                  : 'glass-card text-slate-300 border-purple-900/30 hover:text-white'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>

        {/* RESULTS GRID */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-80 rounded-2xl bg-slate-950/60 border border-purple-900/20 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="py-16 text-center text-rose-400 font-bold text-sm">
            {error}
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((h) => (
              <HackathonCard
                key={h.id}
                hackathon={h as unknown as Hackathon}
                isSaved={savedIds.includes(h.id)}
                onToggleSave={handleToggleSave}
              />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <p>No hackathons found in this category.</p>
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}

export default function CategoryDetailPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-[#060816]" />}>
      <CategoryDetailPageContent />
    </React.Suspense>
  );
}
