'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MapPin, CheckCircle2, Loader2, X, Building2 } from 'lucide-react';
import { PlaceSuggestion } from '@/app/api/v1/places/autocomplete/route';

interface PlaceAutocompleteProps {
  selectedPlace: PlaceSuggestion | null;
  onSelect: (place: PlaceSuggestion) => void;
  onClear: () => void;
  fallbackCity?: string;
  fallbackVenue?: string;
  onManualChange?: (city: string, venue: string) => void;
}

export default function PlaceAutocomplete({
  selectedPlace,
  onSelect,
  onClear,
  fallbackCity = '',
  fallbackVenue = '',
  onManualChange
}: PlaceAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [manualMode, setManualMode] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions with debounce & cancellation
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/places/autocomplete?q=${encodeURIComponent(searchQuery)}`, {
        signal: controller.signal
      });
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      if (data.success && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
        setIsOpen(data.suggestions.length > 0);
        setActiveIndex(-1);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('[PlaceAutocomplete] Error:', err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        fetchSuggestions(query);
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, fetchSuggestions]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (place: PlaceSuggestion) => {
    onSelect(place);
    setQuery('');
    setIsOpen(false);
    setSuggestions([]);
    setManualMode(false);
  };

  const handleClear = () => {
    onClear();
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
  };

  // If a verified place is selected, show the verified badge card
  if (selectedPlace && !manualMode) {
    return (
      <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 backdrop-blur-md space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Verified Map Location
              </span>
              <h4 className="text-sm font-bold text-white mt-1">{selectedPlace.title}</h4>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-xs font-semibold text-slate-400 hover:text-white px-2.5 py-1 rounded-lg glass-card border border-purple-500/20 hover:border-purple-500/40 transition-colors"
          >
            Change Location
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 pt-2 border-t border-emerald-500/20">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="truncate"><strong>Venue:</strong> {selectedPlace.venue || selectedPlace.title}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate"><strong>City:</strong> {selectedPlace.city}{selectedPlace.state ? `, ${selectedPlace.state}` : ''}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-3 relative">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-300">
          Where is your hackathon happening? *
        </label>
        <button
          type="button"
          onClick={() => setManualMode(!manualMode)}
          className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 transition-colors"
        >
          {manualMode ? 'Switch to Place Search' : 'Manual Address Entry'}
        </button>
      </div>

      {!manualMode ? (
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-purple-400 pointer-events-none" />
            <input
              type="text"
              role="combobox"
              aria-expanded={isOpen}
              aria-autocomplete="list"
              aria-controls="place-suggestions-list"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (suggestions.length > 0) setIsOpen(true);
              }}
              placeholder="Search college, university, campus, or venue (e.g. IIT Bombay, DTU)..."
              className="w-full pl-10 pr-10 py-3 rounded-xl glass-card bg-slate-900/70 border border-purple-500/30 text-white text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all placeholder:text-slate-500"
            />
            {loading ? (
              <Loader2 className="absolute right-3.5 w-4 h-4 text-purple-400 animate-spin" />
            ) : query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3.5 text-slate-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>

          {/* Autocomplete Dropdown Listbox */}
          {isOpen && (
            <ul
              id="place-suggestions-list"
              role="listbox"
              className="absolute z-50 mt-1.5 w-full max-h-60 overflow-y-auto rounded-2xl bg-[#0D1224]/95 border border-purple-500/30 shadow-[0_12px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl divide-y divide-purple-900/20"
            >
              {suggestions.map((item, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <li
                    key={item.placeId}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`p-3 cursor-pointer flex items-start gap-3 transition-colors ${
                      isActive ? 'bg-purple-600/30 text-white' : 'hover:bg-purple-950/40 text-slate-300'
                    }`}
                  >
                    <MapPin className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{item.title}</p>
                      <p className="text-[11px] text-slate-400 truncate">{item.formattedAddress}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-cyan-400 font-semibold">{item.city}</span>
                        {item.precision === 'exact_venue' && (
                          <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded border border-purple-500/30 font-medium">
                            Verified Venue
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        /* Manual Fallback Inputs */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl glass-card bg-slate-900/40 border border-purple-900/30">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">City *</label>
            <input
              type="text"
              value={fallbackCity}
              onChange={(e) => onManualChange?.(e.target.value, fallbackVenue)}
              placeholder="e.g. Bangalore"
              className="w-full px-4 py-2.5 rounded-xl glass-card bg-slate-900/60 border border-purple-900/40 text-white text-xs focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Venue / College</label>
            <input
              type="text"
              value={fallbackVenue}
              onChange={(e) => onManualChange?.(fallbackCity, e.target.value)}
              placeholder="e.g. IIT Bombay"
              className="w-full px-4 py-2.5 rounded-xl glass-card bg-slate-900/60 border border-purple-900/40 text-white text-xs focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}
