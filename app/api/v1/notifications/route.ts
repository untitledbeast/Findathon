import { NextRequest, NextResponse } from 'next/server';
import { createRequestContext } from '@/lib/context/request-context';
import { AuthService } from '@/lib/auth/auth.service';
import { createNotificationQueryService } from '@/lib/services/factories';
import { formatError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    if (!user) {
      const err = formatError({ message: 'Authentication required', statusCode: 401 });
      return NextResponse.json({ success: false, error: err }, { status: 401 });
    }

    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => { headers[key] = value; });
    const context = createRequestContext(user, headers);

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const queryService = createNotificationQueryService();
    const result = await queryService.getForUser(context, { page, pageSize });

    if (!result.ok) {
      const err = formatError(result.error);
      return NextResponse.json({ success: false, error: err }, { status: result.error.statusCode });
    }

    return NextResponse.json({ success: true, data: result.value }, { status: 200 });
  } catch (err) {
    const formatted = formatError(err);
    return NextResponse.json({ success: false, error: formatted }, { status: formatted.statusCode });
  }
}
