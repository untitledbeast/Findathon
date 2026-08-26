import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { formatError } from '@/lib/errors';

export async function GET() {
  try {
    const { count: hackathonsCount, error: hErr } = await supabase
      .from('hackathons')
      .select('*', { count: 'exact', head: true });

    const { count: usersCount, error: uErr } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (hErr || uErr) {
      console.warn('[Stats API] Supabase head count fallback applied');
    }

    const res = NextResponse.json({
      success: true,
      data: {
        hackathons: typeof hackathonsCount === 'number' ? hackathonsCount : 0,
        users: typeof usersCount === 'number' ? usersCount : 0,
        prizes: 'Verified',
        cities: 0
      }
    });

    res.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res;
  } catch (err) {
    const formatted = formatError(err);
    return NextResponse.json({ success: false, error: formatted }, { status: formatted.statusCode });
  }
}
