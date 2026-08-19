import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { createRequestContext } from '@/lib/context/request-context';
import { createDeveloperProfileCommandService } from '@/lib/services/factories';
import { GITHUB_OAUTH_STATE_COOKIE, verifyOAuthState, clearOAuthStateCookie } from '@/lib/security/oauth-state';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const returnedState = searchParams.get('state');
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  if (errorParam) {
    console.error('[GitHub OAuth Callback] OAuth provider error:', errorParam, errorDescription);
    const redirectRes = NextResponse.redirect(
      new URL(`/account?tab=intelligence&github_error=${encodeURIComponent(errorDescription || errorParam)}`, baseUrl)
    );
    clearOAuthStateCookie(redirectRes);
    return redirectRes;
  }

  // 1. Verify CSRF OAuth State
  const cookieState = req.cookies.get(GITHUB_OAUTH_STATE_COOKIE)?.value;
  const isStateValid = verifyOAuthState(cookieState, returnedState);

  if (!isStateValid) {
    console.error('[GitHub OAuth Callback] CSRF State mismatch or missing');
    const redirectRes = NextResponse.redirect(
      new URL('/account?tab=intelligence&github_error=Invalid+or+expired+OAuth+session.+Please+try+connecting+again.', baseUrl)
    );
    clearOAuthStateCookie(redirectRes);
    return redirectRes;
  }

  if (!code) {
    const redirectRes = NextResponse.redirect(
      new URL('/account?tab=intelligence&github_error=Missing+authorization+code+from+GitHub', baseUrl)
    );
    clearOAuthStateCookie(redirectRes);
    return redirectRes;
  }

  try {
    const user = await AuthService.getUser();
    if (!user) {
      const redirectRes = NextResponse.redirect(
        new URL('/account?tab=intelligence&github_error=Authentication+required.+Please+log+in+and+try+again.', baseUrl)
      );
      clearOAuthStateCookie(redirectRes);
      return redirectRes;
    }

    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const context = createRequestContext(user, headers);

    // 2. Perform complete connect flow (exchange, token encrypt, capped 40 repos fetch, evidence upsert, aggregate)
    const commandService = createDeveloperProfileCommandService();
    await commandService.connectGitHub(context, code);

    const redirectRes = NextResponse.redirect(
      new URL('/account?tab=intelligence&github=connected', baseUrl)
    );
    clearOAuthStateCookie(redirectRes);
    return redirectRes;
  } catch (err) {
    console.error('[GitHub OAuth Callback] Connect failed:', err);
    const message = err instanceof Error ? err.message : 'Failed to connect GitHub account';
    const redirectRes = NextResponse.redirect(
      new URL(`/account?tab=intelligence&github_error=${encodeURIComponent(message)}`, baseUrl)
    );
    clearOAuthStateCookie(redirectRes);
    return redirectRes;
  }
}
