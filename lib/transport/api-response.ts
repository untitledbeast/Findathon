import { BaseError } from '@/lib/errors';

export interface ApiResponseMeta {
  total?: number;
  page?: number;
  pageSize?: number;
  cursor?: string;
  took?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: BaseError;
  meta?: ApiResponseMeta;
}

import { NextResponse } from 'next/server';
import { formatError as baseFormatError } from '@/lib/errors';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatResponse(data: any) {
  return NextResponse.json({ success: true, data, ...data?.meta });
}

export function formatError(error: Error | BaseError) {
  const formatted = baseFormatError(error);
  return NextResponse.json({ success: false, error: formatted }, { status: formatted.statusCode || 500 });
}
