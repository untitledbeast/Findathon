import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { createGitHubProvider } from '@/lib/services/factories';
import { generateOAuthState, setOAuthStateCookie } from '@/lib/security/oauth-state';
import { formatError } from '@/lib/transport/api-response';
import { AuthenticationError } from '@/lib/errors';

export async function GET() {
  try {
    const user = await AuthService.getUser();
    if (!user) {
      return formatError(new AuthenticationError('Authentication required to connect GitHub'));
    }

    // 1. Generate CSRF state token
    const state = generateOAuthState();

    // 2. Build authorization URL
    const provider = createGitHubProvider();
    const authUrl = provider.buildAuthUrl(state);

    // 3. Return auth URL and attach secure HTTP-only state cookie
    const response = NextResponse.json({ success: true, data: { authUrl } });
    setOAuthStateCookie(response, state);

    return response;
  } catch (error) {
    return formatError(error as Error);
  }
}
