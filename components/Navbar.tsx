'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useAuthModal } from '@/components/AuthModal';
import {
  Search,
  Sparkles,
  PlusCircle,
  Bookmark,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  ChevronDown,
  FileCode2
} from 'lucide-react';

interface NavbarProps {
  savedCount?: number;
  onOpenSaved?: () => void;
}

export default function Navbar({ savedCount = 0, onOpenSaved }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();
  const { openAuthModal } = useAuthModal();

  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Scroll listener to increase glass opacity
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const userName = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || '';

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await signOut();
    router.push('/');
  };

  return (
    <header className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-4xl">
      
      {/* FLOATING PILL NAVBAR CONTAINER */}
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
            className={`transition-colors hover:text-white ${
              pathname === '/' ? 'text-white font-semibold' : 'text-slate-400'
            }`}
          >
            Discover
          </Link>
          <Link
            href="/categories"
            className={`transition-colors hover:text-white ${
              pathname?.startsWith('/categories') ? 'text-white font-semibold' : 'text-slate-400'
            }`}
          >
            Categories
          </Link>

          {onOpenSaved && (
            <button
              onClick={onOpenSaved}
              className="text-slate-400 hover:text-white transition-colors flex items-center gap-1"
            >
              <span>Saved</span>
              {savedCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-600 text-white font-bold font-mono-num">
                  {savedCount}
                </span>
              )}
            </button>
          )}

          <Link
            href="/submit"
            className={`transition-colors hover:text-white ${
              pathname === '/submit' ? 'text-white font-semibold' : 'text-slate-400'
            }`}
          >
            Submit
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
          
          {/* Search trigger icon */}
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
          <Link
            href="/submit"
            className="aurora-border px-3.5 py-1.5 rounded-full text-xs font-semibold text-white hover:scale-105 active:scale-95 transition-all hidden sm:inline-flex items-center gap-1.5 shadow-md"
          >
            <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>Submit Hackathon</span>
          </Link>

          {/* User Auth Avatar or Sign In Button */}
          {!user ? (
            <button
              onClick={openAuthModal}
              className="px-4 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md transition-all hover:scale-105 active:scale-95"
            >
              Sign In
            </button>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 p-1 rounded-full border border-purple-500/30 hover:border-purple-400 transition-all bg-slate-950/60"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={userName}
                    className="w-7 h-7 rounded-full object-cover ring-1 ring-purple-400/40"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center">
                    {getInitials(userName)}
                  </div>
                )}
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-3 w-60 rounded-2xl glass-card border border-purple-500/30 p-2 z-50 space-y-1 shadow-2xl animate-fade-in-up">
                  <div className="px-3 py-2 border-b border-purple-900/30">
                    <p className="text-xs font-bold text-white truncate">{userName}</p>
                    <p className="text-[10px] text-slate-400 truncate">{userEmail}</p>
                  </div>

                  <Link
                    href="/account"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-purple-950/60 hover:text-purple-300 transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-purple-400" />
                    <span>My Account</span>
                  </Link>

                  <Link
                    href="/account?tab=submissions"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-purple-950/60 hover:text-purple-300 transition-colors"
                  >
                    <FileCode2 className="w-4 h-4 text-purple-400" />
                    <span>My Submissions</span>
                  </Link>

                  <div className="border-t border-purple-900/30 pt-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/40 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

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
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs font-bold text-slate-200 py-1.5 hover:text-white"
          >
            Discover
          </Link>
          <Link
            href="/categories"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs font-bold text-slate-200 py-1.5 hover:text-white"
          >
            Categories
          </Link>
          <Link
            href="/submit"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs font-bold text-purple-300 py-1.5 hover:text-white"
          >
            Submit Hackathon
          </Link>
          {user && (
            <>
              <Link
                href="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-xs font-bold text-slate-200 py-1.5 hover:text-white"
              >
                My Account
              </Link>
              <Link
                href="/account?tab=submissions"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-xs font-bold text-slate-200 py-1.5 hover:text-white"
              >
                My Submissions
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleSignOut();
                }}
                className="block text-xs font-bold text-rose-400 py-1.5 hover:text-rose-300"
              >
                Sign Out
              </button>
            </>
          )}
        </div>
      )}

    </header>
  );
}
