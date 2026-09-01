/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED', statusCode: 401 } },
        { status: 401 }
      );
    }

    const { data: visibility, error } = await adminClient
      .from('developer_visibility')
      .select('user_id, is_discoverable, looking_for_team, preferred_roles, updated_at')
      .eq('user_id', user.id)
      .single();

    if (error || !visibility) {
      // Return defaults if not found
      return NextResponse.json({
        success: true,
        data: {
          user_id: user.id,
          is_discoverable: true,
          looking_for_team: true,
          preferred_roles: [],
          updated_at: new Date().toISOString()
        }
      });
    }

    return NextResponse.json({ success: true, data: visibility });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err?.message || 'Server error', code: 'SERVER_ERROR', statusCode: 500 } },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED', statusCode: 401 } },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const payload: Record<string, any> = {
      user_id: user.id,
      updated_at: new Date().toISOString()
    };

    if (typeof body.is_discoverable === 'boolean') {
      payload.is_discoverable = body.is_discoverable;
    }
    if (typeof body.looking_for_team === 'boolean') {
      payload.looking_for_team = body.looking_for_team;
    }
    if (Array.isArray(body.preferred_roles)) {
      payload.preferred_roles = body.preferred_roles
        .filter((r: any) => typeof r === 'string' && r.trim().length > 0)
        .slice(0, 10);
    }

    const { data: updated, error: upsertError } = await adminClient
      .from('developer_visibility')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (upsertError) {
      return NextResponse.json(
        { success: false, error: { message: upsertError.message, code: 'DB_ERROR', statusCode: 500 } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err?.message || 'Server error', code: 'SERVER_ERROR', statusCode: 500 } },
      { status: 500 }
    );
  }
}
