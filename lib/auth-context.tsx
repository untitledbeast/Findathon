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
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string, authUser?: User) => {
    try {
      const p = await getProfile(userId);
      if (p) {
        setProfile(p);
      } else {
        // Construct fallback profile from OAuth metadata if profile row doesn't exist yet
        const meta = authUser?.user_metadata || {};
        const fallbackProfile: Profile = {
          id: userId,
          full_name: meta.full_name || meta.name || authUser?.email?.split('@')[0] || 'User',
          avatar_url: meta.avatar_url || meta.picture || null,
          bio: '',
          organization: '',
          phone: '',
          website: '',
        };
        setProfile(fallbackProfile);
      }
    } catch (err) {
      console.error('Error in fetchUserProfile:', err);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchUserProfile(user.id, user);
    }
  };

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchUserProfile(currentUser.id, currentUser).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen to Auth State Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await fetchUserProfile(currentUser.id, currentUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
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
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
