/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { computeTeamFit, recommendTeammates } from '@/lib/teamspace/team-fit';
import { DeveloperSkillSnapshot, TeamFitResult, TeammateRecommendation } from '@/lib/teamspace/types';

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('team_id');

    // 1. Get current user's profile and developer_profile
    let currentUserSnapshot: DeveloperSkillSnapshot | null = null;
    if (user) {
      const [pRes, dpRes] = await Promise.all([
        adminClient.from('profiles').select('full_name, avatar_url').eq('id', user.id).single(),
        adminClient.from('developer_profiles').select('top_languages, competencies, interests, overall_score, experience_level').eq('user_id', user.id).single()
      ]);

      currentUserSnapshot = {
        user_id: user.id,
        full_name: pRes.data?.full_name || null,
        avatar_url: pRes.data?.avatar_url || null,
        experience_level: dpRes.data?.experience_level || null,
        top_languages: dpRes.data?.top_languages || [],
        competencies: dpRes.data?.competencies || {},
        interests: dpRes.data?.interests || [],
        overall_score: dpRes.data?.overall_score || 0
      };
    }

    // 2. Determine excluded user IDs & team context
    const excludedUserIds: string[] = user ? [user.id] : [];
    let teamFit: TeamFitResult = {
      score: 0,
      confidence: 'low',
      covered_skills: [],
      gap_skills: [],
      reasons: []
    };
    let pendingInvitedUserIds: string[] = [];

    if (teamId) {
      const [teamRes, membersRes, invitesRes] = await Promise.all([
        adminClient.from('teams').select('id, required_skills, max_members').eq('id', teamId).single(),
        adminClient.from('team_members').select('user_id').eq('team_id', teamId),
        adminClient.from('team_invitations').select('invited_user_id').eq('team_id', teamId).eq('status', 'pending')
      ]);

      if (teamRes.data) {
        const memberIds = (membersRes.data || []).map((m) => m.user_id);
        excludedUserIds.push(...memberIds);
        pendingInvitedUserIds = (invitesRes.data || []).map((i) => i.invited_user_id);

        // Fetch team members' developer profiles to compute accurate team fit
        const [memProfiles, memDevProfiles] = await Promise.all([
          adminClient.from('profiles').select('id, full_name, avatar_url').in('id', memberIds.length > 0 ? memberIds : ['00000000-0000-0000-0000-000000000000']),
          adminClient.from('developer_profiles').select('user_id, top_languages, competencies, experience_level, overall_score, interests').in('user_id', memberIds.length > 0 ? memberIds : ['00000000-0000-0000-0000-000000000000'])
        ]);

        const memProfileMap: Record<string, any> = {};
        (memProfiles.data || []).forEach((p) => { memProfileMap[p.id] = p; });
        const memDevMap: Record<string, any> = {};
        (memDevProfiles.data || []).forEach((dp) => { memDevMap[dp.user_id] = dp; });

        const memberSnapshots: DeveloperSkillSnapshot[] = memberIds.map((uid) => ({
          user_id: uid,
          full_name: memProfileMap[uid]?.full_name || null,
          avatar_url: memProfileMap[uid]?.avatar_url || null,
          experience_level: memDevMap[uid]?.experience_level || null,
          top_languages: memDevMap[uid]?.top_languages || [],
          competencies: memDevMap[uid]?.competencies || {},
          interests: memDevMap[uid]?.interests || [],
          overall_score: memDevMap[uid]?.overall_score || 0
        }));

        teamFit = computeTeamFit(
          {
            required_skills: teamRes.data.required_skills || [],
            max_members: teamRes.data.max_members || 4
          },
          memberSnapshots
        );
      }
    }

    // 3. Fetch discoverable users from developer_visibility
    // (If developer_visibility has rows, filter by is_discoverable = true; also fallback to profiles if empty)
    const { data: visibilityRows } = await adminClient
      .from('developer_visibility')
      .select('user_id')
      .eq('is_discoverable', true);

    let targetUserIds: string[] = [];
    if (visibilityRows && visibilityRows.length > 0) {
      targetUserIds = visibilityRows
        .map((v) => v.user_id)
        .filter((uid) => !excludedUserIds.includes(uid));
    } else {
      // Fallback: fetch all profiles except excluded
      const { data: allProfiles } = await adminClient
        .from('profiles')
        .select('id')
        .limit(50);

      targetUserIds = (allProfiles || [])
        .map((p) => p.id)
        .filter((uid) => !excludedUserIds.includes(uid));
    }

    if (targetUserIds.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // 4. Fetch candidate profiles and developer_profiles
    const [candProfilesRes, candDevRes] = await Promise.all([
      adminClient.from('profiles').select('id, full_name, avatar_url').in('id', targetUserIds),
      adminClient.from('developer_profiles').select('user_id, top_languages, competencies, interests, overall_score, experience_level').in('user_id', targetUserIds)
    ]);

    const candProfileMap: Record<string, any> = {};
    (candProfilesRes.data || []).forEach((p) => { candProfileMap[p.id] = p; });

    const candDevMap: Record<string, any> = {};
    (candDevRes.data || []).forEach((dp) => { candDevMap[dp.user_id] = dp; });

    const candidateSnapshots: DeveloperSkillSnapshot[] = targetUserIds.map((uid) => ({
      user_id: uid,
      full_name: candProfileMap[uid]?.full_name || null,
      avatar_url: candProfileMap[uid]?.avatar_url || null,
      experience_level: candDevMap[uid]?.experience_level || null,
      top_languages: candDevMap[uid]?.top_languages || [],
      competencies: candDevMap[uid]?.competencies || {},
      interests: candDevMap[uid]?.interests || [],
      overall_score: candDevMap[uid]?.overall_score || 0
    }));

    let recommendations: (TeammateRecommendation & { has_pending_invite?: boolean })[] = [];

    if (teamId && currentUserSnapshot) {
      const computedRecs = recommendTeammates(currentUserSnapshot, teamFit, candidateSnapshots);
      recommendations = computedRecs.map((rec) => ({
        ...rec,
        has_pending_invite: pendingInvitedUserIds.includes(rec.developer.user_id)
      }));

      // If recommendations are fewer than candidate count, append remaining candidates sorted by overall_score
      const recommendedUserIds = new Set(recommendations.map((r) => r.developer.user_id));
      const remainingCandidates = candidateSnapshots
        .filter((c) => !recommendedUserIds.has(c.user_id))
        .sort((a, b) => b.overall_score - a.overall_score);

      for (const cand of remainingCandidates) {
        if (recommendations.length >= 12) break;
        recommendations.push({
          developer: cand,
          match_score: 0,
          fills_gaps: [],
          adds_skills: cand.top_languages.slice(0, 3),
          match_label: 'Available',
          has_pending_invite: pendingInvitedUserIds.includes(cand.user_id)
        });
      }
    } else {
      // Sort discoverable devs by overall_score
      candidateSnapshots.sort((a, b) => b.overall_score - a.overall_score);
      recommendations = candidateSnapshots.slice(0, 15).map((cand) => ({
        developer: cand,
        match_score: 0,
        fills_gaps: [],
        adds_skills: cand.top_languages.slice(0, 3),
        match_label: 'Available',
        has_pending_invite: pendingInvitedUserIds.includes(cand.user_id)
      }));
    }

    return NextResponse.json({ success: true, data: recommendations });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err?.message || 'Server error', code: 'SERVER_ERROR', statusCode: 500 } },
      { status: 500 }
    );
  }
}
