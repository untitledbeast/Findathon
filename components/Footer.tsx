import React from 'react';
import Link from 'next/link';
import { Trophy, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-purple-900/30 bg-slate-950 text-slate-400 py-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Left branding */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <span className="font-bold text-white tracking-tight text-base">Findathon</span>
            <p className="text-xs text-slate-400">Discover & submit top tech hackathons worldwide.</p>
          </div>
        </div>

        {/* Links */}
        <div className="flex items-center gap-6 text-xs text-slate-400">
          <Link href="/" className="hover:text-purple-300 transition-colors">Home</Link>
          <Link href="/submit" className="hover:text-purple-300 transition-colors">Submit Hackathon</Link>
          <a href="https://supabase.com" target="_blank" rel="noreferrer" className="hover:text-purple-300 transition-colors">Powered by Supabase</a>
        </div>

        {/* Copyright */}
        <div className="text-xs text-slate-400 flex items-center gap-1">
          <span>Built with</span>
          <Heart className="w-3.5 h-3.5 text-purple-500 fill-current" />
          <span>using Next.js 14 & Tailwind CSS</span>
        </div>

      </div>
    </footer>
  );
}
