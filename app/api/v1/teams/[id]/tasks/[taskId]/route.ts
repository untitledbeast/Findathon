import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { createRequestContext } from '@/lib/context/request-context';
import { createTeamTaskQueryService, createTeamTaskCommandService } from '@/lib/services/factories';
import { formatResponse, formatError } from '@/lib/transport/api-response';
import { AuthenticationError } from '@/lib/errors';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id: teamId, taskId } = resolvedParams;
    const user = await AuthService.getUser();
    if (!user) {
      return formatError(new AuthenticationError('Authentication required'));
    }

    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const context = createRequestContext(user, headers);

    const taskQueryService = createTeamTaskQueryService();
    const task = await taskQueryService.getTaskById(teamId, taskId, context);

    return formatResponse({ task });
  } catch (error) {
    return formatError(error as Error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id: teamId, taskId } = resolvedParams;
    const user = await AuthService.getUser();
    if (!user) {
      return formatError(new AuthenticationError('Authentication required'));
    }

    const body = await req.json();
    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const context = createRequestContext(user, headers);

    const taskCommandService = createTeamTaskCommandService();
    const task = await taskCommandService.updateTask(
      teamId,
      taskId,
      {
        title: body.title,
        description: body.description,
        status: body.status,
        priority: body.priority,
        assignedTo: body.assignedTo,
        dueAt: body.dueAt
      },
      context
    );

    return formatResponse({ task });
  } catch (error) {
    return formatError(error as Error);
  }
}
