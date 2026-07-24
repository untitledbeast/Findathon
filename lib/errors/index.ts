import { ERROR_CODES, ErrorCode } from '@/constants/error-codes';

export class BaseError extends Error {
  constructor(
    public override message: string,
    public code: ErrorCode | string = ERROR_CODES.INTERNAL_ERROR,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, details?: unknown) {
    super(message, ERROR_CODES.VALIDATION_ERROR, 400, details);
  }
}

export class AuthenticationError extends BaseError {
  constructor(message = 'Authentication required') {
    super(message, ERROR_CODES.UNAUTHENTICATED, 401);
  }
}

export class PermissionError extends BaseError {
  constructor(message = 'Permission denied') {
    super(message, ERROR_CODES.FORBIDDEN, 403);
  }
}

export class NotFoundError extends BaseError {
  constructor(message = 'Resource not found') {
    super(message, ERROR_CODES.NOT_FOUND, 404);
  }
}

export class ConflictError extends BaseError {
  constructor(message: string, code: ErrorCode | string = ERROR_CODES.REVIEW_EXISTS) {
    super(message, code, 409);
  }
}

export class RateLimitError extends BaseError {
  constructor(message = 'Rate limit exceeded') {
    super(message, ERROR_CODES.RATE_LIMITED, 429);
  }
}

export class DatabaseError extends BaseError {
  constructor(message = 'Database operation failed') {
    super(message, ERROR_CODES.DATABASE_ERROR, 500);
  }
}

export function formatError(err: unknown) {
  if (err instanceof BaseError) {
    return {
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      details: err.details
    };
  }

  return {
    message: err instanceof Error ? err.message : 'An unexpected error occurred',
    code: ERROR_CODES.INTERNAL_ERROR,
    statusCode: 500
  };
}
