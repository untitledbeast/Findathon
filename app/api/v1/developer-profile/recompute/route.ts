import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { createRequestContext } from '@/lib/context/request-context';
import { createDeveloperProfileCommandService } from '@/lib/services/factories';
import { formatResponse, formatError } from '@/lib/transport/api-response';
import { AuthenticationError } from '@/lib/errors';
import { DeveloperProfileMapper } from '@/lib/domain/mappers/developer-profile.mapper';

export async function POST(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    if (!user) {
      return formatError(new AuthenticationError('Authentication required to recompute developer profile'));
    }

    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const context = createRequestContext(user, headers);

    const commandService = createDeveloperProfileCommandService();
    const updated = await commandService.recomputeProfile(context);

    return formatResponse({
      profile: DeveloperProfileMapper.entityToDTO(updated)
    });
  } catch (error) {
    return formatError(error as Error);
  }
}
