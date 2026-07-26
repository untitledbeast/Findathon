import { supabase } from '@/lib/supabase';
import { Result, ok, err } from '@/lib/shared';
import { BaseError, AuthenticationError } from '@/lib/errors';
import { RequestContext, createRequestContext } from '@/lib/context/request-context';
import { NextRequest } from 'next/server';
import { ProfileService } from '@/lib/modules/profile';

export class AuthService {
  constructor(private readonly profileService?: ProfileService) {}

  public async signInWithGoogle(redirectTo?: string): Promise<Result<{ url: string }, BaseError>> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo || `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`
        }
      });

      if (error) {
        return err(new AuthenticationError(error.message));
      }

      return ok({ url: data.url || '' });
    } catch (e) {
      return err(new AuthenticationError(e instanceof Error ? e.message : 'Google OAuth failed'));
    }
  }

  public async signOut(): Promise<Result<void, BaseError>> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return err(new AuthenticationError(error.message));
      }
      return ok(undefined);
    } catch (e) {
      return err(new AuthenticationError(e instanceof Error ? e.message : 'Sign out failed'));
    }
  }

  public async getSession(): Promise<Result<unknown, BaseError>> {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        return err(new AuthenticationError(error.message));
      }
      return ok(data.session);
    } catch (e) {
      return err(new AuthenticationError(e instanceof Error ? e.message : 'Failed to retrieve session'));
    }
  }

  public async refreshSession(): Promise<Result<unknown, BaseError>> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        return err(new AuthenticationError(error.message));
      }
      return ok(data.session);
    } catch (e) {
      return err(new AuthenticationError(e instanceof Error ? e.message : 'Session refresh failed'));
    }
  }

  public async resolveRequestContext(req: NextRequest): Promise<RequestContext> {
    const { data: { user } } = await supabase.auth.getUser();
    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((val, key) => { headers[key] = val; });

    if (!user) {
      return createRequestContext(null, headers);
    }

    const role = (user.user_metadata?.role as 'user' | 'organizer' | 'admin') || 'user';
    const userDTO = {
      id: user.id,
      email: user.email || null,
      fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      avatarUrl: user.user_metadata?.avatar_url || null,
      role
    };

    return createRequestContext(userDTO, headers);
  }
}
