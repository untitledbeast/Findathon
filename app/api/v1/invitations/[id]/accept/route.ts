import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { createRequestContext } from '@/lib/context/request-context';
import { createTeamCommandService } from '@/lib/services/factories';
import { formatResponse, formatError } from '@/lib/transport/api-response';
import { AuthenticationError } from '@/lib/errors';
import { TeamMapper } from '@/lib/domain/mappers/team.mapper';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const invitationId = resolvedParams.id;
    const user = await AuthService.getUser();
    if (!user) {
      return formatError(new AuthenticationError('Authentication required to accept invitation'));
    }

    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const context = createRequestContext(user, headers);

    const teamCommandService = createTeamCommandService();
    const result = await teamCommandService.acceptInvitation(context, invitationId);

    return formatResponse({
      team: TeamMapper.entityToDTO(result.team),
      member: TeamMapper.memberEntityToDTO(result.member)
    });
  } catch (error) {
    return formatError(error as Error);
  }
}
