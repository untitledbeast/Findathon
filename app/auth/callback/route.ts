import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createProfileModule } from '@/lib/composition';
import { createRequestContext } from '@/lib/context/request-context';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const redirectCookie = request.cookies.get('redirect_after_login')?.value;

  if (code) {
    const { data: { session } } = await supabase.auth.exchangeCodeForSession(code);
    if (session?.user) {
      const user = session.user;
      const { service: profileService } = createProfileModule();
      const headers: Record<string, string | undefined> = {};
      request.headers.forEach((val, key) => { headers[key] = val; });

      const context = createRequestContext(
        {
          id: user.id,
          email: user.email || null,
          fullName: user.user_metadata?.full_name || 'User',
          avatarUrl: user.user_metadata?.avatar_url || null,
          role: (user.user_metadata?.role as 'user' | 'organizer' | 'admin') || 'user'
        },
        headers
      );

      const profileResult = await profileService.getProfile(context, user.id);

      if (!profileResult.ok) {
        // Bootstrap profile if missing
        await profileService.updateProfile(context, {
          fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          avatarUrl: user.user_metadata?.avatar_url || null,
          isFirstLogin: true,
          onboardingComplete: false
        });
        return NextResponse.redirect(new URL('/onboarding', request.url));
      }

      const profile = profileResult.value;

      if (!profile.onboardingComplete || profile.isFirstLogin) {
        return NextResponse.redirect(new URL('/onboarding', request.url));
      }

      if (profile.role === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url));
      }

      const targetPath = redirectCookie && redirectCookie.startsWith('/') ? redirectCookie : '/account';
      const response = NextResponse.redirect(new URL(targetPath, request.url));
      response.cookies.delete('redirect_after_login');
      return response;
    }
  }

  return NextResponse.redirect(new URL('/?auth=error', request.url));
}
