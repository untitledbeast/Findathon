import { supabase } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { AuthenticationError } from '@/lib/errors';
import { USER_ROLES, UserRole } from '@/constants/roles';

export interface UserDTO {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: UserRole;
}

export const AuthService = {
  async getSession() {
    if (typeof window === 'undefined') {
      const serverClient = await createSupabaseServerClient();
      const { data } = await serverClient.auth.getSession();
      return data.session;
    }
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  async getUser(): Promise<UserDTO | null> {
    const client = typeof window === 'undefined'
      ? await createSupabaseServerClient()
      : supabase;

    const { data: { user } } = await client.auth.getUser();
    if (!user) return null;

    const role = await this.getUserRole(user.id);

    return {
      id: user.id,
      email: user.email || null,
      fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      avatarUrl: user.user_metadata?.avatar_url || null,
      role
    };
  },

  async getUserRole(userId: string): Promise<UserRole> {
    try {
      const client = typeof window === 'undefined'
        ? await createSupabaseServerClient()
        : supabase;

      const { data } = await client
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      return (data?.role as UserRole) || USER_ROLES.USER;
    } catch {
      return USER_ROLES.USER;
    }
  },

  async requireAuth(): Promise<UserDTO> {
    const user = await this.getUser();
    if (!user) {
      throw new AuthenticationError('Authentication required to access this resource');
    }
    return user;
  },

  async signInWithGoogle(redirectTo?: string) {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo || `${window.location.origin}/auth/callback`
      }
    });
  },

  async signOut() {
    return supabase.auth.signOut();
  }
};
