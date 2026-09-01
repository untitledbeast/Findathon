import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabase as anonSupabase } from '@/lib/supabase';
import { formatResponse, formatError } from '@/lib/transport/api-response';
import { NotFoundError, BaseError } from '@/lib/errors';
import { isValidUUID } from '@/lib/domain/mappers/developer-profile.mapper';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return formatError(new NotFoundError('User profile not found'));
    }

    const viewer = await AuthService.getUser().catch(() => null);

    // Obtain server supabase client
    let client;
    try {
      client = await createSupabaseServerClient();
    } catch {
      client = anonSupabase;
    }

    // If viewer is logged in and not viewing self, check block barrier
    if (viewer && viewer.id !== id && isValidUUID(id)) {
      const { data: blockRow } = await client
        .from('user_blocks')
        .select('id')
        .or(`and(blocker_user_id.eq.${viewer.id},blocked_user_id.eq.${id}),and(blocker_user_id.eq.${id},blocked_user_id.eq.${viewer.id})`)
        .maybeSingle();

      if (blockRow) {
        return formatError(new NotFoundError('User profile not found'));
      }
    }

    // Query profiles table by ID or full_name/slug match
    let profileQuery = client.from('profiles').select('*');
    if (isValidUUID(id)) {
      profileQuery = profileQuery.eq('id', id);
    } else {
      // Decode URL parameter (e.g., username)
      const decoded = decodeURIComponent(id).replace(/^@/, '');
      profileQuery = profileQuery.or(`full_name.ilike.${decoded},email.ilike.${decoded}@%`);
    }

    const { data: profile, error: profileError } = await profileQuery.maybeSingle();

    if (profileError || !profile) {
      return formatError(new NotFoundError('User profile not found'));
    }

    const targetUserId = profile.id;

    // Check discoverability / privacy policy
    // If not self, profile must be discoverable or viewer is authenticated
    const isSelf = viewer?.id === targetUserId;
    if (!isSelf && profile.discoverable_for_teams === false && profile.visibility === 'private') {
      return formatError(new NotFoundError('This profile is private'));
    }

    // Query developer intelligence profile if available
    const { data: devProfile } = await client
      .from('developer_profiles')
      .select('top_languages, top_skills, interests, experience_level, github_connected, leetcode_connected, linkedin_connected')
      .eq('user_id', targetUserId)
      .maybeSingle();

    // Query connections status if viewer is logged in
    let connectionStatus: 'none' | 'pending' | 'accepted' = 'none';
    let isInitiator = false;
    if (viewer && !isSelf) {
      const lowId = viewer.id < targetUserId ? viewer.id : targetUserId;
      const highId = viewer.id < targetUserId ? targetUserId : viewer.id;

      const { data: conn } = await client
        .from('connections')
        .select('status, initiator_user_id')
        .eq('user_low_id', lowId)
        .eq('user_high_id', highId)
        .maybeSingle();

      if (conn) {
        connectionStatus = conn.status as 'pending' | 'accepted';
        isInitiator = conn.initiator_user_id === viewer.id;
      }
    }

    // Construct safe public candidate profile DTO (never expose email, phone, oauth tokens)
    const publicProfile = {
      id: profile.id,
      fullName: profile.full_name || 'Developer User',
      avatarUrl: profile.avatar_url || null,
      bio: profile.bio || null,
      organization: profile.organization || null,
      website: profile.website || null,
      socialTwitter: profile.social_twitter || null,
      socialLinkedin: profile.social_linkedin || null,
      socialInstagram: profile.social_instagram || null,
      socialDiscord: profile.social_discord || null,
      skills: Array.isArray(profile.skills) ? profile.skills : [],
      interests: Array.isArray(devProfile?.interests) ? devProfile.interests : [],
      topLanguages: devProfile?.top_languages || {},
      topSkills: devProfile?.top_skills || {},
      experienceLevel: devProfile?.experience_level || null,
      githubConnected: Boolean(devProfile?.github_connected),
      leetcodeConnected: Boolean(devProfile?.leetcode_connected),
      linkedinConnected: Boolean(devProfile?.linkedin_connected),
      xpPoints: typeof profile.xp_points === 'number' ? profile.xp_points : 150,
      level: typeof profile.level === 'number' ? profile.level : 1,
      role: profile.role || 'user',
      discoverableForTeams: profile.discoverable_for_teams ?? true,
      connectionStatus,
      isConnectionInitiator: isInitiator,
      createdAt: profile.created_at || new Date().toISOString()
    };

    return formatResponse(publicProfile);
  } catch (err: unknown) {
    if (err instanceof BaseError) {
      return formatError(err);
    }
    return formatError(new BaseError('Failed to fetch public profile', 'INTERNAL_ERROR', 500));
  }
}
