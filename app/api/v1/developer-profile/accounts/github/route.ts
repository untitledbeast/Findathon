import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { createRequestContext } from '@/lib/context/request-context';
import { createDeveloperProfileCommandService } from '@/lib/services/factories';
import { formatResponse, formatError } from '@/lib/transport/api-response';
import { AuthenticationError } from '@/lib/errors';
import { DeveloperProfileMapper } from '@/lib/domain/mappers/developer-profile.mapper';

export async function DELETE(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    if (!user) {
      return formatError(new AuthenticationError('Authentication required to disconnect GitHub'));
    }

    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const context = createRequestContext(user, headers);

    const commandService = createDeveloperProfileCommandService();
    const updated = await commandService.disconnectGitHub(context);

    return formatResponse({
      profile: DeveloperProfileMapper.entityToDTO(updated),
      message: 'GitHub account disconnected successfully'
    });
  } catch (error) {
    return formatError(error as Error);
  }
}
