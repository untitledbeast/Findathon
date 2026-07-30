'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export interface ProfileData {
  id: string
  fullName: string
  avatarUrl: string
  bio: string
  organization: string
  phone: string
  website: string
  email: string
  role: string
  socialTwitter: string
  socialLinkedin: string
  socialInstagram: string
  socialDiscord: string
  xpPoints: number
  createdAt: string
  updatedAt: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: ProfileData | null
  role: string
  loading: boolean
  mounted: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  role: '',
  loading: true,
  mounted: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  const fetchProfile = useCallback(async (userId: string, userEmail?: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('[AuthContext] fetchProfile error:', error.message)
        return
      }

      if (data) {
        setProfile({
          id: data.id,
          fullName: data.full_name ?? '',
          avatarUrl: data.avatar_url ?? '',
          bio: data.bio ?? '',
          organization: data.organization ?? '',
          phone: data.phone ?? '',
          website: data.website ?? '',
          email: data.email ?? userEmail ?? '',
          role: data.role ?? 'user',
          socialTwitter: data.social_twitter ?? '',
          socialLinkedin: data.social_linkedin ?? '',
          socialInstagram: data.social_instagram ?? '',
          socialDiscord: data.social_discord ?? '',
          xpPoints: data.xp_points ?? 0,
          createdAt: data.created_at ?? '',
          updatedAt: data.updated_at ?? '',
        })
      }
    } catch (err) {
      console.error('[AuthContext] fetchProfile exception:', err)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)

    let isMounted = true

    const initAuth = async () => {
      try {
        const { data: { session: initialSession } } =
          await supabase.auth.getSession()

        if (!isMounted) return

        if (initialSession?.user) {
          setSession(initialSession)
          setUser(initialSession.user)
          await fetchProfile(initialSession.user.id, initialSession.user.email)
        }
      } catch (err) {
        console.error('[AuthContext] initAuth error:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!isMounted) return

        console.log('[AuthContext] auth event:', event)

        setSession(currentSession)
        setUser(currentSession?.user ?? null)

        if (currentSession?.user) {
          await fetchProfile(currentSession.user.id, currentSession.user.email)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signInWithGoogle = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
      if (error) {
        console.error('[AuthContext] signInWithGoogle error:', error.message)
      }
    } catch (err) {
      console.error('[AuthContext] signInWithGoogle exception:', err)
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)
      setProfile(null)
    } catch (err) {
      console.error('[AuthContext] signOut error:', err)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id, user.email)
  }, [user, fetchProfile])

  const role = profile?.role ?? ''

  return (
    <AuthContext.Provider value={{
      user, session, profile, role,
      loading, mounted,
      signInWithGoogle, signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
