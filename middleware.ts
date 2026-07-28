import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin routes
  if (pathname.startsWith('/admin')) {
    const supabaseToken = request.cookies.get('sb-access-token') || request.cookies.get('supabase-auth-token');

    // We can't fully decode/verify JWT here in middleware without additional setup,
    // but we can check if a session cookie exists. Role validation happens in layout/API.
    const hasSessionCookie = Array.from(request.cookies.getAll()).some(c =>
      c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
    );

    if (!hasSessionCookie && !supabaseToken) {
      return NextResponse.redirect(new URL('/?auth=required', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
