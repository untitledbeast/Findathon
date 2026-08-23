import { NextRequest } from 'next/server';
import { GET as connectHandler } from '@/app/api/linkedin/connect/route';

export async function GET(req: NextRequest) {
  return connectHandler(req);
}
