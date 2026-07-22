'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { fetchHackathons, Hackathon } from '@/lib/supabase';
import { Search, X, Globe, MapPin, Sparkles, ArrowRight, Command, Trophy, Calendar } from 'lucide-react';

interface SpotlightContextType {
  isOpen: boolean;
  openSpotlight: () => void;
  closeSpotlight: () => void;
  toggleSpotlight: () => void;
}

const SpotlightContext = createContext<SpotlightContextType>({
  isOpen: false,
  openSpotlight: () => {},
  closeSpotlight: () => {},
  toggleSpotlight: () => {},
});

export function SpotlightProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openSpotlight = () => setIsOpen(true);
  const closeSpotlight = () => setIsOpen(false);
  const toggleSpotlight = () => setIsOpen(prev => !prev);

  // Global Cmd+K / Ctrl+K keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <SpotlightContext.Provider value={{ isOpen, openSpotlight, closeSpotlight, toggleSpotlight }}>
      {children}
      <SpotlightSearchModal isOpen={isOpen} onClose={closeSpotlight} />
    </SpotlightContext.Provider>
  );
}

export function useSpotlight() {
  return useContext(SpotlightContext);
}

interface SpotlightModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const POPULAR_CHIPS = ['AI/ML', 'Web3', 'Cybersecurity', 'Cloud', 'Robotics'];

export default function SpotlightSearchModal({ isOpen, onClose }: SpotlightModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [allHackathons, setAllHackathons] = useState<Hackathon[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Load hackathons list on mount
  useEffect(() => {
    fetchHackathons().then(data => setAllHackathons(data));
  }, []);

  // Auto-focus input when opened & reset search query
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filter hackathons based on search query
  const filteredResults = React.useMemo(() => {
    if (!query.trim()) return allHackathons.slice(0, 5); // Show top 5 when empty query

    const q = query.toLowerCase().trim();
    return allHackathons.filter(h => {
      const matchTitle = h.title.toLowerCase().includes(q);
      const matchCity = h.location_city?.toLowerCase().includes(q) || false;
      const matchCollege = h.location_college?.toLowerCase().includes(q) || false;
      const matchOrganizer = h.organizer?.toLowerCase().includes(q) || false;
      const matchTags = h.tags?.some(t => t.toLowerCase().includes(q)) || false;
      return matchTitle || matchCity || matchCollege || matchOrganizer || matchTags;
    }).slice(0, 6);
  }, [query, allHackathons]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredResults]);

  // Handle Keyboard Arrow & Enter navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredResults.length) % Math.max(1, filteredResults.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        router.push(`/hackathons/${filteredResults[selectedIndex].id}`);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl glass-card rounded-2xl p-5 shadow-2xl border border-purple-500/30 space-y-4 animate-cascade"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        
        {/* TOP SEARCH INPUT BAR */}
        <div className="relative flex items-center">
          <Search className="absolute left-4 w-5 h-5 text-purple-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search hackathons, technologies, prizes..."
            className="w-full pl-12 pr-20 py-3.5 rounded-xl bg-slate-950/80 border border-purple-800/50 text-slate-100 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-medium"
          />

          <div className="absolute right-3 flex items-center gap-2">
            {query ? (
              <button
                onClick={() => setQuery('')}
                className="p-1 rounded-md text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900 text-slate-400 border border-purple-900/40">
                <Command className="w-3 h-3" /> K
              </span>
            )}
          </div>
        </div>

        {/* POPULAR CATEGORY CHIPS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] shrink-0 mr-1">
            Popular:
          </span>
          {POPULAR_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => setQuery(chip)}
              className="px-3 py-1 rounded-full bg-slate-900/80 hover:bg-purple-950/80 text-purple-300 border border-purple-900/40 hover:border-purple-500/40 transition-all shrink-0 font-medium"
            >
              #{chip}
            </button>
          ))}
        </div>

        {/* RESULTS LIST */}
        <div className="space-y-1.5 pt-1 max-h-80 overflow-y-auto">
          {filteredResults.length > 0 ? (
            filteredResults.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    router.push(`/hackathons/${item.id}`);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 border ${
                    isSelected
                      ? 'bg-purple-950/70 border-purple-500/50 shadow-md translate-x-1'
                      : 'bg-slate-950/50 border-purple-900/20 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                      item.is_online
                        ? 'bg-purple-950/80 text-purple-300 border-purple-500/30'
                        : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {item.is_online ? <Globe className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                    </div>

                    <div className="overflow-hidden">
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-purple-300">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">
                        {item.is_online ? 'Worldwide Online' : `${item.location_city || 'City'} • ${item.location_college || 'Campus'}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.tags && item.tags[0] && (
                      <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-purple-900/40 text-purple-300 border border-purple-800/40">
                        #{item.tags[0]}
                      </span>
                    )}
                    <ArrowRight className={`w-4 h-4 ${isSelected ? 'text-purple-300' : 'text-slate-600'}`} />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-slate-400 space-y-2">
              <Sparkles className="w-6 h-6 mx-auto text-purple-400" />
              <p className="text-xs font-semibold">No hackathons matching &quot;{query}&quot;</p>
            </div>
          )}
        </div>

        {/* FOOTER SHORTCUT HINT */}
        <div className="pt-2 border-t border-purple-900/20 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-purple-900/40 text-slate-300 font-mono">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-purple-900/40 text-slate-300 font-mono">↓</kbd> Navigate</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-purple-900/40 text-slate-300 font-mono">↵</kbd> Select</span>
          </div>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-purple-900/40 text-slate-300 font-mono">ESC</kbd> Close</span>
        </div>

      </div>
    </div>
  );
}
