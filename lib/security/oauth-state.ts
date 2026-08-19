import crypto from 'crypto';
import { NextResponse } from 'next/server';

export const GITHUB_OAUTH_STATE_COOKIE = 'findathon_github_oauth_state';
const STATE_MAX_AGE_SECONDS = 600; // 10 minutes

/**
 * Generates a cryptographically random UUID for CSRF state validation.
 */
export function generateOAuthState(): string {
  return crypto.randomUUID();
}

/**
 * Sets the OAuth CSRF state in a secure, HTTP-only cookie.
 */
export function setOAuthStateCookie(res: NextResponse, state: string): void {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookies.set({
    name: GITHUB_OAUTH_STATE_COOKIE,
    value: state,
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: STATE_MAX_AGE_SECONDS
  });
}

/**
 * Clears the OAuth state cookie after verification.
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
 * Validates the returned OAuth state against the stored cookie state.
 */
export function verifyOAuthState(cookieState: string | undefined, returnedState: string | null): boolean {
  if (!cookieState || !returnedState) return false;
  return cookieState === returnedState;
}
