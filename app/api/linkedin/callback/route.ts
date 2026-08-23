import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { createRequestContext } from '@/lib/context/request-context';
import { createDeveloperProfileCommandService } from '@/lib/services/factories';
import {
  LINKEDIN_OAUTH_STATE_COOKIE,
  verifySignedOAuthState,
  clearLinkedInOAuthStateCookie
} from '@/lib/security/oauth-state';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const returnedState = searchParams.get('state');
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // 1. Handle user cancellation or provider errors from LinkedIn
  if (errorParam) {
    console.warn('[LinkedIn OAuth Callback] Provider returned error:', {
      provider: 'linkedin',
      error: errorParam,
      timestamp: new Date().toISOString()
    });

    const friendlyMessage = errorParam === 'user_cancelled_authorize' || errorParam === 'access_denied'
      ? 'LinkedIn authorization was cancelled.'
      : (errorDescription || errorParam);

    const redirectRes = NextResponse.redirect(
      new URL(`/account?tab=intelligence&linkedin_error=${encodeURIComponent(friendlyMessage)}`, baseUrl)
    );
    clearLinkedInOAuthStateCookie(redirectRes);
    return redirectRes;
  }

  // 2. Verify authenticated Findathon session first for user binding
  const user = await AuthService.getUser();
  if (!user) {
    console.warn('[LinkedIn OAuth Callback] Authentication session missing during callback', {
      provider: 'linkedin',
      timestamp: new Date().toISOString()
    });
    const redirectRes = NextResponse.redirect(
      new URL('/account?tab=intelligence&linkedin_error=Authentication+required.+Please+log+in+and+try+again.', baseUrl)
    );
    clearLinkedInOAuthStateCookie(redirectRes);
    return redirectRes;
  }

  // 3. Validate CSRF state token with timing-safe check, user binding & expiration
  const cookieState = req.cookies.get(LINKEDIN_OAUTH_STATE_COOKIE)?.value;
  const stateCheck = verifySignedOAuthState(cookieState, returnedState, user.id);

  if (!stateCheck.isValid) {
    console.warn('[LinkedIn OAuth Callback] OAuth state validation failed (security event)', {
      provider: 'linkedin',
      reason: stateCheck.error || 'mismatch',
      timestamp: new Date().toISOString()
    });

    const redirectRes = NextResponse.redirect(
      new URL(`/account?tab=intelligence&linkedin_error=${encodeURIComponent(stateCheck.error || 'Invalid or expired OAuth session. Please try connecting again.')}`, baseUrl)
    );
    clearLinkedInOAuthStateCookie(redirectRes);
    return redirectRes;
  }

  // 4. Validate presence of authorization code
  if (!code) {
    const redirectRes = NextResponse.redirect(
      new URL('/account?tab=intelligence&linkedin_error=Missing+authorization+code+from+LinkedIn', baseUrl)
    );
    clearLinkedInOAuthStateCookie(redirectRes);
    return redirectRes;
  }

  try {
    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const context = createRequestContext(user, headers);

    // 5. Perform server-side token exchange, userinfo profile fetch, and Supabase persistence
    const commandService = createDeveloperProfileCommandService();
    await commandService.connectLinkedIn(context, code);

    // 6. Redirect back to Developer Intelligence dashboard with success indicator (and invalidate/clear state cookie)
    const redirectRes = NextResponse.redirect(
      new URL('/account?tab=intelligence&linkedin=connected', baseUrl)
    );
    clearLinkedInOAuthStateCookie(redirectRes);
    return redirectRes;
  } catch (err) {
    console.error('[LinkedIn OAuth Callback] Connect failed:', err instanceof Error ? err.message : 'Unknown error');
    const message = err instanceof Error ? err.message : 'Failed to connect LinkedIn account';
    const redirectRes = NextResponse.redirect(
      new URL(`/account?tab=intelligence&linkedin_error=${encodeURIComponent(message)}`, baseUrl)
    );
    clearLinkedInOAuthStateCookie(redirectRes);
    return redirectRes;
  }
}
