import { BaseError } from './base.error';

export class GitHubRateLimitError extends BaseError {
  constructor(
    message = 'GitHub is rate-limiting us. Please try again in a few minutes.',
    details?: unknown
  ) {
    super(message, 'GITHUB_RATE_LIMITED', 429, details);
  }
}

export class GitHubOAuthError extends BaseError {
  constructor(
    message = 'GitHub OAuth authentication failed',
    details?: unknown
  ) {
    super(message, 'GITHUB_OAUTH_ERROR', 400, details);
  }
}

export class GitHubApiError extends BaseError {
  constructor(
    message = 'GitHub API request failed',
    statusCode = 502,
    details?: unknown
  ) {
    super(message, 'GITHUB_API_ERROR', statusCode, details);
  }
}
