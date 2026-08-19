import { BaseError } from './base.error';

export class LeetCodeUserNotFoundError extends BaseError {
  constructor(username: string, details?: unknown) {
    super(
      `LeetCode username not found. Check spelling.`,
      'LEETCODE_USER_NOT_FOUND',
      404,
      { username, ...(details && typeof details === 'object' ? details : {}) }
    );
  }
}

export class LeetCodeProfilePrivateError extends BaseError {
  constructor(username: string, details?: unknown) {
    super(
      `This profile is private. Make it public in LeetCode settings.`,
      'LEETCODE_PROFILE_PRIVATE',
      403,
      { username, ...(details && typeof details === 'object' ? details : {}) }
    );
  }
}

export class LeetCodeRateLimitError extends BaseError {
  constructor(details?: unknown) {
    super(
      'LeetCode is rate-limiting us. Try again in 5 minutes.',
      'LEETCODE_RATE_LIMITED',
      429,
      details
    );
  }
}

export class LeetCodeNetworkError extends BaseError {
  constructor(details?: unknown) {
    super(
      'Could not reach LeetCode. Check your internet connection.',
      'LEETCODE_NETWORK_ERROR',
      503,
      details
    );
  }
}

export class LeetCodeApiError extends BaseError {
  constructor(message = 'LeetCode API request failed', statusCode = 502, details?: unknown) {
    super(message, 'LEETCODE_API_ERROR', statusCode, details);
  }
}

export class LeetCodeSyncCooldownError extends BaseError {
  constructor(remainingSeconds?: number) {
    super(
      'Please wait 60 seconds before syncing again.',
      'LEETCODE_SYNC_COOLDOWN',
      429,
      { remainingSeconds }
    );
  }
}
