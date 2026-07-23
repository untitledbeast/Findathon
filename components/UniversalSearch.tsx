'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { discoveryEngine } from '@/lib/discovery-engine';
import { parseSearchIntent } from '@/lib/intent-parser';
import { SearchFilters, SearchSuggestion } from '@/lib/types/search';
import { HackathonCard } from '@/lib/types/hackathon';
import { getRecentSearches, addRecentSearch, clearRecentSearches } from '@/lib/recent-searches';
import { Search, X, MapPin, Sparkles, ArrowRight, Clock, Flame, Filter, Trophy, Tag, CornerDownLeft } from 'lucide-react';

interface UniversalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFilters?: (filters: SearchFilters) => void;
}

export default function UniversalSearch({ isOpen, onClose, onSelectFilters }: UniversalSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [results, setResults] = useState<HackathonCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Focus input when opened and load recent searches
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    Promise.resolve().then(() => {
      if (isMounted) {
        setRecentSearches(getRecentSearches());
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    });
    return () => { isMounted = false; };
  }, [isOpen]);

  // Debounced search suggestions and intent parsing
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setLoading(true);
        // Load suggestions
        const suggs = await discoveryEngine.getSuggestions(query);
        setSuggestions(suggs);

        // Perform natural language search
        const { response } = await discoveryEngine.searchNaturalLanguage(query, 'spotlight');
        setResults(response.results);
        setLoading(false);
      } else {
        setSuggestions([]);
        setResults([]);
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  const parsedIntent = React.useMemo(() => {
    if (query.trim().length < 3) return null;
    return parseSearchIntent(query);
  }, [query]);

  const handleSelectSearch = useCallback((targetQuery: string, filters?: Partial<SearchFilters>) => {
    addRecentSearch(targetQuery);

    if (onSelectFilters) {
      const intent = parseSearchIntent(targetQuery);
      onSelectFilters({ ...intent.filters, ...filters });
    } else {
      const params = new URLSearchParams();
      params.set('q', targetQuery);
      if (filters?.city) params.set('city', filters.city);
      if (filters?.tags) params.set('tags', filters.tags.join(','));
      router.push(`/map?${params.toString()}`);
    }
    onClose();
  }, [onClose, onSelectFilters, router]);

  // Keyboard Navigation (ArrowUp / ArrowDown / Enter / ESC)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length + results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (query.trim()) {
        handleSelectSearch(query);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-start justify-center pt-[10vh] px-4 animate-fade-in">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#0D1224]/95 border border-purple-500/40 rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.8),0_0_30px_rgba(139,92,246,0.2)] overflow-hidden flex flex-col max-h-[80vh]"
      >
        {/* INPUT HEADER ROW */}
        <div className="p-4 border-b border-purple-900/30 flex items-center gap-3 bg-slate-950/40 shrink-0">
          <Search className="w-5 h-5 text-purple-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search hackathons, cities, or type natural query e.g. 'AI in Bangalore prize > 10k'..."
            className="flex-1 bg-transparent text-white text-sm sm:text-base placeholder-slate-400 focus:outline-none"
          />

          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <kbd className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 text-slate-400 border border-purple-900/40">⌘K</kbd>
            <kbd className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 text-slate-400 border border-purple-900/40">ESC</kbd>
          </div>
        </div>

        {/* PARSED ENTITY CHIPS DISPLAY */}
        {parsedIntent && (parsedIntent.detectedEntities.tags.length > 0 || parsedIntent.detectedEntities.city || parsedIntent.detectedEntities.isOnline !== null || parsedIntent.detectedEntities.prizeMin !== null) && (
          <div className="px-4 py-2 border-b border-purple-900/30 bg-purple-950/30 flex items-center gap-2 flex-wrap shrink-0">
            <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Detected Intent:
            </span>

            {parsedIntent.detectedEntities.tags.map(t => (
              <span key={t} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-900/60 text-purple-200 border border-purple-500/30">
                🤖 #{t}
              </span>
            ))}

            {parsedIntent.detectedEntities.city && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                📍 {parsedIntent.detectedEntities.city}
              </span>
            )}

            {parsedIntent.detectedEntities.isOnline !== null && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                🌐 {parsedIntent.detectedEntities.isOnline ? 'Online' : 'In-Person'}
              </span>
            )}

            {parsedIntent.detectedEntities.prizeMin !== null && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-500/30">
                💰 ₹{parsedIntent.detectedEntities.prizeMin.toLocaleString()}+
              </span>
            )}
          </div>
        )}

        {/* SEARCH BODY AREA */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-none">
          {/* RECENT SEARCHES (When query is empty) */}
          {!query && recentSearches.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-purple-400" /> Recent Searches</span>
                <button onClick={clearRecentSearches} className="text-[10px] text-slate-500 hover:text-purple-400">Clear</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map(rs => (
                  <button
                    key={rs}
                    onClick={() => handleSelectSearch(rs)}
                    className="px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-purple-950/80 border border-purple-900/30 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
                  >
                    <span>{rs}</span>
                    <ArrowRight className="w-3 h-3 text-purple-400 opacity-60" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SUGGESTIONS LIST */}
          {suggestions.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" /> Suggestions
              </span>
              <div className="space-y-1">
                {suggestions.map((sugg, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectSearch(sugg.label, sugg.filters)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      selectedIndex === idx
                        ? 'bg-purple-900/50 border-purple-400 text-white'
                        : 'bg-slate-950/40 border-purple-900/20 text-slate-300 hover:bg-slate-900/60 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {sugg.type === 'tag' && <Tag className="w-4 h-4 text-purple-400" />}
                      {sugg.type === 'city' && <MapPin className="w-4 h-4 text-cyan-400" />}
                      {sugg.type === 'hackathon' && <Trophy className="w-4 h-4 text-amber-400" />}
                      {sugg.type === 'category' && <Filter className="w-4 h-4 text-emerald-400" />}
                      <span className="text-xs font-bold">{sugg.label}</span>
                    </div>
                    <CornerDownLeft className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LIVE SEARCH RESULTS */}
          {results.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-purple-900/30">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Hackathon Matches ({results.length})
              </span>
              <div className="space-y-2">
                {results.map((h) => (
                  <div
                    key={h.id}
                    onClick={() => {
                      addRecentSearch(h.title);
                      router.push(`/hackathons/${h.id}`);
                      onClose();
                    }}
                    className="p-3 rounded-xl bg-slate-950/60 border border-purple-900/30 hover:border-purple-500/40 hover:bg-purple-950/40 transition-all cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1 truncate">
                      <div className="flex items-center gap-2">
                        <h5 className="text-xs font-bold text-white truncate">{h.title}</h5>
                        {h.is_online && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                            Online
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        Organized by {h.organizer} • {h.location_city || 'Virtual'}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-purple-400 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RICH EMPTY STATES */}
          {query.trim().length >= 2 && !loading && results.length === 0 && suggestions.length === 0 && (
            <div className="py-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">No hackathons found matching &quot;{query}&quot;</h4>
                <p className="text-xs text-slate-400">Try searching by category, technology tag, or city name.</p>
              </div>

              <div className="pt-2 flex flex-wrap gap-2 justify-center">
                {['AI', 'Web3', 'Bangalore', 'Beginner', 'Online'].map(tag => (
                  <button
                    key={tag}
                    onClick={() => setQuery(tag)}
                    className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-950/80 text-purple-300 border border-purple-500/30 hover:text-white"
                  >
                    Try &quot;{tag}&quot;
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER SHORTCUTS ROW */}
        <div className="px-4 py-2.5 border-t border-purple-900/30 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span className="font-mono text-purple-400">Findathon Search Engine</span>
        </div>
      </div>
    </div>
  );
}
