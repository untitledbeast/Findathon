import { BaseError } from './base.error';

export class LinkedInOAuthError extends BaseError {
  constructor(
    message = 'LinkedIn OAuth authentication failed',
    details?: unknown
  ) {
    super(message, 'LINKEDIN_OAUTH_ERROR', 400, details);
  }
}

export class LinkedInApiError extends BaseError {
  constructor(
    message = 'LinkedIn API request failed',
    statusCode = 502,
    details?: unknown
  ) {
    super(message, 'LINKEDIN_API_ERROR', statusCode, details);
  }
}

export class LinkedInNotConfiguredError extends BaseError {
  constructor(
    message = 'LinkedIn OAuth is not configured. Missing LINKEDIN_CLIENT_ID or LINKEDIN_CLIENT_SECRET.',
    details?: unknown
  ) {
    super(message, 'LINKEDIN_NOT_CONFIGURED', 500, details);
  }
}
