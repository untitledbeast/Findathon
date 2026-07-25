import { NextRequest, NextResponse } from 'next/server';
import { createRequestContext } from '@/lib/context/request-context';
import { AuthService } from '@/lib/auth/auth.service';
import { createBookmarkQueryService, createBookmarkCommandService } from '@/lib/services/factories';
import { bookmarkSchema } from '@/lib/validators/bookmark.schema';
import { validate } from '@/lib/middleware/validate';
import { formatError } from '@/lib/errors';
import { checkRateLimit } from '@/lib/middleware/rate-limit';

export async function GET(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    if (!user) {
      const err = formatError({ message: 'Authentication required', statusCode: 401 });
      return NextResponse.json(err, { status: 401 });
    }

    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => { headers[key] = value; });
    const context = createRequestContext(user, headers);

    const queryService = createBookmarkQueryService();
    const result = await queryService.getByUser(context);

    if (!result.ok) {
      const err = formatError(result.error);
      return NextResponse.json(err, { status: result.error.statusCode });
    }

    return NextResponse.json({ data: result.value });
  } catch (err) {
    const formatted = formatError(err);
    return NextResponse.json(formatted, { status: formatted.statusCode });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    if (!user) {
      const err = formatError({ message: 'Authentication required', statusCode: 401 });
      return NextResponse.json(err, { status: 401 });
    }

    checkRateLimit(`bookmark:${user.id}`, 30, 60000);

    const body = await req.json();
    const { hackathonId } = validate(bookmarkSchema, body);

    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => { headers[key] = value; });
    const context = createRequestContext(user, headers);

    const commandService = createBookmarkCommandService();
    const result = await commandService.toggle(context, hackathonId);

    if (!result.ok) {
      const err = formatError(result.error);
      return NextResponse.json(err, { status: result.error.statusCode });
    }

    return NextResponse.json({ data: result.value });
  } catch (err) {
    const formatted = formatError(err);
    return NextResponse.json(formatted, { status: formatted.statusCode });
  }
}
