export function generateTraceId(): string {
  return `tr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

export function generateRequestId(): string {
  return `req_${Math.random().toString(36).substring(2, 10)}`;
}
