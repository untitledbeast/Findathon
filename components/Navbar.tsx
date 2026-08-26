'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Search,
  Sparkles,
  Menu,
  X,
} from 'lucide-react';

// ssr: false guarantees the server always renders the skeleton fallback.
// The real auth UI (Sign In / Avatar) only renders after client hydration —
// eliminating the server/client mismatch entirely.
const NavbarAuthDesktop = dynamic(
  () => import('./NavbarAuthSection'),
  {
    ssr: false,
    loading: () => <div className="w-24 h-9 bg-slate-800 animate-pulse rounded-full" />,
  }
);

// We need a wrapper for the mobile variant so we can pass props AND use ssr:false.
// dynamic() with ssr:false + a variant prop requires a thin wrapper.
const NavbarAuthMobile = dynamic(
  () => import('./NavbarAuthSection'),
  {
    ssr: false,
    loading: () => <div className="w-full h-8 bg-slate-800 animate-pulse rounded-md" />,
  }
);

interface NavbarProps {
  savedCount?: number;
  onOpenSaved?: () => void;
}

export default function Navbar({ savedCount: _savedCount = 0, onOpenSaved: _onOpenSaved }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signInWithGoogle } = useAuth();

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Scroll listener to increase glass opacity
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleActionOrSignIn = (action: () => void) => {
    if (!user) {
      signInWithGoogle();
    } else {
      action();
    }
  };

  return (
    <header suppressHydrationWarning className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-4xl">
      <nav
        className={`glass-card rounded-full px-5 sm:px-6 py-2.5 sm:py-3 shadow-2xl transition-all duration-300 flex items-center justify-between gap-4 ${
          scrolled
            ? 'bg-[#0D1224]/90 border-purple-500/30 shadow-[0_12px_40px_rgba(139,92,246,0.25)]'
            : 'bg-[#0D1224]/60 border-purple-500/15'
        }`}
      >
        {/* LEFT: BRAND LOGO */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <span className="text-purple-400 group-hover:rotate-12 transition-transform duration-300 text-lg">✦</span>
          <span className="text-base sm:text-lg font-extrabold tracking-tight text-white flex items-center gap-1">
            Find<span className="text-gradient">athon</span>
          </span>
        </Link>

        {/* CENTER: NAV LINKS (Desktop) */}
        <div className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-medium">
          <Link
            href="/"
            className={`transition-colors hover:text-white ${pathname === '/' ? 'text-white font-semibold' : 'text-slate-400'}`}
          >
            Discover
          </Link>
          <Link
            href="/categories"
            className={`transition-colors hover:text-white ${pathname?.startsWith('/categories') ? 'text-white font-semibold' : 'text-slate-400'}`}
          >
            Categories
          </Link>
          <Link
            href="/teamspace"
            className={`transition-colors hover:text-white flex items-center gap-1 ${pathname?.startsWith('/teamspace') ? 'text-purple-300 font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>TeamSpace</span>
          </Link>
          <Link
            href="/map"
            className={`transition-colors hover:text-white flex items-center gap-1 ${pathname === '/map' ? 'text-cyan-400 font-bold' : 'text-purple-300 hover:text-white'}`}
          >
            <span>Map</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          </Link>
          <Link
            href="/#about"
            className="text-slate-400 hover:text-white transition-colors"
          >
            About
          </Link>
        </div>

        {/* RIGHT: SEARCH, SUBMIT PILL & AUTH */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">

          <button
            onClick={() => {
              if (pathname !== '/') router.push('/');
              window.scrollTo({ top: 300, behavior: 'smooth' });
            }}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
            title="Search hackathons"
          >
            <Search className="w-4 h-4 text-purple-400" />
          </button>

          {/* Submit Hackathon Small Pill Button */}
          <button
            onClick={() => handleActionOrSignIn(() => router.push('/submit'))}
            className="aurora-border px-3.5 py-1.5 rounded-full text-xs font-semibold text-white hover:scale-105 active:scale-95 transition-all hidden sm:inline-flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>Submit Hackathon</span>
          </button>

          {/* Desktop auth — ssr:false prevents hydration mismatch */}
          <NavbarAuthDesktop variant="desktop" />

          {/* MOBILE HAMBURGER MENU BUTTON */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-full text-slate-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* MOBILE DROPDOWN MENU */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 p-4 rounded-3xl glass-card border border-purple-500/30 space-y-3 animate-fade-in-up">
          <Link href="/" onClick={() => setMobileMenuOpen(false)} className="block text-xs font-bold text-slate-200 py-1.5 hover:text-white">
            Discover
          </Link>
          <Link href="/categories" onClick={() => setMobileMenuOpen(false)} className="block text-xs font-bold text-slate-200 py-1.5 hover:text-white">
            Categories
          </Link>
          <Link href="/teamspace" onClick={() => setMobileMenuOpen(false)} className="block text-xs font-bold text-purple-300 py-1.5 hover:text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>TeamSpace</span>
          </Link>
          <Link href="/map" onClick={() => setMobileMenuOpen(false)} className="block text-xs font-bold text-cyan-300 py-1.5 hover:text-white flex items-center gap-1.5">
            <span>Map</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          </Link>
          <button
            onClick={() => handleActionOrSignIn(() => { setMobileMenuOpen(false); router.push('/submit'); })}
            className="w-full text-left block text-xs font-bold text-slate-200 py-1.5 hover:text-white"
          >
            Submit Hackathon
          </button>

          {/* Mobile auth — ssr:false prevents hydration mismatch */}
          <NavbarAuthMobile variant="mobile" onClose={() => setMobileMenuOpen(false)} />
        </div>
      )}
    </header>
  );
}
