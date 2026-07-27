import { NextResponse } from 'next/server';
import { formatError } from '@/lib/errors';

export async function GET() {
  try {
    const trendingTags = [
      { name: 'AI & ML', slug: 'ai', icon: '🤖', count: 324, category: 'ai' },
      { name: 'Web3 & Blockchain', slug: 'web3', icon: '⛓', count: 248, category: 'web3' },
      { name: 'Cybersecurity', slug: 'cybersecurity', icon: '🛡', count: 186, category: 'cyber' },
      { name: 'Cloud Native', slug: 'cloud', icon: '☁', count: 196, category: 'cloud' },
      { name: 'Mobile Apps', slug: 'mobile', icon: '📱', count: 156, category: 'mobile' },
      { name: 'Blockchain', slug: 'blockchain', icon: '🔗', count: 214, category: 'web3' },
      { name: 'Data Science', slug: 'data-science', icon: '📊', count: 172, category: 'ai' },
      { name: 'Game Dev', slug: 'game-dev', icon: '🎮', count: 134, category: 'game' }
    ];

    const res = NextResponse.json({
      success: true,
      data: trendingTags
    });

    res.headers.set('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
    return res;
  } catch (err) {
    const formatted = formatError(err);
    return NextResponse.json({ success: false, error: formatted }, { status: formatted.statusCode });
  }
}
