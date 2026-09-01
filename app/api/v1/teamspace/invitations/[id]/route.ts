/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invitationId } = await context.params;
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED', statusCode: 401 } },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { action } = body;

    if (action !== 'accepted' && action !== 'declined' && action !== 'cancelled') {
      return NextResponse.json(
        { success: false, error: { message: 'Action must be "accepted", "declined", or "cancelled"', code: 'INVALID_INPUT', statusCode: 400 } },
        { status: 400 }
      );
    }

    // 1. Fetch invitation
    const { data: invitation, error: invError } = await adminClient
      .from('team_invitations')
      .select('id, team_id, invited_by, invited_user_id, status')
      .eq('id', invitationId)
      .single();

    if (invError || !invitation) {
      return NextResponse.json(
        { success: false, error: { message: 'Invitation not found', code: 'NOT_FOUND', statusCode: 404 } },
        { status: 404 }
      );
    }

    // Authorization: If cancelled, must be sender; if accepted/declined, must be invitee
    if (action === 'cancelled') {
      if (invitation.invited_by !== user.id) {
        return NextResponse.json(
          { success: false, error: { message: 'Only the inviter can cancel an invitation', code: 'FORBIDDEN', statusCode: 403 } },
          { status: 403 }
        );
      }
    } else {
      if (invitation.invited_user_id !== user.id) {
        return NextResponse.json(
          { success: false, error: { message: 'Only the invited user can respond to this invitation', code: 'FORBIDDEN', statusCode: 403 } },
          { status: 403 }
        );
      }
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: { message: `Invitation is already ${invitation.status}`, code: 'ALREADY_RESPONDED', statusCode: 400 } },
        { status: 400 }
      );
    }

    if (action === 'declined' || action === 'cancelled') {
      const { data: updated, error: updateError } = await adminClient
        .from('team_invitations')
        .update({
          status: action,
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json(
          { success: false, error: { message: updateError.message, code: 'DB_ERROR', statusCode: 500 } },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, data: updated });
    }

    // ACTION: 'accepted'
    // Check team capacity and status
    const { data: team, error: teamError } = await adminClient
      .from('teams')
      .select('id, max_members, status')
      .eq('id', invitation.team_id)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { success: false, error: { message: 'Team no longer exists', code: 'TEAM_NOT_FOUND', statusCode: 404 } },
        { status: 404 }
      );
    }

    const { count: currentMemberCount } = await adminClient
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', invitation.team_id);

    if ((currentMemberCount || 0) >= (team.max_members || 4)) {
      return NextResponse.json(
        { success: false, error: { message: 'Team is already at maximum capacity', code: 'TEAM_FULL', statusCode: 400 } },
        { status: 400 }
      );
    }

    // Insert into team_members
    const { error: joinError } = await adminClient
      .from('team_members')
      .insert({
        team_id: invitation.team_id,
        user_id: user.id,
        role: 'member'
      });

    if (joinError) {
      return NextResponse.json(
        { success: false, error: { message: joinError.message, code: 'DB_ERROR', statusCode: 500 } },
        { status: 500 }
      );
    }

    // Update invitation to accepted
    const { data: updatedInv, error: updateError } = await adminClient
      .from('team_invitations')
      .update({
        status: 'accepted',
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { success: false, error: { message: updateError.message, code: 'DB_ERROR', statusCode: 500 } },
        { status: 500 }
      );
    }

    // If capacity reached, set status to full
    if ((currentMemberCount || 0) + 1 >= (team.max_members || 4)) {
      await adminClient
        .from('teams')
        .update({ status: 'full', updated_at: new Date().toISOString() })
        .eq('id', invitation.team_id);
    }

    return NextResponse.json({ success: true, data: updatedInv });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err?.message || 'Server error', code: 'SERVER_ERROR', statusCode: 500 } },
      { status: 500 }
    );
  }
}
