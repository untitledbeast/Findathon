import { NextRequest, NextResponse } from 'next/server';
import { createRequestContext } from '@/lib/context/request-context';
import { AuthService } from '@/lib/auth/auth.service';
import { createNotificationCommandService } from '@/lib/services/factories';
import { markReadSchema } from '@/lib/validators/notification.schema';
import { validate } from '@/lib/middleware/validate';
import { formatError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    if (!user) {
      const err = formatError({ message: 'Authentication required', statusCode: 401 });
      return NextResponse.json({ success: false, error: err }, { status: 401 });
    }

    const body = await req.json();
    const { notificationId } = validate(markReadSchema, body);

    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => { headers[key] = value; });
    const context = createRequestContext(user, headers);

    const commandService = createNotificationCommandService();
    const result = await commandService.markRead(context, notificationId);

    if (!result.ok) {
      const err = formatError(result.error);
      return NextResponse.json({ success: false, error: err }, { status: result.error.statusCode });
    }

    return NextResponse.json({ success: true, data: { success: true } }, { status: 200 });
  } catch (err) {
    const formatted = formatError(err);
    return NextResponse.json({ success: false, error: formatted }, { status: formatted.statusCode });
  }
}
