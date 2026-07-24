'use client';

import React from 'react';
import Link from 'next/link';
import { RelatedHackathonDTO } from '@/lib/domain/dtos/hackathon.dto';
import { Sparkles } from 'lucide-react';

interface RelatedSectionProps {
  related: RelatedHackathonDTO[];
}

export function RelatedSection({ related }: RelatedSectionProps) {
  if (!related || related.length === 0) return null;

  return (
    <section className="space-y-4 pt-4">
      <h3 className="text-xl font-bold text-white flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-purple-400" /> You Might Also Like
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {related.map(r => (
          <Link
            key={r.id}
            href={`/hackathons/${r.id}`}
            className="glass-card rounded-2xl p-4 border border-purple-900/30 hover:border-purple-400 transition-all flex items-center gap-4 group"
          >
            <img
              src={r.coverImageUrl || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=300&q=80'}
              alt={r.title}
              className="w-16 h-16 rounded-xl object-cover"
            />
            <div className="space-y-1 flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                {r.relationType?.replace('_', ' ') || 'Similar Event'}
              </span>
              <h4 className="text-sm font-bold text-white truncate group-hover:text-purple-300">
                {r.title}
              </h4>
              <p className="text-xs text-slate-400 font-mono">
                {r.prizePool || 'Prize Event'}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
