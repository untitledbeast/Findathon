'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, signInWithGoogle, signOut } from './supabase';

// Match EXACTLY what the DB returns (snake_case)
export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  organization: string | null;
  phone: string | null;
  website: string | null;
  social_twitter: string | null;
  social_linkedin: string | null;
  social_instagram: string | null;
  social_discord: string | null;
  role: 'user' | 'organizer' | 'moderator' | 'admin' | null;
  github_url: string | null;
  portfolio_url: string | null;
  xp_points: number | null;
  created_at: string | null;
  updated_at: string | null;
  // Virtual field — from auth.users, not profiles table
  email?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: string;
  loading: boolean;
  signInWithGoogle: () => Promise<unknown>;
  signOut: () => Promise<unknown>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  role: 'user',
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const buildFallback = useCallback((u: User): UserProfile => ({
    id: u.id,
    full_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'User',
    avatar_url: u.user_metadata?.avatar_url || u.user_metadata?.picture || null,
    bio: null,
    organization: null,
    phone: null,
    website: null,
    social_twitter: null,
    social_linkedin: null,
    social_instagram: null,
    social_discord: null,
    role: 'user',
    github_url: null,
    portfolio_url: null,
    xp_points: 0,
    created_at: null,
    updated_at: null,
    email: u.email || null,
  }), []);

  const fetchProfile = useCallback(async (u: User) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', u.id)
        .maybeSingle();

      if (error) {
        console.warn('[Auth] profile fetch error:', error.message);
        setProfile({ ...buildFallback(u), email: u.email || null });
        return;
      }

      if (data) {
        setProfile({
          ...data,
          // Prefer Google avatar if DB is empty
          avatar_url: data.avatar_url || u.user_metadata?.avatar_url || u.user_metadata?.picture || null,
          full_name: data.full_name || u.user_metadata?.full_name || u.user_metadata?.name || null,
          // Inject email from auth (not in profiles table)
          email: u.email || null,
        } as UserProfile);
      } else {
        setProfile({ ...buildFallback(u), email: u.email || null });
      }
    } catch (err) {
      console.error('[Auth] fetchProfile exception:', err);
      setProfile({ ...buildFallback(u), email: u.email || null });
    }
  }, [buildFallback]);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user);
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        console.log('[Auth] event:', event);
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
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      role: profile?.role || 'user',
      loading,
      signInWithGoogle,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}