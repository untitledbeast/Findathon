import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { createRequestContext } from '@/lib/context/request-context';
import { createTeamCommandService, createTeamRepository } from '@/lib/services/factories';
import { formatResponse, formatError } from '@/lib/transport/api-response';
import { AuthenticationError, ValidationError } from '@/lib/errors';
import { TeamMapper } from '@/lib/domain/mappers/team.mapper';

export async function GET(
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

    const teamRepo = createTeamRepository();
    const invitations = await teamRepo.getInvitationsByTeamId(teamId);

    return formatResponse({
      invitations: invitations.map(inv => TeamMapper.invitationEntityToDTO(inv))
    });
  } catch (error) {
    return formatError(error as Error);
  }
}

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
    if (!body || !body.inviteeUserId) {
      return formatError(new ValidationError('inviteeUserId is required'));
    }

    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const context = createRequestContext(user, headers);

    const teamCommandService = createTeamCommandService();
    const invitation = await teamCommandService.inviteMember(context, teamId, {
      inviteeUserId: String(body.inviteeUserId),
      message: body.message ? String(body.message) : undefined
    });

    return formatResponse({
      invitation: TeamMapper.invitationEntityToDTO(invitation)
    }, 201);
  } catch (error) {
    return formatError(error as Error);
  }
}
