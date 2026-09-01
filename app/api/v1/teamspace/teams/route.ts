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

    // Fetch team IDs where current user is a member
    const { data: memberships, error: memberError } = await adminClient
      .from('team_members')
      .select('team_id, role, joined_at')
      .eq('user_id', user.id);

    if (memberError) {
      return NextResponse.json(
        { success: false, error: { message: memberError.message, code: 'DB_ERROR', statusCode: 500 } },
        { status: 500 }
      );
    }

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const teamIds = memberships.map((m) => m.team_id);

    // Fetch teams
    const { data: teams, error: teamsError } = await adminClient
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
      .in('id', teamIds)
      .order('created_at', { ascending: false });

    if (teamsError) {
      return NextResponse.json(
        { success: false, error: { message: teamsError.message, code: 'DB_ERROR', statusCode: 500 } },
        { status: 500 }
      );
    }

    // Get member counts for each team
    const { data: allMembers, error: countError } = await adminClient
      .from('team_members')
      .select('team_id')
      .in('team_id', teamIds);

    const countMap: Record<string, number> = {};
    if (allMembers) {
      for (const m of allMembers) {
        countMap[m.team_id] = (countMap[m.team_id] || 0) + 1;
      }
    }

    const result = (teams || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      description: t.description,
      hackathon_id: t.hackathon_id,
      created_by: t.created_by,
      max_members: t.max_members,
      status: t.status,
      required_skills: t.required_skills || [],
      is_open: t.is_open,
      avatar_color: t.avatar_color || '7C3AED',
      created_at: t.created_at,
      updated_at: t.updated_at,
      hackathon_title: t.hackathons?.title || null,
      member_count: countMap[t.id] || 1
    }));

    return NextResponse.json({ success: true, data: result });
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
    const { name, description, hackathon_id, max_members, required_skills } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 60) {
      return NextResponse.json(
        { success: false, error: { message: 'Team name must be between 2 and 60 characters', code: 'INVALID_INPUT', statusCode: 400 } },
        { status: 400 }
      );
    }

    const parsedMaxMembers = typeof max_members === 'number' && max_members >= 2 && max_members <= 10
      ? Math.floor(max_members)
      : 4;

    const parsedSkills = Array.isArray(required_skills)
      ? required_skills.filter((s) => typeof s === 'string' && s.trim().length > 0).slice(0, 10).map((s) => s.trim())
      : [];

    const slug =
      name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 40) +
      '-' +
      Date.now().toString(36);

    const colors = ['7C3AED', '4F46E5', '2563EB', '059669', 'D97706', 'DB2777', '9333EA'];
    const avatar_color = colors[Math.floor(Math.random() * colors.length)];

    // 1. Insert team
    const { data: createdTeam, error: createError } = await adminClient
      .from('teams')
      .insert({
        name: name.trim(),
        slug,
        description: typeof description === 'string' ? description.trim().slice(0, 300) : null,
        hackathon_id: hackathon_id || null,
        created_by: user.id,
        max_members: parsedMaxMembers,
        status: 'forming',
        required_skills: parsedSkills,
        is_open: true,
        avatar_color
      })
      .select()
      .single();

    if (createError || !createdTeam) {
      return NextResponse.json(
        { success: false, error: { message: createError?.message || 'Failed to create team', code: 'DB_ERROR', statusCode: 500 } },
        { status: 500 }
      );
    }

    // 2. Insert creator as owner
    const { error: memberError } = await adminClient
      .from('team_members')
      .insert({
        team_id: createdTeam.id,
        user_id: user.id,
        role: 'owner'
      });

    if (memberError) {
      // Rollback team creation if member insertion fails
      await adminClient.from('teams').delete().eq('id', createdTeam.id);
      return NextResponse.json(
        { success: false, error: { message: memberError.message, code: 'DB_ERROR', statusCode: 500 } },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          ...createdTeam,
          member_count: 1
        }
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err?.message || 'Server error', code: 'SERVER_ERROR', statusCode: 500 } },
      { status: 500 }
    );
  }
}
