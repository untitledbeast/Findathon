import { applyTraceHeaders } from './trace-interceptor';
import { fetchWithRetry } from './retry-interceptor';
import { ApiResponse } from './api-response';

export class TransportError extends Error {
  constructor(
    message: string,
    public code: string = 'TRANSPORT_ERROR',
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'TransportError';
  }
}

export async function transportClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {})
  };

  const headers = applyTraceHeaders(baseHeaders);

  const config: RequestInit = {
    ...options,
    headers
  };

  const response = await fetchWithRetry(endpoint, config);
  const data: ApiResponse<T> = await response.json().catch(() => ({
    success: false,
    error: {
      name: 'ParseError',
      message: 'Invalid JSON response from server',
      statusCode: 500,
      code: 'INVALID_JSON'
    }
  }));

  if (!response.ok || !data.success || data.error) {
    const errMessage = data.error?.message || 'API request failed';
    const errCode = data.error?.code || 'API_ERROR';
    const statusCode = data.error?.statusCode || response.status || 500;
    throw new TransportError(errMessage, errCode, statusCode);
  }

  return data.data as T;
}
