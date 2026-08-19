import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { createRequestContext } from '@/lib/context/request-context';
import { createHackathonRecommendationService } from '@/lib/services/factories';
import { formatResponse, formatError } from '@/lib/transport/api-response';

export async function GET(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const context = createRequestContext(user, headers);

    const { searchParams } = new URL(req.url);
    const modeParam = searchParams.get('mode');
    const domainParam = searchParams.get('domain');
    const searchParam = searchParams.get('search');
    const pageParam = parseInt(searchParams.get('page') || '1', 10);
    const limitParam = parseInt(searchParams.get('limit') || '6', 10);

    const mode = (modeParam === 'online' || modeParam === 'in-person') ? modeParam : undefined;
    const domain = domainParam ? domainParam.trim() : undefined;
    const search = searchParam ? searchParam.trim() : undefined;
    const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const limit = isNaN(limitParam) || limitParam < 1 ? 6 : Math.min(20, limitParam);

    const recommendationService = createHackathonRecommendationService();
    const result = await recommendationService.getRecommendations(context, {
      mode,
      domain,
      search,
      page,
      limit
    });

    return formatResponse(result);
  } catch (error) {
    return formatError(error as Error);
  }
}
