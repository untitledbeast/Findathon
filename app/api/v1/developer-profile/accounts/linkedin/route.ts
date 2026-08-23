import { NextRequest } from 'next/server';
import { DELETE as disconnectHandler } from '@/app/api/linkedin/disconnect/route';

export async function DELETE(req: NextRequest) {
  return disconnectHandler(req);
}
