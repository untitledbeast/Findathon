import { ApiResponse } from '@/types';

export class ApiError extends Error {
  constructor(public message: string, public code?: string, public statusCode: number = 500) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const config: RequestInit = {
    ...options,
    headers
  };

  const response = await fetch(endpoint, config);
  const data: ApiResponse<T> = await response.json().catch(() => ({ error: 'Invalid JSON response' }));

  if (!response.ok || data.error) {
    throw new ApiError(data.error || 'API request failed', data.code, response.status);
  }

  return data.data as T;
}
