import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { createRequestContext } from '@/lib/context/request-context';
import { createConnectionCommandService, createConnectionQueryService } from '@/lib/services/factories';
import { formatResponse, formatError } from '@/lib/transport/api-response';
import { AuthenticationError, ValidationError } from '@/lib/errors';

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
    const blockedUsers = await queryService.getBlockedUsers(context);

    return formatResponse({ blockedUsers });
  } catch (error) {
    return formatError(error as Error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    if (!user) {
      return formatError(new AuthenticationError('Authentication required'));
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
    const block = await commandService.blockUser(context, String(body.targetUserId));

    return formatResponse({
      blockedUserId: block.blockedUserId,
      status: 'blocked'
    }, 201);
  } catch (error) {
    return formatError(error as Error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    if (!user) {
      return formatError(new AuthenticationError('Authentication required'));
    }

    const body = await req.json().catch(() => null);
    const targetUserId = body?.targetUserId || req.nextUrl.searchParams.get('targetUserId');

    if (!targetUserId) {
      return formatError(new ValidationError('targetUserId is required'));
    }

    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const context = createRequestContext(user, headers);

    const commandService = createConnectionCommandService();
    await commandService.unblockUser(context, String(targetUserId));

    return formatResponse({
      unblockedUserId: targetUserId,
      status: 'unblocked'
    });
  } catch (error) {
    return formatError(error as Error);
  }
}
