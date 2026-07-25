import { NextRequest, NextResponse } from 'next/server';
import { createRequestContext } from '@/lib/context/request-context';
import { AuthService } from '@/lib/auth/auth.service';
import { createNotificationCommandService } from '@/lib/services/factories';
import { formatError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    if (!user) {
      const err = formatError({ message: 'Authentication required', statusCode: 401 });
      return NextResponse.json(err, { status: 401 });
    }

    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => { headers[key] = value; });
    const context = createRequestContext(user, headers);

    const commandService = createNotificationCommandService();
    const result = await commandService.markAllRead(context);

    if (!result.ok) {
      const err = formatError(result.error);
      return NextResponse.json(err, { status: result.error.statusCode });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    const formatted = formatError(err);
    return NextResponse.json(formatted, { status: formatted.statusCode });
  }
}
