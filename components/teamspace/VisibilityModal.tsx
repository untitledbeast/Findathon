'use client';

import React, { useState, useEffect } from 'react';
import { X, Shield, Eye, EyeOff, Check, Loader2 } from 'lucide-react';
import { DeveloperVisibility } from '@/lib/teamspace/types';

interface VisibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (visibility: DeveloperVisibility) => void;
}

const PRESET_ROLES = [
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

export default function VisibilityModal({
  isOpen,
  onClose,
  onUpdated
}: VisibilityModalProps) {
  const [visibility, setVisibility] = useState<DeveloperVisibility>({
    user_id: '',
    is_discoverable: true,
    looking_for_team: true,
    preferred_roles: [],
    updated_at: new Date().toISOString()
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    async function loadSettings() {
      setLoading(true);
      try {
        const res = await fetch('/api/v1/teamspace/visibility');
        const json = await res.json();
        if (active && json.success && json.data) {
          setVisibility(json.data);
        }
      } catch {
        // Fallback to default state
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSettings();
    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdate = async (updates: Partial<DeveloperVisibility>) => {
    const updated = { ...visibility, ...updates };
    setVisibility(updated);
    setSaving(true);

    try {
      const res = await fetch('/api/v1/teamspace/visibility', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const json = await res.json();
      if (json.success && json.data) {
        setVisibility(json.data);
        onUpdated?.(json.data);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 1500);
      }
    } catch {
      // Error handling
    } finally {
      setSaving(false);
    }
  };

  const toggleRole = (role: string) => {
    const currentRoles = visibility.preferred_roles || [];
    let newRoles: string[];
    if (currentRoles.includes(role)) {
      newRoles = currentRoles.filter((r) => r !== role);
    } else {
      newRoles = [...currentRoles, role];
    }
    handleUpdate({ preferred_roles: newRoles });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-purple-500/30 bg-[#0D1224] p-6 shadow-2xl space-y-6 animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Developer Visibility</h3>
              <p className="text-xs text-slate-400">Control your discoverability for teams</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {savedSuccess && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-500/30">
                <Check className="w-3 h-3" />
                <span>Saved</span>
              </span>
            )}
            {saving && (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
            <span>Loading preferences...</span>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Toggle 1: Discoverable */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="space-y-0.5 pr-3">
                <div className="flex items-center gap-1.5">
                  {visibility.is_discoverable ? (
                    <Eye className="w-3.5 h-3.5 text-purple-400" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <h4 className="text-xs font-bold text-white">Make my profile discoverable</h4>
                </div>
                <p className="text-[11px] text-slate-400">
                  Allow team leads and hackathon organizers to find and recommend you.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleUpdate({ is_discoverable: !visibility.is_discoverable })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  visibility.is_discoverable ? 'bg-purple-600' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    visibility.is_discoverable ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 2: Looking for team */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="space-y-0.5 pr-3">
                <h4 className="text-xs font-bold text-white">I am looking for a team</h4>
                <p className="text-[11px] text-slate-400">
                  Show an active &ldquo;Ready to Join&rdquo; signal on your builder card.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleUpdate({ looking_for_team: !visibility.looking_for_team })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  visibility.looking_for_team ? 'bg-purple-600' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    visibility.looking_for_team ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Preferred Roles Multi-select */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Preferred Roles & Domains
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1">
                {PRESET_ROLES.map((role) => {
                  const isSelected = (visibility.preferred_roles || []).includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        isSelected
                          ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {role}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Modal footer */}
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition shadow-lg shadow-purple-600/20 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
