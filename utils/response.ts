import { NextResponse } from 'next/server';
import { ERROR_CODES, ErrorCode } from '@/constants/error-codes';

export interface ApiResponseOptions<T> {
  data?: T;
  meta?: Record<string, unknown>;
  error?: {
    code: ErrorCode | string;
    message: string;
  };
  requestId?: string;
  traceId?: string;
  status?: number;
}

export function createApiResponse<T>({
  data,
  meta,
  error,
  requestId = 'req_default',
  traceId = 'trace_default',
  status = 200
}: ApiResponseOptions<T>) {
  const payload = {
    success: !error,
    data: data ?? null,
    meta: meta ?? {},
    error: error ?? null,
    requestId,
    traceId,
    timestamp: new Date().toISOString()
  };

  return NextResponse.json(payload, { status });
}

export const ok = <T>(data: T, meta?: Record<string, unknown>, requestId?: string, traceId?: string) =>
  createApiResponse({ data, meta, requestId, traceId, status: 200 });

export const created = <T>(data: T, meta?: Record<string, unknown>, requestId?: string, traceId?: string) =>
  createApiResponse({ data, meta, requestId, traceId, status: 201 });

export const badRequest = (message: string, code: ErrorCode | string = ERROR_CODES.VALIDATION_ERROR, requestId?: string, traceId?: string) =>
  createApiResponse({ error: { code, message }, requestId, traceId, status: 400 });

export const unauthorized = (message = 'Authentication required', code: ErrorCode | string = ERROR_CODES.UNAUTHENTICATED, requestId?: string, traceId?: string) =>
  createApiResponse({ error: { code, message }, requestId, traceId, status: 401 });

export const forbidden = (message = 'Permission denied', code: ErrorCode | string = ERROR_CODES.FORBIDDEN, requestId?: string, traceId?: string) =>
  createApiResponse({ error: { code, message }, requestId, traceId, status: 403 });

export const notFound = (message = 'Resource not found', code: ErrorCode | string = ERROR_CODES.NOT_FOUND, requestId?: string, traceId?: string) =>
  createApiResponse({ error: { code, message }, requestId, traceId, status: 404 });

export const conflict = (message: string, code: ErrorCode | string = ERROR_CODES.REVIEW_EXISTS, requestId?: string, traceId?: string) =>
  createApiResponse({ error: { code, message }, requestId, traceId, status: 409 });

export const rateLimited = (message = 'Rate limit exceeded', code: ErrorCode | string = ERROR_CODES.RATE_LIMITED, requestId?: string, traceId?: string) =>
  createApiResponse({ error: { code, message }, requestId, traceId, status: 429 });

export const serverError = (message = 'Internal server error', code: ErrorCode | string = ERROR_CODES.INTERNAL_ERROR, requestId?: string, traceId?: string) =>
  createApiResponse({ error: { code, message }, requestId, traceId, status: 500 });
