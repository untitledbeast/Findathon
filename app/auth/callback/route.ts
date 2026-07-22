import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/account';

  if (code) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      console.error('Supabase OAuth code exchange error:', error.message);
    } catch (err) {
      console.error('Callback route exception:', err);
    }
  }

  // Return to home page if code exchange fails or code is missing
  return NextResponse.redirect(`${origin}/account`);
}
