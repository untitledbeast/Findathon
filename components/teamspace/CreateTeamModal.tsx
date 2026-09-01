/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Sparkles, Trophy, Loader2 } from 'lucide-react';
import { TeamWithMemberCount } from '@/lib/teamspace/types';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newTeam: TeamWithMemberCount) => void;
  preselectedHackathonId?: string | null;
}

const PRESET_SKILLS = [
  'Frontend',
  'Backend',
  'ML/AI',
  'DevOps',
  'Mobile',
  'Blockchain',
  'Data Science',
  'UI/UX',
  'Cybersecurity',
  'Game Dev',
  'Embedded Systems',
  'Open Source'
];

export default function CreateTeamModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedHackathonId = null
}: CreateTeamModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hackathonId, setHackathonId] = useState<string | null>(preselectedHackathonId);
  const [hackathonSearch, setHackathonSearch] = useState('');
  const [hackathonResults, setHackathonResults] = useState<{ id: string; title: string }[]>([]);
  const [isSearchingHackathons, setIsSearchingHackathons] = useState(false);
  const [selectedHackathonTitle, setSelectedHackathonTitle] = useState<string | null>(null);
  const [showHackathonDropdown, setShowHackathonDropdown] = useState(false);

  const [maxMembers, setMaxMembers] = useState(4);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (preselectedHackathonId) {
      setHackathonId(preselectedHackathonId);
    }
  }, [preselectedHackathonId]);

  // Search hackathons with debounce
  useEffect(() => {
    let active = true;
    if (!hackathonSearch.trim()) {
      setHackathonResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingHackathons(true);
      try {
        const res = await fetch(`/api/v1/hackathons/search?q=${encodeURIComponent(hackathonSearch.trim())}&limit=8`);
        const json = await res.json();
        if (active && json?.success && Array.isArray(json.data)) {
          setHackathonResults(json.data.map((h: any) => ({ id: h.id, title: h.title })));
        }
      } catch {
        // Ignore search errors
      } finally {
        if (active) setIsSearchingHackathons(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [hackathonSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowHackathonDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const toggleSkill = (skill: string) => {
    if (requiredSkills.includes(skill)) {
      setRequiredSkills(requiredSkills.filter((s) => s !== skill));
    } else {
      if (requiredSkills.length < 10) {
        setRequiredSkills([...requiredSkills, skill]);
      }
    }
  };

  const addCustomSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && customSkill.trim()) {
      e.preventDefault();
      const trimmed = customSkill.trim();
      if (!requiredSkills.includes(trimmed) && requiredSkills.length < 10) {
        setRequiredSkills([...requiredSkills, trimmed]);
      }
      setCustomSkill('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      setErrorMsg('Team name must be at least 2 characters.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/v1/teamspace/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          hackathon_id: hackathonId || null,
          max_members: maxMembers,
          required_skills: requiredSkills
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Failed to create team');
      }

      const created = {
        ...json.data,
        hackathon_title: selectedHackathonTitle
      };

      onSuccess(created);
      onClose();
      // Reset form
      setName('');
      setDescription('');
      setHackathonId(null);
      setSelectedHackathonTitle(null);
      setRequiredSkills([]);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while creating your team.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl border border-purple-500/30 bg-[#0D1224] p-6 sm:p-7 shadow-2xl relative my-8 space-y-6 animate-fade-in-up">
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Create a Team</h3>
              <p className="text-xs text-slate-400">Assemble builders and find complementary talent.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Team Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Team Name <span className="text-purple-400">*</span>
            </label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Quantum Innovators"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-purple-500 text-sm text-white placeholder:text-slate-600 outline-none transition"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Description <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <textarea
              rows={2}
              maxLength={200}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you building or aiming to solve?"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-purple-500 text-sm text-white placeholder:text-slate-600 outline-none transition resize-none"
            />
          </div>

          {/* Hackathon Link (Searchable Dropdown) */}
          <div className="space-y-1.5 relative" ref={dropdownRef}>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Link to Hackathon <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            
            {selectedHackathonTitle ? (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200">
                <div className="flex items-center gap-2 truncate">
                  <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="font-semibold truncate">{selectedHackathonTitle}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setHackathonId(null);
                    setSelectedHackathonTitle(null);
                  }}
                  className="text-slate-400 hover:text-white ml-2 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={hackathonSearch}
                  onFocus={() => setShowHackathonDropdown(true)}
                  onChange={(e) => {
                    setHackathonSearch(e.target.value);
                    setShowHackathonDropdown(true);
                  }}
                  placeholder="Search hackathons by name..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-purple-500 text-sm text-white placeholder:text-slate-600 outline-none transition"
                />

                {showHackathonDropdown && (hackathonResults.length > 0 || isSearchingHackathons) && (
                  <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto rounded-xl bg-slate-900 border border-slate-700 shadow-xl z-20 py-1">
                    {isSearchingHackathons ? (
                      <div className="p-3 text-xs text-slate-400 text-center flex items-center justify-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                        <span>Searching...</span>
                      </div>
                    ) : (
                      hackathonResults.map((h) => (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => {
                            setHackathonId(h.id);
                            setSelectedHackathonTitle(h.title);
                            setShowHackathonDropdown(false);
                            setHackathonSearch('');
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs text-slate-200 hover:bg-purple-900/40 hover:text-white flex items-center gap-2 transition"
                        >
                          <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="truncate">{h.title}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Max Members */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Max Members: <span className="text-purple-400">{maxMembers}</span>
              </label>
              <span className="text-[11px] text-slate-500">(2 - 10 builders)</span>
            </div>
            <input
              type="range"
              min={2}
              max={10}
              value={maxMembers}
              onChange={(e) => setMaxMembers(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          {/* Required Skills Multi-select */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Target / Required Skills
              </label>
              <span className="text-[10px] text-slate-500">{requiredSkills.length}/10 selected</span>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
              {PRESET_SKILLS.map((skill) => {
                const isSelected = requiredSkills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {skill}
                  </button>
                );
              })}
            </div>

            {/* Add Custom Skill */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
                onKeyDown={addCustomSkill}
                placeholder="Type custom skill & press Enter..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-600 outline-none focus:border-purple-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (customSkill.trim() && !requiredSkills.includes(customSkill.trim())) {
                    setRequiredSkills([...requiredSkills, customSkill.trim()]);
                    setCustomSkill('');
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition shadow-lg shadow-purple-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Team...</span>
                </>
              ) : (
                <span>Create Team</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
