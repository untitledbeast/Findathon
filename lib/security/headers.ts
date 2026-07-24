import { securityConfig } from '@/config/security';

export function getSecurityHeaders(): Record<string, string> {
  const cspHeader = `
    default-src ${securityConfig.csp.defaultSrc.join(' ')};
    script-src ${securityConfig.csp.scriptSrc.join(' ')};
    style-src ${securityConfig.csp.styleSrc.join(' ')};
    img-src ${securityConfig.csp.imgSrc.join(' ')};
    connect-src ${securityConfig.csp.connectSrc.join(' ')};
    frame-ancestors 'none';
  `.replace(/\s{2,}/g, ' ').trim();

  return {
    'Content-Security-Policy': cspHeader,
    'X-Frame-Options': securityConfig.headers.xFrameOptions,
    'X-Content-Type-Options': securityConfig.headers.xContentTypeOptions,
    'Referrer-Policy': securityConfig.headers.referrerPolicy,
    'Permissions-Policy': securityConfig.headers.permissionsPolicy
  };
}
