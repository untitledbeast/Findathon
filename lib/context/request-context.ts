import { UserDTO } from '@/lib/auth/auth.service';
import { UserRole, USER_ROLES } from '@/constants/roles';

export interface RequestContext {
  requestId: string;
  traceId: string;
  requestStartTime: number;
  user: UserDTO | null;
  role: UserRole;
  permissions: string[];
  timezone: string;
  locale: string;
  ip: string;
  userAgent: string;
}

export function createRequestContext(
  user: UserDTO | null = null,
  headers?: Record<string, string | undefined>
): RequestContext {
  const requestId = headers?.['x-request-id'] || `req_${Math.random().toString(36).substring(2, 10)}`;
  const traceId = headers?.['x-trace-id'] || `trace_${Math.random().toString(36).substring(2, 12)}`;
  const role = user?.role || USER_ROLES.GUEST;

  return {
    requestId,
    traceId,
    requestStartTime: Date.now(),
    user,
    role,
    permissions: [],
    timezone: headers?.['x-timezone'] || 'UTC',
    locale: headers?.['accept-language']?.split(',')[0] || 'en',
    ip: headers?.['x-forwarded-for'] || '127.0.0.1',
    userAgent: headers?.['user-agent'] || 'unknown'
  };
}
