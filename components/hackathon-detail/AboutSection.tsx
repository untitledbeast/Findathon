'use client';

import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

interface AboutSectionProps {
  description: string;
}

export function AboutSection({ description }: AboutSectionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="glass-card rounded-3xl p-6 sm:p-8 border border-purple-900/30 space-y-4">
      <h3 className="text-xl font-bold text-white flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-purple-400" /> About this Hackathon
      </h3>

      <div className={`text-sm sm:text-base text-slate-300 leading-relaxed space-y-4 ${!expanded && description.length > 400 ? 'line-clamp-6' : ''}`}>
        {description.split('\n').map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>

      {description.length > 400 && (
        <button
          onClick={() => setExpanded(prev => !prev)}
          className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
        >
          {expanded ? <>Show Less <ChevronUp className="w-4 h-4" /></> : <>Read Full Description <ChevronDown className="w-4 h-4" /></>}
        </button>
      )}
    </section>
  );
}
