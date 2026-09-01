/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { computeTeamFit } from '@/lib/teamspace/team-fit';
import { DeveloperSkillSnapshot, TeamMember } from '@/lib/teamspace/types';

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await context.params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Fetch team
    const { data: team, error: teamError } = await adminClient
      .from('teams')
      .select(`
        id,
        name,
        slug,
        description,
        hackathon_id,
        created_by,
        max_members,
        status,
        required_skills,
        is_open,
        avatar_color,
        created_at,
        updated_at,
        hackathons (
          id,
          title
        )
      `)
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { success: false, error: { message: 'Team not found', code: 'NOT_FOUND', statusCode: 404 } },
        { status: 404 }
      );
    }

    // 2. Fetch team members with profile and developer_profile
    const { data: rawMembers, error: membersError } = await adminClient
      .from('team_members')
      .select(`
        id,
        team_id,
        user_id,
        role,
        joined_at,
        profiles (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('team_id', teamId);

    if (membersError) {
      return NextResponse.json(
        { success: false, error: { message: membersError.message, code: 'DB_ERROR', statusCode: 500 } },
        { status: 500 }
      );
    }

    const memberUserIds = (rawMembers || []).map((m: any) => m.user_id);

    // Fetch developer_profiles for members
    const { data: devProfiles } = await adminClient
      .from('developer_profiles')
      .select('user_id, top_languages, competencies, experience_level, overall_score, interests')
      .in('user_id', memberUserIds.length > 0 ? memberUserIds : ['00000000-0000-0000-0000-000000000000']);

    const devProfileMap: Record<string, any> = {};
    if (devProfiles) {
      for (const dp of devProfiles) {
        devProfileMap[dp.user_id] = dp;
      }
    }

    const memberSnapshots: DeveloperSkillSnapshot[] = [];
    const members: TeamMember[] = (rawMembers || []).map((m: any) => {
      const dp = devProfileMap[m.user_id];
      const snapshot: DeveloperSkillSnapshot = {
        user_id: m.user_id,
        full_name: m.profiles?.full_name || null,
        avatar_url: m.profiles?.avatar_url || null,
        experience_level: dp?.experience_level || null,
        top_languages: dp?.top_languages || [],
        competencies: dp?.competencies || {},
        interests: dp?.interests || [],
        overall_score: dp?.overall_score || 0
      };
      memberSnapshots.push(snapshot);

      return {
        id: m.id,
        team_id: m.team_id,
        user_id: m.user_id,
        role: m.role,
        joined_at: m.joined_at,
        profile: {
          full_name: m.profiles?.full_name || null,
          avatar_url: m.profiles?.avatar_url || null
        },
        developer_profile: snapshot
      };
    });

    // 3. Count pending invitations
    const { count: pendingInvitationsCount } = await adminClient
      .from('team_invitations')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('status', 'pending');

    // 4. Compute team fit
    const teamFit = computeTeamFit(
      {
        required_skills: team.required_skills || [],
        max_members: team.max_members || 4
      },
      memberSnapshots
    );

    const isUserOwner = user ? user.id === team.created_by : false;
    const isUserMember = user ? memberUserIds.includes(user.id) : false;

    return NextResponse.json({
      success: true,
      data: {
        ...team,
        hackathon_title: (team as any).hackathons?.title || null,
        member_count: members.length,
        members,
        team_fit: teamFit,
        pending_invitations_count: pendingInvitationsCount || 0,
        is_owner: isUserOwner,
        is_member: isUserMember
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err?.message || 'Server error', code: 'SERVER_ERROR', statusCode: 500 } },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    // Check ownership
    const { data: team, error: teamError } = await adminClient
      .from('teams')
      .select('created_by')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { success: false, error: { message: 'Team not found', code: 'NOT_FOUND', statusCode: 404 } },
        { status: 404 }
      );
    }

    if (team.created_by !== user.id) {
      return NextResponse.json(
        { success: false, error: { message: 'Only team owner can update team details', code: 'FORBIDDEN', statusCode: 403 } },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (typeof body.name === 'string' && body.name.trim().length >= 2) {
      updatePayload.name = body.name.trim().slice(0, 60);
    }
    if (typeof body.description === 'string' || body.description === null) {
      updatePayload.description = body.description ? body.description.trim().slice(0, 300) : null;
    }
    if (Array.isArray(body.required_skills)) {
      updatePayload.required_skills = body.required_skills
        .filter((s: any) => typeof s === 'string' && s.trim().length > 0)
        .slice(0, 10)
        .map((s: string) => s.trim());
    }
    if (typeof body.is_open === 'boolean') {
      updatePayload.is_open = body.is_open;
    }
    if (['forming', 'full', 'active', 'completed', 'disbanded'].includes(body.status)) {
      updatePayload.status = body.status;
    }

    const { data: updatedTeam, error: updateError } = await adminClient
      .from('teams')
      .update(updatePayload)
      .eq('id', teamId)
      .select()
      .single();

    if (updateError || !updatedTeam) {
      return NextResponse.json(
        { success: false, error: { message: updateError?.message || 'Failed to update team', code: 'DB_ERROR', statusCode: 500 } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: updatedTeam });
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

    // Check ownership
    const { data: team, error: teamError } = await adminClient
      .from('teams')
      .select('created_by')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { success: false, error: { message: 'Team not found', code: 'NOT_FOUND', statusCode: 404 } },
        { status: 404 }
      );
    }

    if (team.created_by !== user.id) {
      return NextResponse.json(
        { success: false, error: { message: 'Only team owner can disband team', code: 'FORBIDDEN', statusCode: 403 } },
        { status: 403 }
      );
    }

    const { error: deleteError } = await adminClient
      .from('teams')
      .delete()
      .eq('id', teamId);

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: { message: deleteError.message, code: 'DB_ERROR', statusCode: 500 } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: { message: 'Team disbanded successfully' } });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err?.message || 'Server error', code: 'SERVER_ERROR', statusCode: 500 } },
      { status: 500 }
    );
  }
}
