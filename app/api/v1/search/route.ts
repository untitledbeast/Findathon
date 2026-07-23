import { NextRequest, NextResponse } from 'next/server';
import { discoveryEngine } from '@/lib/discovery-engine';
import { SearchFilters } from '@/lib/types/search';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const filters: SearchFilters = {
    query: searchParams.get('q') || searchParams.get('query') || undefined,
    tags: searchParams.get('tags')?.split(',') || undefined,
    isOnline: searchParams.get('online') === 'true' ? true : searchParams.get('online') === 'false' ? false : undefined,
    difficulty: (searchParams.get('difficulty') as SearchFilters['difficulty']) || undefined,
    prizeMin: searchParams.get('prize') ? Number(searchParams.get('prize')) : undefined,
    city: searchParams.get('city') || undefined,
    statusFilter: (searchParams.get('status') as SearchFilters['statusFilter']) || 'all',
    limit: Math.min(Number(searchParams.get('limit') || 20), 100),
    offset: Number(searchParams.get('offset') || 0)
  };

  try {
    const response = await discoveryEngine.discover(filters, 'spotlight');
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
      }
    });
  } catch (err: unknown) {
    console.error('Search API error:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
