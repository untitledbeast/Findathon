import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    // Get auth token from cookie or Authorization header
    const authHeader = req.headers.get('Authorization') || '';
    const cookieHeader = req.headers.get('cookie') || '';

    // Use service role to bypass RLS — we manually check user identity
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get user from the bearer token
    const token = authHeader.replace('Bearer ', '').trim();

    let userId: string | null = null;

    if (token) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) userId = user.id;
    }

    // If no token in header, try to get session from cookies
    if (!userId) {
      // Parse the Supabase auth cookie
      const cookies = Object.fromEntries(
        cookieHeader.split(';').map(c => {
          const [key, ...val] = c.trim().split('=');
          return [key.trim(), val.join('=')];
        })
      );

      // Find supabase auth token cookie
      const authCookieKey = Object.keys(cookies).find(k =>
        k.includes('auth-token') || k.includes('sb-') && k.includes('-auth-token')
      );

      if (authCookieKey) {
        try {
          const cookieVal = decodeURIComponent(cookies[authCookieKey]);
          const parsed = JSON.parse(cookieVal);
          const accessToken = parsed?.access_token || parsed?.[0]?.access_token;
          if (accessToken) {
            const { data: { user } } = await supabase.auth.getUser(accessToken);
            if (user) userId = user.id;
          }
        } catch {
          // Cookie parse failed — not critical
        }
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Sign in required' } },
        { status: 401 }
      );
    }

    // Fetch submissions — only columns that exist in hackathons table
    const { data, error } = await supabase
      .from('hackathons')
      .select('id, title, status, start_date, end_date, cover_image_url, created_at, location_city, is_online, tags, organizer')
      .eq('submitted_by', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[submissions route] DB error:', error.message);
      return NextResponse.json(
        { success: false, error: { code: 'FETCH_ERROR', message: error.message } },
        { status: 500 }
      );
    }

    // Always return array in data field
    return NextResponse.json({
      success: true,
      data: data || [],
      meta: { total: (data || []).length }
    });

  } catch (err: any) {
    console.error('[submissions route] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch submissions' } },
      { status: 500 }
    );
  }
}