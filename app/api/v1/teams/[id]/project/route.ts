import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { createRequestContext } from '@/lib/context/request-context';
import { createTeamProjectQueryService, createTeamProjectCommandService } from '@/lib/services/factories';
import { formatResponse, formatError } from '@/lib/transport/api-response';
import { AuthenticationError } from '@/lib/errors';

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

    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const context = createRequestContext(user, headers);

    const projectQueryService = createTeamProjectQueryService();
    const project = await projectQueryService.getProject(teamId, context);

    return formatResponse({ project });
  } catch (error) {
    return formatError(error as Error);
  }
}

export async function PUT(
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

    const body = await req.json();
    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const context = createRequestContext(user, headers);

    const projectCommandService = createTeamProjectCommandService();
    const project = await projectCommandService.upsertProject(
      teamId,
      {
        title: body.title,
        problemStatement: body.problemStatement,
        solutionApproach: body.solutionApproach,
        techStack: body.techStack,
        repositoryUrl: body.repositoryUrl,
        demoUrl: body.demoUrl
      },
      context
    );

    return formatResponse({ project });
  } catch (error) {
    return formatError(error as Error);
  }
}

export async function PATCH(
  req: NextRequest,
  params: { params: Promise<{ id: string }> }
) {
  return PUT(req, params);
}
