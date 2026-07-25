import { RateLimitError } from '../errors';

const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();

export function checkRateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.expiresAt) {
    rateLimitMap.set(key, { count: 1, expiresAt: now + windowMs });
    return;
  }

  if (entry.count >= limit) {
    throw new RateLimitError(`Rate limit exceeded. Please try again later.`);
  }

  entry.count += 1;
}
