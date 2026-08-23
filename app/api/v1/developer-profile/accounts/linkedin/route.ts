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
    if (!user || !user.id) {
      return formatError(new AuthenticationError('Authentication required to disconnect LinkedIn'));
    }

    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const context = createRequestContext(user, headers);

    const commandService = createDeveloperProfileCommandService();
    const updated = await commandService.disconnectLinkedIn(context);

    return formatResponse({
      profile: DeveloperProfileMapper.entityToDTO(updated),
      message: 'LinkedIn account disconnected successfully'
    });
  } catch (error) {
    return formatError(error as Error);
  }
}
