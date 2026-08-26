import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { createRequestContext } from '@/lib/context/request-context';
import { createTeamCommandService } from '@/lib/services/factories';
import { formatResponse, formatError } from '@/lib/transport/api-response';
import { AuthenticationError, ValidationError } from '@/lib/errors';
import { TeamMapper } from '@/lib/domain/mappers/team.mapper';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const teamId = resolvedParams.id;
    const user = await AuthService.getUser();
    if (!user) {
      return formatError(new AuthenticationError('Authentication required'));
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.newOwnerUserId) {
      return formatError(new ValidationError('newOwnerUserId is required'));
    }

    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const context = createRequestContext(user, headers);

    const teamCommandService = createTeamCommandService();
    const updatedTeam = await teamCommandService.transferOwnership(context, teamId, String(body.newOwnerUserId));

    return formatResponse({
      team: TeamMapper.entityToDTO(updatedTeam)
    });
  } catch (error) {
    return formatError(error as Error);
  }
}
