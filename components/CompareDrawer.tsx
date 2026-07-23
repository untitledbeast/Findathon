'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCompareStore } from '@/lib/stores/compare-store';
import { discoveryEngine } from '@/lib/discovery-engine';
import { HackathonCard } from '@/lib/types/hackathon';
import { X, ExternalLink, Scale, Trophy, MapPin, Calendar, CheckCircle2 } from 'lucide-react';

export default function CompareDrawer() {
  const { compareIds, toggleCompare, clearCompare } = useCompareStore();
  const [hackathons, setHackathons] = useState<HackathonCard[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function loadCompared() {
      if (compareIds.length === 0) {
        setHackathons([]);
        setOpen(false);
        return;
      }
      const data = await discoveryEngine.getByIds(compareIds);
      setHackathons(data);
      setOpen(true);
    }
    loadCompared();
  }, [compareIds]);

  if (compareIds.length === 0) return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ${
      open ? 'translate-y-0' : 'translate-y-[calc(100%-3.5rem)]'
    }`}>
      {/* Floating Bar Toggle Header */}
      <div
        onClick={() => setOpen(!open)}
        className="h-14 bg-[#0D1224]/95 backdrop-blur-2xl border-t border-purple-500/40 px-6 flex items-center justify-between cursor-pointer shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-300">
            <Scale className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-white">
            Compare Hackathons ({compareIds.length}/3)
          </span>
          <span className="text-xs text-purple-400 font-mono-num hidden sm:inline">
            Click to {open ? 'collapse' : 'expand side-by-side view'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearCompare();
            }}
            className="px-3 py-1 rounded-full text-xs font-bold bg-slate-950/80 text-slate-400 hover:text-white border border-purple-900/30"
          >
            Clear All
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpen(!open);
            }}
            className="p-1 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Side-by-Side Comparison Matrix */}
      {open && (
        <div className="bg-[#060816]/95 backdrop-blur-3xl border-t border-purple-900/30 p-6 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {hackathons.map((h) => (
              <div
                key={h.id}
                className="bg-[#0D1224]/80 border border-purple-500/30 rounded-2xl p-5 space-y-4 relative flex flex-col justify-between shadow-xl"
              >
                <button
                  onClick={() => toggleCompare(h.id)}
                  className="absolute top-3 right-3 p-1 rounded-full bg-slate-950/80 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="space-y-3">
                  <img
                    src={h.cover_image_url || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=800&auto=format&fit=crop'}
                    alt={h.title}
                    className="w-full h-28 rounded-xl object-cover border border-purple-900/30"
                  />

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                      {h.organizer}
                    </span>
                    <h4 className="text-base font-bold text-white line-clamp-1">{h.title}</h4>
                  </div>

                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/60 border border-purple-900/20">
                      <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="font-mono-num font-bold text-amber-300">{h.prize_pool || 'N/A'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-purple-400 shrink-0" />
                      <span>{h.is_online ? 'Worldwide (Online)' : h.location_city || 'In-Person'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-400 shrink-0" />
                      <span>{h.start_date} — {h.end_date}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="capitalize">{h.difficulty || 'Open to All'} Level</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {h.tags?.slice(0, 4).map(t => (
                      <span key={t} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-950/80 text-purple-300 border border-purple-500/30">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-purple-900/30 flex items-center justify-between gap-2">
                  <Link
                    href={`/hackathons/${h.id}`}
                    className="flex-1 py-2 text-center rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md"
                  >
                    View Details
                  </Link>
                  <a
                    href={h.register_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-slate-950 hover:bg-purple-950 text-white border border-purple-500/40"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
