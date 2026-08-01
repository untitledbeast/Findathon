'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

// Profile type matching the profiles table columns (camelCase for client usage)
export interface Profile {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  organization: string | null;
  phone: string | null;
  website: string | null;
  socialTwitter: string | null;
  socialLinkedin: string | null;
  socialInstagram: string | null;
  socialDiscord: string | null;
  role: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  email?: string | null;
  xpPoints: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<unknown>;
  signOut: () => Promise<unknown>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  role: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

// Map snake_case DB columns to camelCase Profile fields
function mapDbRowToProfile(row: Record<string, unknown>, authUser?: User | null): Profile {
  const meta = authUser?.user_metadata || {};
  return {
    id: row.id as string,
    fullName: (row.full_name as string) || meta.full_name || meta.name || null,
    avatarUrl: (row.avatar_url as string) || meta.avatar_url || meta.picture || null,
    bio: (row.bio as string) || null,
    organization: (row.organization as string) || null,
    phone: (row.phone as string) || null,
    website: (row.website as string) || null,
    socialTwitter: (row.social_twitter as string) || null,
    socialLinkedin: (row.social_linkedin as string) || null,
    socialInstagram: (row.social_instagram as string) || null,
    socialDiscord: (row.social_discord as string) || null,
    role: (row.role as string) || 'user',
    githubUrl: (row.github_url as string) || null,
    portfolioUrl: (row.portfolio_url as string) || null,
    email: authUser?.email || null,
    xpPoints: (row.xp_points as number) || 0,
    createdAt: (row.created_at as string) || null,
    updatedAt: (row.updated_at as string) || null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const buildFallbackProfile = useCallback((authUser: User): Profile => {
    const meta = authUser.user_metadata || {};
    return {
      id: authUser.id,
      fullName: meta.full_name || meta.name || authUser.email?.split('@')[0] || 'User',
      avatarUrl: meta.avatar_url || meta.picture || null,
      bio: null,
      organization: null,
      phone: null,
      website: null,
      socialTwitter: null,
      socialLinkedin: null,
      socialInstagram: null,
      socialDiscord: null,
      role: 'user',
      githubUrl: null,
      portfolioUrl: null,
      email: authUser.email || null,
      xpPoints: 0,
    };
  }, []);

  const fetchProfile = useCallback(async (authUser: User) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) {
        console.warn('[AuthContext] Profile fetch error:', error.message);
        setProfile(buildFallbackProfile(authUser));
        return;
      }

      if (data) {
        setProfile(mapDbRowToProfile(data, authUser));
      } else {
        // Profile row doesn't exist yet — use fallback
        setProfile(buildFallbackProfile(authUser));
      }
    } catch (err) {
      console.error('[AuthContext] fetchProfile exception:', err);
      setProfile(buildFallbackProfile(authUser));
    }
  }, [buildFallbackProfile]);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user);
  }, [user, fetchProfile]);

  const handleSignInWithGoogle = useCallback(async () => {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }, []);

  const handleSignOut = useCallback(async () => {
    return supabase.auth.signOut();
  }, []);

  useEffect(() => {
    let mounted = true;

    // Step 1: Get initial session from cookies (middleware ensures this works)
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!mounted) return;

      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        fetchProfile(initialSession.user).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Step 2: Listen for auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        console.log('[AuthContext] auth event:', event);

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          await fetchProfile(newSession.user);
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role: profile?.role ?? null,
        loading,
        signInWithGoogle: handleSignInWithGoogle,
        signOut: handleSignOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}