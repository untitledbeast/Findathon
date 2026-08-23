import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { encryptToken, decryptToken } from './token-encryption';
import { LinkedInOidcValidationError } from '../errors/linkedin.errors';

export const LINKEDIN_OAUTH_COOKIE = 'findathon_linkedin_oauth_state';
export const LINKEDIN_TRANSACTION_TTL_SECONDS = 600; // 10 minutes

// Official LinkedIn OIDC Endpoints & Metadata
export const LINKEDIN_OIDC_CONFIG = {
  issuer: 'https://www.linkedin.com',
  fallbackIssuer: 'https://www.linkedin.com/oauth',
  authorizationEndpoint: 'https://www.linkedin.com/oauth/v2/authorization',
  tokenEndpoint: 'https://www.linkedin.com/oauth/v2/accessToken',
  userinfoEndpoint: 'https://api.linkedin.com/v2/userinfo',
  jwksUri: 'https://www.linkedin.com/oauth/openid/jwks'
};

export interface LinkedInOAuthTransaction {
  state: string;
  codeVerifier: string;
  nonce: string;
  userId: string;
  issuedAt: number;
  expiresAt: number;
  returnPath?: string;
}

export interface ValidatedLinkedInIdToken extends JWTPayload {
  sub: string;
  nonce?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email?: string;
  email_verified?: boolean;
  locale?: {
    country?: string;
    language?: string;
  };
}

// Cached Remote JWKS instance with automatic key rotation support
let remoteJWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!remoteJWKS) {
    remoteJWKS = createRemoteJWKSet(new URL(LINKEDIN_OIDC_CONFIG.jwksUri), {
      cooldownDuration: 30000, // 30s cache cooldown
      timeoutDuration: 5000    // 5s network timeout
    });
  }
  return remoteJWKS;
}

/**
 * Generates high-entropy PKCE code_verifier (43-128 chars base64url).
 */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Derives PKCE code_challenge using SHA-256 (S256).
 */
export function deriveCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

/**
 * Generates cryptographically secure random state UUID.
 */
export function generateOAuthState(): string {
  return crypto.randomUUID();
}

/**
 * Generates cryptographically secure random nonce for OIDC.
 */
export function generateOAuthNonce(): string {
  return crypto.randomBytes(16).toString('base64url');
}

/**
 * Encrypts and sets the OAuth transaction payload in an HttpOnly cookie.
 */
export function setLinkedInOAuthCookie(res: NextResponse, transaction: LinkedInOAuthTransaction): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const serialized = JSON.stringify(transaction);
  const encrypted = encryptToken(serialized);

  res.cookies.set({
    name: LINKEDIN_OAUTH_COOKIE,
    value: encrypted,
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: LINKEDIN_TRANSACTION_TTL_SECONDS
  });
}

/**
 * Decrypts and validates the OAuth transaction from the incoming request cookie.
 */
export function getLinkedInOAuthTransaction(req: NextRequest): LinkedInOAuthTransaction | null {
  const cookieValue = req.cookies.get(LINKEDIN_OAUTH_COOKIE)?.value;
  if (!cookieValue) return null;

  try {
    const decrypted = decryptToken(cookieValue);
    if (!decrypted) return null;

    const parsed = JSON.parse(decrypted) as LinkedInOAuthTransaction;
    if (!parsed.state || !parsed.nonce || !parsed.userId || !parsed.expiresAt) {
      return null;
    }

    if (Date.now() > parsed.expiresAt) {
      return null; // Expired transaction
    }

    return parsed;
  } catch (err) {
    console.error('[LinkedIn OIDC] Failed to decrypt OAuth transaction cookie:', err);
    return null;
  }
}

/**
 * Clears the LinkedIn OAuth state cookie.
 */
export function clearLinkedInOAuthCookie(res: NextResponse): void {
  res.cookies.set({
    name: LINKEDIN_OAUTH_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });
}

/**
 * Validates the LinkedIn OIDC ID Token against official JWKS, issuer, audience, and nonce.
 */
export async function validateLinkedInIdToken(
  idToken: string,
  expectedNonce: string,
  clientId: string,
  customJWKS?: ReturnType<typeof createRemoteJWKSet>
): Promise<ValidatedLinkedInIdToken> {
  if (!idToken || typeof idToken !== 'string') {
    throw new LinkedInOidcValidationError('Missing or malformed ID token');
  }

  try {
    const JWKS = customJWKS || getJWKS();

    // Verify RS256 signature, expiration, and audience
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: [LINKEDIN_OIDC_CONFIG.issuer, LINKEDIN_OIDC_CONFIG.fallbackIssuer],
      audience: clientId,
      algorithms: ['RS256'],
      clockTolerance: 60 // 60 seconds clock skew allowance
    });

    // Validate subject claim
    if (!payload.sub || typeof payload.sub !== 'string' || !payload.sub.trim()) {
      throw new LinkedInOidcValidationError('ID token is missing valid subject (sub) claim');
    }

    // Validate nonce claim
    if (payload.nonce && payload.nonce !== expectedNonce) {
      throw new LinkedInOidcValidationError('ID token nonce mismatch', {
        expected: expectedNonce,
        received: payload.nonce
      });
    }

    return payload as ValidatedLinkedInIdToken;
  } catch (err) {
    if (err instanceof LinkedInOidcValidationError) throw err;
    const message = err instanceof Error ? err.message : 'ID token signature or claims validation failed';
    throw new LinkedInOidcValidationError(message, err);
  }
}

/**
 * Sanitizes return URLs to prevent open redirect vulnerabilities.
 */
export function sanitizeReturnUrl(returnTo?: string | null): string {
  const defaultPath = '/account?tab=intelligence';
  if (!returnTo || typeof returnTo !== 'string') return defaultPath;

  const trimmed = returnTo.trim();
  // Allow only internal paths starting with a single '/'
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\') && !trimmed.includes(':')) {
    return trimmed;
  }

  return defaultPath;
}
