export function validateCsrfToken(headerToken?: string, cookieToken?: string): boolean {
  if (!headerToken || !cookieToken) return false;
  return headerToken === cookieToken;
}
