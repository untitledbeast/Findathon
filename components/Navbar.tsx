'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useNotifications } from '@/hooks/useNotifications';
import {
  Search,
  Sparkles,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  ChevronDown,
  FileText,
  Bookmark,
  Bell,
  CheckCheck,
  ShieldCheck
} from 'lucide-react';

interface NavbarProps {
  savedCount?: number;
  onOpenSaved?: () => void;
}

export default function Navbar({ savedCount = 0, onOpenSaved }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, role, loading, signInWithGoogle, signOut } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Scroll listener to increase glass opacity
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const avatarUrl = profile?.avatarUrl || user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const userName = profile?.fullName || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const userEmail = profile?.email || user?.email || '';

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await signOut();
    router.push('/');
  };

  const handleActionOrSignIn = (action: () => void) => {
    if (!user) {
      signInWithGoogle();
    } else {
      action();
    }
  };

  return (
    <header className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-4xl">
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

          {loading ? (
            <div className="w-24 h-9 bg-slate-800 animate-pulse rounded-full" />
          ) : !user ? (
            <button
              onClick={signInWithGoogle}
              className="px-4 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md transition-all hover:scale-105 active:scale-95"
            >
              Sign In
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {(role === 'admin' || role === 'moderator') && (
                <Link
                  href="/admin"
                  className="hidden sm:block bg-red-600/20 text-red-400 border border-red-600/30 rounded-full px-3 py-1 text-xs font-medium hover:bg-red-600/30 transition-colors"
                >
                  Admin
                </Link>
              )}
              
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-9 h-9 rounded-full overflow-hidden border border-purple-500/30 hover:border-purple-400 transition-all bg-slate-950/60"
                >
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={userName}
                      width={36}
                      height={36}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center">
                      {getInitials(userName)}
                    </div>
                  )}
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-12 w-64 bg-slate-900 rounded-2xl border border-purple-900/30 p-2 z-50 shadow-xl animate-fade-in-up">
                    <div className="px-3 py-3 border-b border-slate-800 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
                        {avatarUrl ? (
                          <Image src={avatarUrl} alt={userName} width={48} height={48} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-purple-600 text-white font-bold text-lg flex items-center justify-center">
                            {getInitials(userName)}
                          </div>
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold text-white truncate">{userName}</p>
                        <p className="text-[11px] text-slate-400 truncate">{userEmail}</p>
                        <div className="inline-block mt-1 bg-purple-600/20 text-purple-400 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize">
                          {role || 'User'}
                        </div>
                      </div>
                    </div>

                    <div className="py-2 space-y-1">
                      <Link
                        href="/account?tab=dashboard"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                      >
                        <UserIcon className="w-4 h-4 text-purple-400" />
                        My Account
                      </Link>

                      <Link
                        href="/account?tab=submissions"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                      >
                        <FileText className="w-4 h-4 text-purple-400" />
                        My Submissions
                      </Link>

                      <Link
                        href="/account?tab=saved"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                      >
                        <Bookmark className="w-4 h-4 text-purple-400" />
                        Saved Hackathons
                      </Link>

                      {(role === 'admin' || role === 'moderator') && (
                        <Link
                          href="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                        >
                          <ShieldCheck className="w-4 h-4 text-red-400" />
                          <span className="text-red-400">Admin Panel</span>
                        </Link>
                      )}
                    </div>

                    <div className="border-t border-slate-800 pt-2">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-red-400 hover:bg-slate-800 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
          <Link href="/" onClick={() => setMobileMenuOpen(false)} className="block text-xs font-bold text-slate-200 py-1.5 hover:text-white">
            Discover
          </Link>
          <Link href="/categories" onClick={() => setMobileMenuOpen(false)} className="block text-xs font-bold text-slate-200 py-1.5 hover:text-white">
            Categories
          </Link>
          <button onClick={() => handleActionOrSignIn(() => { setMobileMenuOpen(false); router.push('/submit'); })} className="w-full text-left block text-xs font-bold text-purple-300 py-1.5 hover:text-white">
            Submit Hackathon
          </button>
          
          {loading ? (
             <div className="w-full h-8 bg-slate-800 animate-pulse rounded-md" />
          ) : !user ? (
            <button onClick={() => { setMobileMenuOpen(false); signInWithGoogle(); }} className="w-full text-left block text-xs font-bold text-white py-1.5">
              Sign In
            </button>
          ) : (
            <>
              <Link href="/account" onClick={() => setMobileMenuOpen(false)} className="block text-xs font-bold text-slate-200 py-1.5 hover:text-white">
                My Account
              </Link>
              <Link href="/account?tab=submissions" onClick={() => setMobileMenuOpen(false)} className="block text-xs font-bold text-slate-200 py-1.5 hover:text-white">
                My Submissions
              </Link>
              {(role === 'admin' || role === 'moderator') && (
                <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="block text-xs font-bold text-red-400 py-1.5 hover:text-red-300">
                  Admin Panel
                </Link>
              )}
              <button onClick={() => { setMobileMenuOpen(false); handleSignOut(); }} className="w-full text-left block text-xs font-bold text-rose-400 py-1.5 hover:text-rose-300">
                Sign Out
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
