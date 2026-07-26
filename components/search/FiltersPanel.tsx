'use client';

import React, { useState } from 'react';
import { HackathonSearchFilters } from '@/lib/modules/hackathons';
import { Filter, X, ChevronDown, Check, DollarSign, Award, Briefcase, ShieldCheck } from 'lucide-react';

interface FiltersPanelProps {
  filters: HackathonSearchFilters;
  onChange: (filters: HackathonSearchFilters) => void;
  onReset: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const CATEGORY_OPTIONS = ['AI', 'Web3', 'Cloud', 'Cyber', 'Mobile', 'Data', 'Game', 'Open Source'];

export default function FiltersPanel({ filters, onChange, onReset, onClose }: FiltersPanelProps) {
  const [openSections, setOpenSections] = useState({
    status: true,
    categories: true,
    mode: true,
    prize: true,
    extras: true
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleTagToggle = (tag: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    onChange({ ...filters, tags: newTags });
  };

  const hasActiveFilters = Boolean(
    filters.query ||
    filters.city ||
    filters.isOnline !== undefined ||
    (filters.tags && filters.tags.length > 0) ||
    filters.prizeMin
  );

  return (
    <aside className="w-full lg:w-72 glass-card p-5 rounded-3xl border border-purple-900/30 space-y-6 shrink-0">
      {/* HEADER */}
      <div className="flex items-center justify-between pb-4 border-b border-purple-900/30">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <Filter className="w-4 h-4 text-purple-400" /> Search Filters
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white lg:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ACTIVE FILTER CHIPS */}
      {hasActiveFilters && (
        <div className="space-y-2 pb-4 border-b border-purple-900/30">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>Active Filters</span>
            <button onClick={onReset} className="text-purple-400 hover:text-purple-300">Clear All</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filters.city && (
              <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                📍 {filters.city} <button onClick={() => onChange({ ...filters, city: undefined })}><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.isOnline !== undefined && (
              <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                🌐 {filters.isOnline ? 'Online' : 'In-Person'} <button onClick={() => onChange({ ...filters, isOnline: undefined })}><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.tags?.map(t => (
              <span key={t} className="px-2 py-1 rounded-lg text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                #{t} <button onClick={() => handleTagToggle(t)}><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* MODE SECTION */}
      <div className="space-y-3 pb-4 border-b border-purple-900/30">
        <button
          onClick={() => toggleSection('mode')}
          className="w-full flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white"
        >
          <span>Event Format</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${openSections.mode ? 'rotate-180' : ''}`} />
        </button>

        {openSections.mode && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'All', val: undefined },
              { label: 'Online', val: true },
              { label: 'In-Person', val: false }
            ].map(item => {
              const isSelected = filters.isOnline === item.val;
              return (
                <button
                  key={item.label}
                  onClick={() => onChange({ ...filters, isOnline: item.val })}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-400'
                      : 'glass-card text-slate-300 border-purple-900/30 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* CATEGORIES SECTION */}
      <div className="space-y-3 pb-4 border-b border-purple-900/30">
        <button
          onClick={() => toggleSection('categories')}
          className="w-full flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white"
        >
          <span>Categories</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${openSections.categories ? 'rotate-180' : ''}`} />
        </button>

        {openSections.categories && (
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto scrollbar-none">
            {CATEGORY_OPTIONS.map(cat => {
              const isSelected = (filters.tags || []).includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => handleTagToggle(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-400'
                      : 'glass-card text-slate-300 border-purple-900/30 hover:text-white'
                  }`}
                >
                  {cat}
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* PRIZE SLIDER SECTION */}
      <div className="space-y-3 pb-4 border-b border-purple-900/30">
        <button
          onClick={() => toggleSection('prize')}
          className="w-full flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white"
        >
          <span>Minimum Prize Pool</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${openSections.prize ? 'rotate-180' : ''}`} />
        </button>

        {openSections.prize && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono text-purple-300 font-bold">
              <span>₹0</span>
              <span>₹{(filters.prizeMin || 0).toLocaleString()}+</span>
            </div>
            <input
              type="range"
              min="0"
              max="500000"
              step="10000"
              value={filters.prizeMin || 0}
              onChange={(e) => onChange({ ...filters, prizeMin: parseInt(e.target.value, 10) || undefined })}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* FEATURE TOGGLES */}
      <div className="space-y-3">
        <span className="block text-xs font-bold text-slate-300">Feature Benefits</span>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Award className="w-4 h-4 text-purple-400" /> Certificate Provided
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Briefcase className="w-4 h-4 text-cyan-400" /> Internship Opportunity
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Verified Host Only
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <DollarSign className="w-4 h-4 text-amber-400" /> Free Registration
          </div>
        </div>
      </div>
    </aside>
  );
}
