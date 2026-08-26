import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { createRequestContext } from '@/lib/context/request-context';
import { createConnectionCommandService } from '@/lib/services/factories';
import { formatResponse, formatError } from '@/lib/transport/api-response';
import { AuthenticationError } from '@/lib/errors';
import { ConnectionMapper } from '@/lib/domain/mappers/connection.mapper';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const connectionId = resolvedParams.id;
    const user = await AuthService.getUser();
    if (!user) {
      return formatError(new AuthenticationError('Authentication required'));
    }

    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const context = createRequestContext(user, headers);

    const commandService = createConnectionCommandService();
    const connection = await commandService.declineRequest(context, connectionId);

    return formatResponse({
      connection: ConnectionMapper.entityToDTO(connection)
    });
  } catch (error) {
    return formatError(error as Error);
  }
}
