import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { createRequestContext } from '@/lib/context/request-context';
import { createDeveloperProfileCommandService } from '@/lib/services/factories';
import { formatResponse, formatError } from '@/lib/transport/api-response';
import { AuthenticationError, ValidationError } from '@/lib/errors';
import { DeveloperProfileMapper } from '@/lib/domain/mappers/developer-profile.mapper';

export async function POST(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    if (!user) {
      return formatError(new AuthenticationError('Authentication required to connect LeetCode'));
    }

    let body: { username?: unknown };
    try {
      body = (await req.json()) as { username?: unknown };
    } catch {
      return formatError(new ValidationError('Invalid JSON request body'));
    }

    const rawUsername = body?.username;
    if (!rawUsername || typeof rawUsername !== 'string') {
      return formatError(new ValidationError('LeetCode username is required'));
    }

    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const context = createRequestContext(user, headers);

    const commandService = createDeveloperProfileCommandService();
    const updated = await commandService.connectLeetCode(context, rawUsername);

    return formatResponse({
      profile: DeveloperProfileMapper.entityToDTO(updated),
      message: 'LeetCode profile connected successfully'
    });
  } catch (error) {
    return formatError(error as Error);
  }
}
