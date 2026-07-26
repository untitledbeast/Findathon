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
