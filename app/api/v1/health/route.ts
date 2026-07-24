import { NextResponse } from 'next/server';
import { checkSystemHealth } from '@/lib/observability/health';

export async function GET() {
  const result = await checkSystemHealth();
  return NextResponse.json(result, { status: result.status === 'healthy' ? 200 : 503 });
}
