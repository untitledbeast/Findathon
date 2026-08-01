'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Profile, getProfile, signInWithGoogle, signOut } from './supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<unknown>;
  signOut: () => Promise<unknown>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signInWithGoogle: async () => { },
  signOut: async () => { },
  refreshProfile: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const buildFallbackProfile = (authUser: User): Profile => {
    const meta = authUser.user_metadata || {};
    return {
      id: authUser.id,
      full_name: meta.full_name || meta.name || authUser.email?.split('@')[0] || 'User',
      avatar_url: meta.avatar_url || meta.picture || null,
      bio: null,
      organization: null,
      phone: null,
      website: null,
    };
  };

  const fetchUserProfile = async (authUser: User) => {
    try {
      const p = await getProfile(authUser.id);
      if (p) {
        // Merge DB profile with OAuth metadata for avatar/name freshness
        setProfile({
          ...p,
          avatar_url: p.avatar_url || authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
          full_name: p.full_name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || null,
        });
      } else {
        setProfile(buildFallbackProfile(authUser));
      }
    } catch (err) {
      console.error('[AuthContext] fetchUserProfile error:', err);
      setProfile(buildFallbackProfile(authUser));
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchUserProfile(user);
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[AuthContext] initial session:', session ? 'FOUND' : 'NONE');
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] auth event:', event, session ? 'HAS SESSION' : 'NO SESSION');
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signInWithGoogle,
        signOut,
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