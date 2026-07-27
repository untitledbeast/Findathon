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

    const { searchHandler } = createHackathonModule();
    const searchRes = await searchHandler.execute(context, { limit: 6 });

    if (!searchRes.ok) {
      const err = formatError(searchRes.error);
      return NextResponse.json({ success: false, error: err }, { status: searchRes.error.statusCode });
    }

    const recommended = searchRes.value.hackathons.map(h => ({
      ...h,
      recommendationReason: 'Matches your interest in AI & Web3'
    }));

    const res = NextResponse.json({
      success: true,
      data: recommended
    });

    res.headers.set('Cache-Control', 'private, s-maxage=600, stale-while-revalidate=1200');
    return res;
  } catch (err) {
    const formatted = formatError(err);
    return NextResponse.json({ success: false, error: formatted }, { status: formatted.statusCode });
  }
}
