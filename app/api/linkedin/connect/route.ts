import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { createLinkedInProvider } from '@/lib/services/factories';
import { generateOAuthState, setLinkedInOAuthStateCookie } from '@/lib/security/oauth-state';
import { formatError } from '@/lib/transport/api-response';
import { AuthenticationError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    if (!user) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const acceptHeader = req.headers.get('accept') || '';
      if (!acceptHeader.includes('application/json')) {
        return NextResponse.redirect(
          new URL('/account?tab=intelligence&linkedin_error=Authentication+required+to+connect+LinkedIn', baseUrl)
        );
      }
      return formatError(new AuthenticationError('Authentication required to connect LinkedIn'));
    }

    // 1. Generate cryptographically secure CSRF state token
    const state = generateOAuthState();

    // 2. Build LinkedIn OpenID Connect authorization URL
    const provider = createLinkedInProvider();
    const authUrl = provider.buildAuthUrl(state);

    // 3. Return auth URL or redirect with secure HTTP-only state cookie
    const acceptHeader = req.headers.get('accept') || '';
    if (acceptHeader.includes('application/json')) {
      const response = NextResponse.json({ success: true, data: { authUrl } });
      setLinkedInOAuthStateCookie(response, state, user.id);
      return response;
    }

    const response = NextResponse.redirect(authUrl);
    setLinkedInOAuthStateCookie(response, state, user.id);
    return response;
  } catch (error) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const acceptHeader = req.headers.get('accept') || '';
    const message = error instanceof Error ? error.message : 'Failed to initialize LinkedIn OAuth flow';

    if (!acceptHeader.includes('application/json')) {
      return NextResponse.redirect(
        new URL(`/account?tab=intelligence&linkedin_error=${encodeURIComponent(message)}`, baseUrl)
      );
    }
    return formatError(error as Error);
  }
}
