import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { createRequestContext } from '@/lib/context/request-context';
import { createTeamQueryService } from '@/lib/services/factories';
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
      return formatError(new AuthenticationError('Authentication required to view teammate recommendations'));
    }

    const { searchParams } = new URL(req.url);
    const limitParam = parseInt(searchParams.get('limit') || '8', 10);
    const limit = isNaN(limitParam) || limitParam < 1 ? 8 : Math.min(20, limitParam);

    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const context = createRequestContext(user, headers);

    const teamQueryService = createTeamQueryService();
    const result = await teamQueryService.getRecommendedTeammates(context, teamId, { limit });

    return formatResponse(result);
  } catch (error) {
    return formatError(error as Error);
  }
}
