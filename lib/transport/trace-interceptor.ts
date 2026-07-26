export function applyTraceHeaders(headers: Record<string, string>): Record<string, string> {
  const reqId = `req_${Math.random().toString(36).substring(2, 10)}`;
  const traceId = `trace_${Math.random().toString(36).substring(2, 12)}`;
  return {
    ...headers,
    'x-request-id': headers['x-request-id'] || reqId,
    'x-trace-id': headers['x-trace-id'] || traceId,
  };
}
