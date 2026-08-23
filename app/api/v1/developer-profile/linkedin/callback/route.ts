import { NextRequest } from 'next/server';
import { GET as callbackHandler } from '@/app/api/linkedin/callback/route';

export async function GET(req: NextRequest) {
  return callbackHandler(req);
}
