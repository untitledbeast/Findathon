import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { createRequestContext } from '@/lib/context/request-context';
import { createTeamCommandService } from '@/lib/services/factories';
import { formatResponse, formatError } from '@/lib/transport/api-response';
import { AuthenticationError, ValidationError } from '@/lib/errors';
import { TeamMapper } from '@/lib/domain/mappers/team.mapper';

export async function POST(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    if (!user) {
      return formatError(new AuthenticationError('Authentication required to create a team'));
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.hackathonId || !body.name) {
      return formatError(new ValidationError('hackathonId and name are required'));
    }

    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const context = createRequestContext(user, headers);

    const teamCommandService = createTeamCommandService();
    const createdTeam = await teamCommandService.createTeam(context, {
      hackathonId: String(body.hackathonId),
      name: String(body.name),
      description: body.description ? String(body.description) : null,
      visibility: body.visibility === 'public' ? 'public' : 'private',
      maxMembers: typeof body.maxMembers === 'number' ? body.maxMembers : undefined
    });

    return formatResponse({
      team: TeamMapper.entityToDTO(createdTeam, 1)
    }, 201);
  } catch (error) {
    return formatError(error as Error);
  }
}
