import crypto from 'crypto';
import { NextResponse } from 'next/server';

export const GITHUB_OAUTH_STATE_COOKIE = 'findathon_github_oauth_state';
export const LINKEDIN_OAUTH_STATE_COOKIE = 'findathon_linkedin_oauth_state';
const STATE_MAX_AGE_SECONDS = 900; // 15 minutes

export interface OAuthStatePayload {
  state: string;
  userId: string;
  expiresAt: number;
}

/**
 * Derives a signing key for HMAC state verification.
 */
function getStateSecret(): string {
  return (
    process.env.ENCRYPTION_KEY ||
    process.env.TOKEN_ENCRYPTION_KEY ||
    process.env.SUPABASE_JWT_SECRET ||
    'findathon-oauth-state-signing-secret-default-32'
  );
}

/**
 * Signs a state payload with HMAC-SHA256.
 */
function signPayload(payloadStr: string): string {
  const secret = getStateSecret();
  return crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');
}

/**
 * Generates a cryptographically random UUID for CSRF state validation.
 */
export function generateOAuthState(): string {
  return crypto.randomUUID();
}

/**
 * Creates a signed OAuth state token containing state, userId, and expiration timestamp.
 */
export function createSignedOAuthState(state: string, userId: string): string {
  const payload: OAuthStatePayload = {
    state,
    userId,
    expiresAt: Date.now() + STATE_MAX_AGE_SECONDS * 1000
  };
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = signPayload(payloadBase64);
  return `${payloadBase64}.${signature}`;
}

/**
 * Verifies a signed OAuth state token using timing-safe comparison.
 */
export function verifySignedOAuthState(
  cookieToken: string | undefined,
  returnedState: string | null,
  currentUserId?: string
): { isValid: boolean; error?: string } {
  if (!cookieToken || !returnedState) {
    return { isValid: false, error: 'Missing OAuth state token in cookie or request parameter.' };
  }

  // Handle plain state legacy fallback
  if (!cookieToken.includes('.')) {
    const isMatch = constantTimeCompare(cookieToken, returnedState);
    if (!isMatch) {
      return { isValid: false, error: 'OAuth state token mismatch.' };
    }
    return { isValid: true };
  }

  const [payloadBase64, signature] = cookieToken.split('.');
  if (!payloadBase64 || !signature) {
    return { isValid: false, error: 'Malformed OAuth state token.' };
  }

  // 1. Verify HMAC signature (timing-safe)
  const expectedSignature = signPayload(payloadBase64);
  if (!constantTimeCompare(signature, expectedSignature)) {
    return { isValid: false, error: 'OAuth state signature verification failed (tampering detected).' };
  }

  // 2. Decode payload
  try {
    const jsonStr = Buffer.from(payloadBase64, 'base64url').toString('utf8');
    const payload: OAuthStatePayload = JSON.parse(jsonStr);

    // 3. Verify state value (timing-safe)
    if (!constantTimeCompare(payload.state, returnedState)) {
      return { isValid: false, error: 'OAuth state value mismatch.' };
    }

    // 4. Verify expiration
    if (Date.now() > payload.expiresAt) {
      return { isValid: false, error: 'OAuth session has expired. Please try connecting again.' };
    }

    // 5. Verify user ID binding if provided
    if (currentUserId && payload.userId && payload.userId !== currentUserId) {
      return { isValid: false, error: 'OAuth session was initiated by a different user.' };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Failed to parse OAuth state payload.' };
  }
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Legacy state verification helper (maintains backwards compatibility).
 */
export function verifyOAuthState(cookieState: string | undefined, returnedState: string | null): boolean {
  return verifySignedOAuthState(cookieState, returnedState).isValid;
}

/**
 * Sets the GitHub OAuth CSRF state in a secure, HTTP-only cookie.
 */
export function setOAuthStateCookie(res: NextResponse, state: string, userId?: string): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const token = userId ? createSignedOAuthState(state, userId) : state;
  res.cookies.set({
    name: GITHUB_OAUTH_STATE_COOKIE,
    value: token,
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: STATE_MAX_AGE_SECONDS
  });
}

/**
 * Clears the GitHub OAuth state cookie after verification (prevents replay attacks).
 */
export function clearOAuthStateCookie(res: NextResponse): void {
  res.cookies.set({
    name: GITHUB_OAUTH_STATE_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });
}

/**
 * Sets the LinkedIn OAuth CSRF state in a secure, HTTP-only cookie.
 */
export function setLinkedInOAuthStateCookie(res: NextResponse, state: string, userId?: string): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const token = userId ? createSignedOAuthState(state, userId) : state;
  res.cookies.set({
    name: LINKEDIN_OAUTH_STATE_COOKIE,
    value: token,
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: STATE_MAX_AGE_SECONDS
  });
}

/**
 * Clears the LinkedIn OAuth state cookie after verification (prevents replay attacks).
 */
export function clearLinkedInOAuthStateCookie(res: NextResponse): void {
  res.cookies.set({
    name: LINKEDIN_OAUTH_STATE_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });
}
