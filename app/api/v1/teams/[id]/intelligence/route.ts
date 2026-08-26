import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { createRequestContext } from '@/lib/context/request-context';
import { createTeamQueryService } from '@/lib/services/factories';
import { formatResponse, formatError } from '@/lib/transport/api-response';

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
    const result = await teamQueryService.getTeamIntelligence(context, teamId);

    return formatResponse(result);
  } catch (error) {
    return formatError(error as Error);
  }
}
