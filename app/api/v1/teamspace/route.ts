import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { createRequestContext } from '@/lib/context/request-context';
import { createTeamQueryService, createProfileRepository } from '@/lib/services/factories';
import { formatResponse, formatError } from '@/lib/transport/api-response';
import { AuthenticationError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    if (!user) {
      return formatError(new AuthenticationError('Authentication required to access TeamSpace'));
    }

    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const context = createRequestContext(user, headers);

    const teamQueryService = createTeamQueryService();
    const result = await teamQueryService.getMyTeams(context);

    const profileRepo = createProfileRepository();
    const profile = await profileRepo.findById(user.id);

    return formatResponse({
      teams: result.teams,
      pendingInvitations: result.pendingInvitations,
      discoverableForTeams: profile?.discoverableForTeams ?? false
    });
  } catch (error) {
    return formatError(error as Error);
  }
}
