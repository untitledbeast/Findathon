'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { discoveryEngine } from '@/lib/discovery-engine';
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
  Sparkles
} from 'lucide-react';

export interface CategoryDef {
  id: string;
  name: string;
  tags: string[];
  icon: string;
  color: string;
  glowColor: string;
  bgGradient: string;
  borderColor: string;
  iconBg: string;
  fallbackCount: number;
}

export const CATEGORIES: CategoryDef[] = [
  {
    id: 'ai-ml',
    name: 'AI / ML',
    tags: ['AI', 'Machine Learning', 'ML', 'Deep Learning', 'LLM'],
    icon: 'Brain',
    color: '#8B5CF6',
    glowColor: 'rgba(139,92,246,0.3)',
    bgGradient: 'from-violet-950/80 to-violet-900/20',
    borderColor: 'rgba(139,92,246,0.3)',
    iconBg: 'rgba(139,92,246,0.15)',
    fallbackCount: 324
  },
  {
    id: 'web3',
    name: 'Web3',
    tags: ['Web3', 'Blockchain', 'Crypto', 'DeFi', 'NFT', 'Solidity'],
    icon: 'Boxes',
    color: '#EC4899',
    glowColor: 'rgba(236,72,153,0.3)',
    bgGradient: 'from-pink-950/80 to-pink-900/20',
    borderColor: 'rgba(236,72,153,0.3)',
    iconBg: 'rgba(236,72,153,0.15)',
    fallbackCount: 248
  },
  {
    id: 'cybersecurity',
    name: 'Cybersecurity',
    tags: ['Cybersecurity', 'Security', 'CTF', 'Hacking', 'Privacy'],
    icon: 'ShieldCheck',
    color: '#4CC9F0',
    glowColor: 'rgba(76,201,240,0.3)',
    bgGradient: 'from-cyan-950/80 to-cyan-900/20',
    borderColor: 'rgba(76,201,240,0.3)',
    iconBg: 'rgba(76,201,240,0.15)',
    fallbackCount: 186
  },
  {
    id: 'cloud',
    name: 'Cloud',
    tags: ['Cloud', 'DevOps', 'AWS', 'GCP', 'Azure', 'Kubernetes'],
    icon: 'Cloud',
    color: '#00E5FF',
    glowColor: 'rgba(0,229,255,0.3)',
    bgGradient: 'from-sky-950/80 to-sky-900/20',
    borderColor: 'rgba(0,229,255,0.25)',
    iconBg: 'rgba(0,229,255,0.12)',
    fallbackCount: 196
  },
  {
    id: 'robotics',
    name: 'Robotics',
    tags: ['Robotics', 'IoT', 'Hardware', 'Embedded', 'Arduino'],
    icon: 'Bot',
    color: '#00FFA3',
    glowColor: 'rgba(0,255,163,0.3)',
    bgGradient: 'from-emerald-950/80 to-emerald-900/20',
    borderColor: 'rgba(0,255,163,0.25)',
    iconBg: 'rgba(0,255,163,0.12)',
    fallbackCount: 142
  },
  {
    id: 'mobile',
    name: 'Mobile',
    tags: ['Mobile', 'React Native', 'Flutter', 'iOS', 'Android'],
    icon: 'Smartphone',
    color: '#6366F1',
    glowColor: 'rgba(99,102,241,0.3)',
    bgGradient: 'from-indigo-950/80 to-indigo-900/20',
    borderColor: 'rgba(99,102,241,0.3)',
    iconBg: 'rgba(99,102,241,0.15)',
    fallbackCount: 156
  },
  {
    id: 'blockchain',
    name: 'Blockchain',
    tags: ['Blockchain', 'Ethereum', 'Solana', 'Rust', 'Smart Contract'],
    icon: 'Link',
    color: '#F59E0B',
    glowColor: 'rgba(245,158,11,0.3)',
    bgGradient: 'from-amber-950/80 to-amber-900/20',
    borderColor: 'rgba(245,158,11,0.25)',
    iconBg: 'rgba(245,158,11,0.12)',
    fallbackCount: 214
  },
  {
    id: 'data-science',
    name: 'Data Science',
    tags: ['Data Science', 'Analytics', 'Python', 'Statistics', 'Visualization'],
    icon: 'GitFork',
    color: '#8B5CF6',
    glowColor: 'rgba(139,92,246,0.25)',
    bgGradient: 'from-violet-950/60 to-slate-900/20',
    borderColor: 'rgba(139,92,246,0.2)',
    iconBg: 'rgba(139,92,246,0.12)',
    fallbackCount: 172
  },
  {
    id: 'game-dev',
    name: 'Game Dev',
    tags: ['Game Dev', 'Unity', 'Unreal', 'Gaming', 'AR', 'VR'],
    icon: 'Gamepad2',
    color: '#EC4899',
    glowColor: 'rgba(236,72,153,0.25)',
    bgGradient: 'from-fuchsia-950/80 to-fuchsia-900/20',
    borderColor: 'rgba(236,72,153,0.25)',
    iconBg: 'rgba(236,72,153,0.12)',
    fallbackCount: 134
  },
  {
    id: 'open-source',
    name: 'Open Source',
    tags: ['Open Source', 'GitHub', 'Linux', 'Community', 'Open'],
    icon: 'Code2',
    color: '#00FFA3',
    glowColor: 'rgba(0,255,163,0.25)',
    bgGradient: 'from-teal-950/80 to-teal-900/20',
    borderColor: 'rgba(0,255,163,0.2)',
    iconBg: 'rgba(0,255,163,0.1)',
    fallbackCount: 98
  }
];

function CategoryIcon({ name, color, className = "w-8 h-8" }: { name: string; color: string; className?: string }) {
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

export default function CategoriesPage() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCategoryCounts() {
      setLoading(true);
      const countsMap: Record<string, number> = {};
      const { results: all } = await discoveryEngine.discover();

      CATEGORIES.forEach(cat => {
        const count = all.filter(h =>
          h.tags?.some((tag: string) => cat.tags.some(ct => tag.toLowerCase().includes(ct.toLowerCase())))
        ).length;
        countsMap[cat.id] = Math.max(count, cat.fallbackCount);
      });

      setCounts(countsMap);
      setLoading(false);
    }

    loadCategoryCounts();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#060816] text-[#F6F8FC] selection:bg-purple-600 selection:text-white">
      <Navbar />

      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-32 pb-16 px-4 sm:px-8">
        
        {/* TOP RIGHT DECORATIVE GLOWING ORB */}
        <div
          className="absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full blur-[80px] animate-aurora pointer-events-none z-0"
          style={{
            background: 'radial-gradient(circle, #4CC9F0 0%, #8B5CF6 40%, transparent 70%)',
            opacity: 0.15
          }}
        />

        {/* ROTATING SVG ARC RING OVERLAY */}
        <div className="absolute top-10 right-10 w-96 h-96 pointer-events-none opacity-30 z-0">
          <svg className="w-full h-full animate-rotate-slow" viewBox="0 0 200 200">
            <defs>
              <linearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4CC9F0" />
                <stop offset="50%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke="url(#arcGradient)"
              strokeWidth="1.5"
              strokeDasharray="120 180"
            />
          </svg>
        </div>

        {/* HERO CONTENT */}
        <div className="relative z-10 max-w-4xl mx-auto space-y-4 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 text-sm font-semibold tracking-widest uppercase text-purple-400">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
            <span>• EXPLORE</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-[#F6F8FC] tracking-tight leading-tight animate-fade-in-up">
            Explore by <span className="glow-text">Categories</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-lg animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Find hackathons in your favorite domains — from AI models and Web3 protocols to cloud engineering and robotics.
          </p>
        </div>

      </section>

      {/* CATEGORIES GRID */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 pb-20">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
          {CATEGORIES.map((cat, idx) => {
            const eventCount = counts[cat.id] || cat.fallbackCount;

            return (
              <Link
                key={cat.id}
                href={`/categories/${cat.id}`}
                className={`group relative p-6 flex flex-col justify-between min-h-[210px] rounded-2xl bg-gradient-to-br ${cat.bgGradient} backdrop-blur-xl border border-purple-900/30 cursor-pointer overflow-hidden transition-all duration-400 cubic-bezier(0.4, 0, 0.2, 1) hover:-translate-y-2 hover:scale-[1.02] animate-cascade`}
                style={{
                  animationDelay: `${idx * 0.08}s`,
                  borderColor: cat.borderColor
                }}
              >
                {/* INNER GLOW OVERLAY ON HOVER */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at 50% 0%, ${cat.glowColor} 0%, transparent 60%)`
                  }}
                />

                {/* TOP ICON CONTAINER */}
                <div className="relative z-10 mb-auto">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110 relative"
                    style={{
                      backgroundColor: cat.iconBg,
                      border: `1px solid ${cat.color}30`
                    }}
                  >
                    <CategoryIcon name={cat.icon} color={cat.color} className="w-8 h-8 transition-all group-hover:drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
                  </div>
                </div>

                {/* BOTTOM TEXT CONTENT */}
                <div className="relative z-10 pt-4 mt-auto">
                  <h3 className="text-base sm:text-lg font-bold text-[#F6F8FC] group-hover:text-white transition-colors">
                    {cat.name}
                  </h3>

                  {loading ? (
                    <div className="mt-1.5 w-20 h-4 rounded bg-slate-800/80 shimmer" />
                  ) : (
                    <p
                      className="text-xs sm:text-sm font-semibold font-mono-num mt-1"
                      style={{ color: cat.color, opacity: 0.9 }}
                    >
                      {eventCount} events
                    </p>
                  )}
                </div>

              </Link>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}
