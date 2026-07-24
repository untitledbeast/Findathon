import { NextResponse } from 'next/server';
import { checkSystemHealth } from '@/lib/observability/health';

export async function GET() {
  const result = await checkSystemHealth();
  return NextResponse.json({ ready: result.checks.database && result.checks.storage }, { status: result.checks.database ? 200 : 503 });
}
