import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { createRequestContext } from '@/lib/context/request-context';
import { createConnectionCommandService, createConnectionQueryService } from '@/lib/services/factories';
import { formatResponse, formatError } from '@/lib/transport/api-response';
import { AuthenticationError, ValidationError } from '@/lib/errors';
import { ConnectionMapper } from '@/lib/domain/mappers/connection.mapper';

export async function GET(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    if (!user) {
      return formatError(new AuthenticationError('Authentication required'));
    }

    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const context = createRequestContext(user, headers);

    const queryService = createConnectionQueryService();
    const result = await queryService.getMyConnections(context);

    return formatResponse(result);
  } catch (error) {
    return formatError(error as Error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    if (!user) {
      return formatError(new AuthenticationError('Authentication required to send connection request'));
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.targetUserId) {
      return formatError(new ValidationError('targetUserId is required'));
    }

    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const context = createRequestContext(user, headers);

    const commandService = createConnectionCommandService();
    const connection = await commandService.sendRequest(context, String(body.targetUserId));

    return formatResponse({
      connection: ConnectionMapper.entityToDTO(connection)
    }, 201);
  } catch (error) {
    return formatError(error as Error);
  }
}
