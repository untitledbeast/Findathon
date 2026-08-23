import { NextRequest, NextResponse } from 'next/server';
import { createRequestContext } from '@/lib/context/request-context';
import { AuthService } from '@/lib/auth/auth.service';
import { createHackathonModule } from '@/lib/composition';
import { formatError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((val, key) => { headers[key] = val; });
    const context = createRequestContext(user, headers);

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || searchParams.get('q') || undefined;
    const city = searchParams.get('city') || undefined;
    const isOnlineParam = searchParams.get('isOnline');
    const isOnline = isOnlineParam !== null ? isOnlineParam === 'true' : undefined;
    const tagsParam = searchParams.get('tags');
    const tags = tagsParam ? tagsParam.split(',') : undefined;
    const sortBy = (searchParams.get('sortBy') as 'relevance' | 'deadline' | 'prize' | 'rating' | 'newest' | 'trending') || 'relevance';
    const cursor = searchParams.get('cursor') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const { searchHandler } = createHackathonModule();
    const result = await searchHandler.execute(context, {
      query,
      city,
      isOnline,
      tags,
      sortBy,
      cursor,
      limit
    });

    if (!result.ok) {
      const err = formatError(result.error);
      return NextResponse.json({ success: false, error: err }, { status: result.error.statusCode });
    }

    const res = NextResponse.json({
      success: true,
      data: result.value
    });

    res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res;
  } catch (err) {
    const formatted = formatError(err);
    return NextResponse.json({ success: false, error: formatted }, { status: formatted.statusCode });
  }
}
