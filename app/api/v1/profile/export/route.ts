import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { BaseError } from '@/lib/errors';
import { AuthService } from '@/lib/auth/auth.service';

export async function GET(req: NextRequest) {
  try {
    const user = await AuthService.requireAuth();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization') || '',
          }
        }
      }
    );

    const [
      { data: profile },
      { data: savedHackathons },
      { data: submissions },
      { data: notifications }
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('saved_hackathons').select('*, hackathons(*)').eq('user_id', user.id),
      supabase.from('hackathons').select('*').eq('submitted_by', user.id),
      supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);

    const exportData = {
      profile: profile || {},
      savedHackathons: savedHackathons || [],
      submissions: submissions || [],
      notifications: notifications || [],
      exportedAt: new Date().toISOString(),
    };

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `findathon-export-${user.id}-${dateStr}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    console.error('Export error:', err);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}
