import { NextRequest, NextResponse } from 'next/server';
import { createSearchModule } from '@/lib/composition';
import { formatError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || searchParams.get('query') || '';

    const { suggestionsHandler } = createSearchModule();
    const result = await suggestionsHandler.execute(q);

    if (!result.ok) {
      const err = formatError(result.error);
      return NextResponse.json({ success: false, error: err }, { status: result.error.statusCode });
    }

    const res = NextResponse.json({
      success: true,
      data: result.value
    });

    res.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res;
  } catch (err) {
    const formatted = formatError(err);
    return NextResponse.json({ success: false, error: formatted }, { status: formatted.statusCode });
  }
}
