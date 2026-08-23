import { BaseError } from './base.error';

export class LinkedInConfigError extends BaseError {
  constructor(
    message = 'LinkedIn OAuth is not configured: LINKEDIN_CLIENT_ID or LINKEDIN_CLIENT_SECRET is missing in environment variables.',
    details?: unknown
  ) {
    super(message, 'LINKEDIN_CONFIG_ERROR', 500, details);
  }
}

export class LinkedInOAuthError extends BaseError {
  constructor(
    message = 'LinkedIn OAuth authentication failed',
    statusCode = 400,
    details?: unknown
  ) {
    super(message, 'LINKEDIN_OAUTH_ERROR', statusCode, details);
  }
}

export class LinkedInTokenExchangeError extends BaseError {
  constructor(
    message = 'Failed to exchange authorization code with LinkedIn',
    statusCode = 502,
    details?: unknown
  ) {
    super(message, 'LINKEDIN_TOKEN_EXCHANGE_FAILED', statusCode, details);
  }
}

export class LinkedInOidcValidationError extends BaseError {
  constructor(
    message = 'LinkedIn OpenID Connect identity token validation failed',
    details?: unknown
  ) {
    super(message, 'LINKEDIN_ID_TOKEN_INVALID', 401, details);
  }
}

export class LinkedInAccountConflictError extends BaseError {
  constructor(
    message = 'This LinkedIn account is already connected to another Findathon account.',
    details?: unknown
  ) {
    super(message, 'LINKEDIN_ACCOUNT_CONFLICT', 409, details);
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

export class LinkedInRateLimitError extends BaseError {
  constructor(
    message = 'LinkedIn is rate-limiting requests. Please try again in a few minutes.',
    details?: unknown
  ) {
    super(message, 'LINKEDIN_RATE_LIMITED', 429, details);
  }
}
