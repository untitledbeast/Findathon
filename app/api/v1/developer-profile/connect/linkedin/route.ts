import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { createLinkedInProvider } from '@/lib/services/factories';
import {
  generateOAuthState,
  generateOAuthNonce,
  generateCodeVerifier,
  setLinkedInOAuthCookie,
  sanitizeReturnUrl,
  LINKEDIN_TRANSACTION_TTL_SECONDS
} from '@/lib/security/linkedin-oidc';
import { formatError } from '@/lib/transport/api-response';
import { AuthenticationError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    if (!user || !user.id) {
      return formatError(new AuthenticationError('Authentication required to connect LinkedIn'));
    }

    const { searchParams } = new URL(req.url);
    const returnTo = sanitizeReturnUrl(searchParams.get('returnTo'));

    // 1. Generate cryptographic state, PKCE code verifier, and OIDC nonce
    const state = generateOAuthState();
    const nonce = generateOAuthNonce();
    const codeVerifier = generateCodeVerifier();

    const now = Date.now();
    const transaction = {
      state,
      codeVerifier,
      nonce,
      userId: user.id,
      issuedAt: now,
      expiresAt: now + LINKEDIN_TRANSACTION_TTL_SECONDS * 1000,
      returnPath: returnTo
    };

    // 2. Build authorization URL
    const provider = createLinkedInProvider();
    const authUrl = provider.buildAuthUrl(transaction);

    // 3. Return auth URL and attach secure encrypted HttpOnly cookie
    const response = NextResponse.json({ success: true, data: { authUrl } });
    setLinkedInOAuthCookie(response, transaction);

    return response;
  } catch (error) {
    return formatError(error as Error);
  }
}
