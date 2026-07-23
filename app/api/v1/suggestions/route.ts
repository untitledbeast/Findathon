import { NextRequest, NextResponse } from 'next/server';
import { discoveryEngine } from '@/lib/discovery-engine';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || searchParams.get('query') || '';

  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
    });
  }

  try {
    const suggestions = await discoveryEngine.getSuggestions(q);
    return NextResponse.json({
      query: q,
      suggestions
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300'
      }
    });
  } catch (err: unknown) {
    console.error('Suggestions API error:', err);
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}
