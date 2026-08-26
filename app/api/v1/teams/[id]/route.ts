import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { createRequestContext } from '@/lib/context/request-context';
import { createTeamQueryService, createTeamCommandService } from '@/lib/services/factories';
import { formatResponse, formatError } from '@/lib/transport/api-response';
import { AuthenticationError } from '@/lib/errors';
import { TeamMapper } from '@/lib/domain/mappers/team.mapper';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const teamId = resolvedParams.id;
    const user = await AuthService.getUser();

    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const context = createRequestContext(user, headers);

    const teamQueryService = createTeamQueryService();
    const result = await teamQueryService.getTeamById(context, teamId);

    return formatResponse(result);
  } catch (error) {
    return formatError(error as Error);
  }
}

export async function PATCH(
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

    const body = await req.json().catch(() => ({}));
    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const context = createRequestContext(user, headers);

    const teamCommandService = createTeamCommandService();
    const updated = await teamCommandService.updateTeam(context, teamId, {
      name: body.name,
      description: body.description,
      visibility: body.visibility
    });

    return formatResponse({
      team: TeamMapper.entityToDTO(updated)
    });
  } catch (error) {
    return formatError(error as Error);
  }
}

export async function DELETE(
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

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('userId') || user.id;

    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const context = createRequestContext(user, headers);

    const teamCommandService = createTeamCommandService();
    const result = await teamCommandService.leaveOrRemoveMember(context, teamId, targetUserId);

    return formatResponse(result);
  } catch (error) {
    return formatError(error as Error);
  }
}
