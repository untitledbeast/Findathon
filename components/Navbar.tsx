'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, PlusCircle, Search, Trophy, Bookmark } from 'lucide-react';

interface NavbarProps {
  onSearchFocus?: () => void;
  savedCount?: number;
  onOpenSaved?: () => void;
}

export default function Navbar({ onSearchFocus, savedCount = 0, onOpenSaved }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-purple-900/30 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-purple-500 to-indigo-500 p-0.5 shadow-lg shadow-purple-900/40 group-hover:scale-105 transition-transform duration-200">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Trophy className="w-5 h-5 text-purple-400 group-hover:rotate-12 transition-transform duration-300" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1">
              Find<span className="text-gradient">athon</span>
            </span>
            <span className="text-[10px] text-purple-400 font-medium tracking-wider uppercase -mt-1">
              Hackathon Finder
            </span>
          </div>
        </Link>

        {/* Navigation Actions */}
        <div className="flex items-center gap-3">
          
          {onOpenSaved && (
            <button
              onClick={onOpenSaved}
              className="relative inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-purple-900/40 hover:border-purple-500/40 transition-all duration-200"
            >
              <Bookmark className="w-4 h-4 text-purple-400" />
              <span className="hidden sm:inline">Saved</span>
              {savedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-purple-600 text-white font-bold">
                  {savedCount}
                </span>
              )}
            </button>
          )}

          <Link
            href="/submit"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/40 hover:shadow-purple-700/50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Submit Hackathon</span>
          </Link>

        </div>

      </div>
    </header>
  );
}
