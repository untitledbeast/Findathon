import { NextRequest, NextResponse } from 'next/server';
import { createRequestContext } from '@/lib/context/request-context';
import { AuthService } from '@/lib/auth/auth.service';
import { createSearchQueryService } from '@/lib/services/factories';
import { searchSchema } from '@/lib/validators/search.schema';
import { validate } from '@/lib/middleware/validate';
import { formatError } from '@/lib/errors';
import { checkRateLimit } from '@/lib/middleware/rate-limit';

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    checkRateLimit(`search:${ip}`, 60, 60000);

    const { searchParams } = new URL(req.url);
    const rawParams = {
      query: searchParams.get('q') || searchParams.get('query') || undefined,
      city: searchParams.get('city') || undefined,
      mode: searchParams.get('mode') || undefined,
      tags: searchParams.get('tags') ? searchParams.get('tags')!.split(',') : undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 12
    };

    const validated = validate(searchSchema, rawParams);

    const user = await AuthService.getUser();
    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => { headers[key] = value; });
    const context = createRequestContext(user, headers);

    const searchQueryService = createSearchQueryService();
    const result = await searchQueryService.search(context, {
      query: validated.query,
      filters: {
        city: validated.city,
        mode: validated.mode === 'all' ? undefined : validated.mode,
        tags: validated.tags
      },
      pagination: { page: validated.page, pageSize: validated.pageSize }
    });

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
