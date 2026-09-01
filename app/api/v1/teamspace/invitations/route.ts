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

    // Fetch pending invitations where invited_user_id = user.id
    const { data: invitations, error: invError } = await adminClient
      .from('team_invitations')
      .select(`
        id,
        team_id,
        invited_by,
        invited_user_id,
        status,
        message,
        created_at,
        updated_at,
        teams (
          id,
          name,
          avatar_color,
          max_members,
          hackathons (
            id,
            title
          )
        ),
        inviter:profiles!team_invitations_invited_by_fkey (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('invited_user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (invError) {
      // Fallback query if foreign key alias differs
      const { data: fallbackInvs, error: fbError } = await adminClient
        .from('team_invitations')
        .select(`
          id,
          team_id,
          invited_by,
          invited_user_id,
          status,
          message,
          created_at,
          updated_at,
          teams (
            id,
            name,
            avatar_color,
            max_members,
            hackathon_id
          )
        `)
        .eq('invited_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (fbError) {
        return NextResponse.json(
          { success: false, error: { message: fbError.message, code: 'DB_ERROR', statusCode: 500 } },
          { status: 500 }
        );
      }

      // Populate inviter profiles and member counts manually
      const inviterIds = (fallbackInvs || []).map((i) => i.invited_by);
      const teamIds = (fallbackInvs || []).map((i) => i.team_id);

      const [profilesRes, membersRes] = await Promise.all([
        adminClient.from('profiles').select('id, full_name, avatar_url').in('id', inviterIds.length > 0 ? inviterIds : ['00000000-0000-0000-0000-000000000000']),
        adminClient.from('team_members').select('team_id').in('team_id', teamIds.length > 0 ? teamIds : ['00000000-0000-0000-0000-000000000000'])
      ]);

      const profileMap: Record<string, any> = {};
      (profilesRes.data || []).forEach((p) => { profileMap[p.id] = p; });

      const countMap: Record<string, number> = {};
      (membersRes.data || []).forEach((m) => { countMap[m.team_id] = (countMap[m.team_id] || 0) + 1; });

      const mapped = (fallbackInvs || []).map((inv: any) => ({
        id: inv.id,
        team_id: inv.team_id,
        invited_by: inv.invited_by,
        invited_user_id: inv.invited_user_id,
        status: inv.status,
        message: inv.message,
        created_at: inv.created_at,
        updated_at: inv.updated_at,
        team: {
          id: inv.teams?.id,
          name: inv.teams?.name || 'Hackathon Team',
          avatar_color: inv.teams?.avatar_color || '7C3AED',
          member_count: countMap[inv.team_id] || 1,
          hackathon_title: null
        },
        inviter: {
          full_name: profileMap[inv.invited_by]?.full_name || 'A team member',
          avatar_url: profileMap[inv.invited_by]?.avatar_url || null
        }
      }));

      return NextResponse.json({ success: true, data: mapped });
    }

    // Get member counts for teams in invitations
    const teamIds = (invitations || []).map((i: any) => i.team_id);
    const { data: membersData } = await adminClient
      .from('team_members')
      .select('team_id')
      .in('team_id', teamIds.length > 0 ? teamIds : ['00000000-0000-0000-0000-000000000000']);

    const countMap: Record<string, number> = {};
    (membersData || []).forEach((m) => { countMap[m.team_id] = (countMap[m.team_id] || 0) + 1; });

    const formatted = (invitations || []).map((inv: any) => ({
      id: inv.id,
      team_id: inv.team_id,
      invited_by: inv.invited_by,
      invited_user_id: inv.invited_user_id,
      status: inv.status,
      message: inv.message,
      created_at: inv.created_at,
      updated_at: inv.updated_at,
      team: {
        id: inv.teams?.id,
        name: inv.teams?.name || 'Hackathon Team',
        avatar_color: inv.teams?.avatar_color || '7C3AED',
        member_count: countMap[inv.team_id] || 1,
        hackathon_title: inv.teams?.hackathons?.title || null
      },
      inviter: {
        full_name: inv.inviter?.full_name || 'A team member',
        avatar_url: inv.inviter?.avatar_url || null
      }
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err?.message || 'Server error', code: 'SERVER_ERROR', statusCode: 500 } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const { team_id, invited_user_id, message } = body;

    if (!team_id || !invited_user_id) {
      return NextResponse.json(
        { success: false, error: { message: 'team_id and invited_user_id are required', code: 'INVALID_INPUT', statusCode: 400 } },
        { status: 400 }
      );
    }

    if (invited_user_id === user.id) {
      return NextResponse.json(
        { success: false, error: { message: 'You cannot invite yourself', code: 'INVALID_INPUT', statusCode: 400 } },
        { status: 400 }
      );
    }

    // 1. Check requester is team member (any role)
    const { data: membership, error: membershipError } = await adminClient
      .from('team_members')
      .select('role')
      .eq('team_id', team_id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { success: false, error: { message: 'You must be a member of the team to invite others', code: 'FORBIDDEN', statusCode: 403 } },
        { status: 403 }
      );
    }

    // 2. Check invited user exists
    const { data: invitedProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, full_name')
      .eq('id', invited_user_id)
      .single();

    if (profileError || !invitedProfile) {
      return NextResponse.json(
        { success: false, error: { message: 'Invited user does not exist', code: 'USER_NOT_FOUND', statusCode: 404 } },
        { status: 404 }
      );
    }

    // 3. Check invited user is not already a member
    const { data: existingMember } = await adminClient
      .from('team_members')
      .select('id')
      .eq('team_id', team_id)
      .eq('user_id', invited_user_id)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { success: false, error: { message: 'User is already a member of this team', code: 'ALREADY_MEMBER', statusCode: 400 } },
        { status: 400 }
      );
    }

    // 4. Check team capacity
    const { data: team } = await adminClient
      .from('teams')
      .select('max_members')
      .eq('id', team_id)
      .single();

    const { count: currentMemberCount } = await adminClient
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', team_id);

    if ((currentMemberCount || 0) >= (team?.max_members || 4)) {
      return NextResponse.json(
        { success: false, error: { message: 'Team is already full', code: 'TEAM_FULL', statusCode: 400 } },
        { status: 400 }
      );
    }

    // 5. Check no existing pending invitation
    const { data: existingInvite } = await adminClient
      .from('team_invitations')
      .select('id')
      .eq('team_id', team_id)
      .eq('invited_user_id', invited_user_id)
      .eq('status', 'pending')
      .single();

    if (existingInvite) {
      return NextResponse.json(
        { success: false, error: { message: 'A pending invitation has already been sent to this developer', code: 'INVITATION_PENDING', statusCode: 400 } },
        { status: 400 }
      );
    }

    // 6. Insert invitation
    const { data: createdInvite, error: insertError } = await adminClient
      .from('team_invitations')
      .insert({
        team_id,
        invited_by: user.id,
        invited_user_id,
        status: 'pending',
        message: typeof message === 'string' ? message.trim().slice(0, 300) : null
      })
      .select()
      .single();

    if (insertError || !createdInvite) {
      return NextResponse.json(
        { success: false, error: { message: insertError?.message || 'Failed to send invitation', code: 'DB_ERROR', statusCode: 500 } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: createdInvite }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err?.message || 'Server error', code: 'SERVER_ERROR', statusCode: 500 } },
      { status: 500 }
    );
  }
}
