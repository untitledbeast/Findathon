'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  User as UserIcon,
  LogOut,
  FileText,
  Bookmark,
  ShieldCheck,
} from 'lucide-react';

interface NavbarAuthSectionProps {
  variant: 'desktop' | 'mobile';
  onClose?: () => void;
}

function getInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function NavbarAuthSection({ variant, onClose }: NavbarAuthSectionProps) {
  const router = useRouter();
  const { user, profile, role, signInWithGoogle, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const avatarUrl =
    profile?.avatar_url ||
    (profile as any)?.avatarUrl ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture;
  const userName =
    profile?.full_name ||
    (profile as any)?.fullName ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'User';
  const userEmail = profile?.email || user?.email || '';

  const handleSignOut = async () => {
    setDropdownOpen(false);
    onClose?.();
    await signOut();
    router.push('/');
  };

  // ─── MOBILE VARIANT ──────────────────────────────────────────────────
  if (variant === 'mobile') {
    if (!user) {
      return (
        <button
          onClick={() => { onClose?.(); signInWithGoogle(); }}
          className="w-full text-left block text-xs font-bold text-white py-1.5"
        >
          Sign In
        </button>
      );
    }
    return (
      <>
        <Link
          href="/account"
          onClick={onClose}
          className="block text-xs font-bold text-slate-200 py-1.5 hover:text-white"
        >
          My Account
        </Link>
        <Link
          href="/account?tab=submissions"
          onClick={onClose}
          className="block text-xs font-bold text-slate-200 py-1.5 hover:text-white"
        >
          My Submissions
        </Link>
        {(role === 'admin' || role === 'moderator') && (
          <Link
            href="/admin"
            onClick={onClose}
            className="block text-xs font-bold text-red-400 py-1.5 hover:text-red-300"
          >
            Admin Panel
          </Link>
        )}
        <button
          onClick={handleSignOut}
          className="w-full text-left block text-xs font-bold text-rose-400 py-1.5 hover:text-rose-300"
        >
          Sign Out
        </button>
      </>
    );
  }

  // ─── DESKTOP VARIANT ─────────────────────────────────────────────────
  if (!user) {
    return (
      <button
        onClick={signInWithGoogle}
        className="px-4 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md transition-all hover:scale-105 active:scale-95"
      >
        Sign In
      </button>
    );
  }

  return (
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
  );
}
