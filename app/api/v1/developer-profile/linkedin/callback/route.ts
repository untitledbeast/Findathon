import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { createRequestContext } from '@/lib/context/request-context';
import { createDeveloperProfileCommandService } from '@/lib/services/factories';
import {
  getLinkedInOAuthTransaction,
  clearLinkedInOAuthCookie,
  sanitizeReturnUrl
} from '@/lib/security/linkedin-oidc';
import { LinkedInAccountConflictError } from '@/lib/errors/linkedin.errors';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const returnedState = searchParams.get('state');
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // 1. Handle LinkedIn provider error or user cancellation
  if (errorParam) {
    console.error('[LinkedIn OIDC Callback] Provider error returned:', errorParam, errorDescription);
    const isUserCancel = errorParam === 'user_cancelled_authorize' || errorParam === 'access_denied';
    const message = isUserCancel
      ? 'LinkedIn connection was cancelled.'
      : (errorDescription || 'LinkedIn authorization failed.');

    const redirectRes = NextResponse.redirect(
      new URL(`/account?tab=intelligence&linkedin_error=${encodeURIComponent(message)}`, baseUrl)
    );
    clearLinkedInOAuthCookie(redirectRes);
    return redirectRes;
  }

  // 2. Retrieve & decrypt OAuth transaction from HttpOnly cookie
  const transaction = getLinkedInOAuthTransaction(req);
  if (!transaction) {
    console.error('[LinkedIn OIDC Callback] Transaction cookie missing or expired');
    const redirectRes = NextResponse.redirect(
      new URL('/account?tab=intelligence&linkedin_error=Invalid+or+expired+OAuth+session.+Please+try+connecting+again.', baseUrl)
    );
    clearLinkedInOAuthCookie(redirectRes);
    return redirectRes;
  }

  // 3. Validate state matching
  if (!returnedState || transaction.state !== returnedState) {
    console.error('[LinkedIn OIDC Callback] State mismatch between transaction and callback');
    const redirectRes = NextResponse.redirect(
      new URL('/account?tab=intelligence&linkedin_error=OAuth+state+validation+failed.+Please+try+again.', baseUrl)
    );
    clearLinkedInOAuthCookie(redirectRes);
    return redirectRes;
  }

  if (!code) {
    const redirectRes = NextResponse.redirect(
      new URL('/account?tab=intelligence&linkedin_error=Missing+authorization+code+from+LinkedIn.', baseUrl)
    );
    clearLinkedInOAuthCookie(redirectRes);
    return redirectRes;
  }

  const returnTarget = sanitizeReturnUrl(transaction.returnPath);

  try {
    // 4. Authenticate current user session
    const user = await AuthService.getUser();
    if (!user || !user.id) {
      const redirectRes = NextResponse.redirect(
        new URL('/account?tab=intelligence&linkedin_error=Authentication+required.+Please+log+in+and+try+again.', baseUrl)
      );
      clearLinkedInOAuthCookie(redirectRes);
      return redirectRes;
    }

    // 5. Build request context
    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const context = createRequestContext(user, headers);

    // 6. Execute complete LinkedIn connect workflow (token exchange, ID token verification, userinfo, conflict check, persistence, recompute)
    const commandService = createDeveloperProfileCommandService();
    await commandService.connectLinkedIn(context, code, transaction);

    const redirectUrl = new URL(returnTarget, baseUrl);
    redirectUrl.searchParams.set('linkedin', 'connected');

    const redirectRes = NextResponse.redirect(redirectUrl);
    clearLinkedInOAuthCookie(redirectRes);
    return redirectRes;
  } catch (err: unknown) {
    console.error('[LinkedIn OIDC Callback] Connection failed:', err);

    let message = 'Failed to connect LinkedIn account. Please try again.';
    if (err instanceof LinkedInAccountConflictError) {
      message = err.message;
    } else if (err instanceof Error) {
      message = err.message;
    }

    const redirectUrl = new URL(returnTarget, baseUrl);
    redirectUrl.searchParams.set('linkedin_error', message);

    const redirectRes = NextResponse.redirect(redirectUrl);
    clearLinkedInOAuthCookie(redirectRes);
    return redirectRes;
  }
}
