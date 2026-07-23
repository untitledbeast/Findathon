'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { discoveryEngine } from '@/lib/discovery-engine';
import { HackathonDTO } from '@/lib/dto';
import { Search, X, MapPin, Sparkles, ArrowRight, Command } from 'lucide-react';

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
  const [allHackathons, setAllHackathons] = useState<HackathonDTO[]>([]);
  const [rawSelectedIndex, setSelectedIndex] = useState(0);

  // Load hackathons list on mount via Discovery Engine
  useEffect(() => {
    discoveryEngine.discover().then(data => setAllHackathons(data));
  }, []);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filter hackathons based on search query
  const filteredResults = React.useMemo(() => {
    if (!query.trim()) return allHackathons.slice(0, 5);

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

  // Safely clamp selected index without effect setState calls
  const selectedIndex = Math.min(rawSelectedIndex, Math.max(0, filteredResults.length - 1));

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setSelectedIndex(0);
  };

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
            onChange={handleQueryChange}
            placeholder="Search hackathons, technologies, prizes..."
            className="w-full pl-12 pr-20 py-3.5 rounded-xl bg-slate-950/80 border border-purple-800/50 text-slate-100 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-medium"
          />

          <div className="absolute right-3 flex items-center gap-2">
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setSelectedIndex(0);
                }}
                className="p-1 rounded-md text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <span className="hidden sm:inline-flex items-center gap-0.5 px-2 py-1 rounded text-[10px] font-bold bg-slate-900 text-slate-400 border border-purple-900/40">
              ESC
            </span>
          </div>
        </div>

        {/* POPULAR SEARCH QUICK CHIPS */}
        {!query && (
          <div className="space-y-2 pt-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Popular Searches
            </div>
            <div className="flex flex-wrap gap-2">
              {POPULAR_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => {
                    setQuery(chip);
                    setSelectedIndex(0);
                  }}
                  className="px-3 py-1 rounded-lg text-xs font-semibold glass-card text-slate-300 hover:text-white hover:border-purple-500/50 border border-purple-900/30 transition-all"
                >
                  #{chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SEARCH RESULTS LIST */}
        <div className="space-y-2 max-h-80 overflow-y-auto pt-2 scrollbar-none">
          {filteredResults.length > 0 ? (
            filteredResults.map((hackathon, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={hackathon.id}
                  onClick={() => {
                    router.push(`/hackathons/${hackathon.id}`);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3.5 rounded-xl transition-all cursor-pointer border flex items-center justify-between gap-4 ${
                    isSelected
                      ? 'bg-purple-900/40 border-purple-500/60 text-white shadow-lg translate-x-1'
                      : 'bg-slate-950/40 border-purple-900/20 text-slate-300 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="space-y-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-purple-400 truncate">{hackathon.organizer}</span>
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-semibold border ${
                        hackathon.is_online
                          ? 'bg-purple-950/80 text-purple-300 border-purple-500/40'
                          : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                      }`}>
                        {hackathon.is_online ? 'Online' : 'In-Person'}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-100 truncate">{hackathon.title}</h4>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-purple-400" />
                        {hackathon.is_online ? 'Worldwide' : hackathon.location_city || 'In-Person'}
                      </span>
                      {hackathon.prize_pool && (
                        <span className="text-amber-300 font-semibold">{hackathon.prize_pool}</span>
                      )}
                    </div>
                  </div>

                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform ${
                    isSelected ? 'bg-purple-600 text-white scale-110' : 'bg-slate-900 text-slate-500'
                  }`}>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center space-y-2 text-slate-400">
              <Search className="w-8 h-8 mx-auto text-purple-500/50" />
              <p className="text-sm">No hackathons match &quot;{query}&quot;</p>
            </div>
          )}
        </div>

        {/* FOOTER SHORTCUT HINT */}
        <div className="pt-2 border-t border-purple-900/20 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Command className="w-3.5 h-3.5 text-purple-400" /> Navigate with arrow keys & Enter
          </span>
          <span>Findathon Engine</span>
        </div>

      </div>
    </div>
  );
}
