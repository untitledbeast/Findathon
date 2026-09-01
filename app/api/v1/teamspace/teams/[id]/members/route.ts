/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await context.params;
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED', statusCode: 401 } },
        { status: 401 }
      );
    }

    // 1. Fetch team
    const { data: team, error: teamError } = await adminClient
      .from('teams')
      .select('id, name, created_by, max_members, status, is_open')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { success: false, error: { message: 'Team not found', code: 'NOT_FOUND', statusCode: 404 } },
        { status: 404 }
      );
    }

    if (!team.is_open) {
      return NextResponse.json(
        { success: false, error: { message: 'This team is not open to public joins. An invitation is required.', code: 'TEAM_CLOSED', statusCode: 400 } },
        { status: 400 }
      );
    }

    // 2. Check current members
    const { data: members, error: membersError } = await adminClient
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId);

    if (membersError) {
      return NextResponse.json(
        { success: false, error: { message: membersError.message, code: 'DB_ERROR', statusCode: 500 } },
        { status: 500 }
      );
    }

    if ((members || []).some((m) => m.user_id === user.id)) {
      return NextResponse.json(
        { success: false, error: { message: 'You are already a member of this team', code: 'ALREADY_MEMBER', statusCode: 400 } },
        { status: 400 }
      );
    }

    if ((members || []).length >= (team.max_members || 4)) {
      return NextResponse.json(
        { success: false, error: { message: 'Team is already at maximum capacity', code: 'TEAM_FULL', statusCode: 400 } },
        { status: 400 }
      );
    }

    // 3. Insert membership
    const { data: newMember, error: insertError } = await adminClient
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: user.id,
        role: 'member'
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { success: false, error: { message: insertError.message, code: 'DB_ERROR', statusCode: 500 } },
        { status: 500 }
      );
    }

    // Check if team is now full
    if ((members || []).length + 1 >= (team.max_members || 4)) {
      await adminClient
        .from('teams')
        .update({ status: 'full', updated_at: new Date().toISOString() })
        .eq('id', teamId);
    }

    return NextResponse.json({ success: true, data: newMember }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err?.message || 'Server error', code: 'SERVER_ERROR', statusCode: 500 } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await context.params;
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED', statusCode: 401 } },
        { status: 401 }
      );
    }

    // 1. Fetch team
    const { data: team, error: teamError } = await adminClient
      .from('teams')
      .select('id, created_by, status')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { success: false, error: { message: 'Team not found', code: 'NOT_FOUND', statusCode: 404 } },
        { status: 404 }
      );
    }

    if (team.created_by === user.id) {
      return NextResponse.json(
        { success: false, error: { message: 'Team owner cannot leave the team. You must disband the team instead.', code: 'OWNER_CANNOT_LEAVE', statusCode: 400 } },
        { status: 400 }
      );
    }

    // 2. Delete membership
    const { error: deleteError } = await adminClient
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', user.id);

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: { message: deleteError.message, code: 'DB_ERROR', statusCode: 500 } },
        { status: 500 }
      );
    }

    // If team status was 'full', set it back to 'forming'
    if (team.status === 'full') {
      await adminClient
        .from('teams')
        .update({ status: 'forming', updated_at: new Date().toISOString() })
        .eq('id', teamId);
    }

    return NextResponse.json({ success: true, data: { message: 'Left team successfully' } });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err?.message || 'Server error', code: 'SERVER_ERROR', statusCode: 500 } },
      { status: 500 }
    );
  }
}
