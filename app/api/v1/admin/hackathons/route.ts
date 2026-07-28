import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { formatResponse, formatError } from '@/lib/transport/api-response';
import { AuthenticationError, PermissionError } from '@/lib/errors';
import { AdminHackathonRepository } from '@/lib/modules/hackathons/admin.repository';

const adminHackathonRepo = new AdminHackathonRepository();

export async function GET(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    if (!user) return formatError(new AuthenticationError('Authentication required'));
    
    if (!['admin', 'moderator'].includes(user.role)) {
      return formatError(new PermissionError('Admin or moderator access required'));
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const filters = { status, search };
    const pagination = { page, pageSize };

    const { data: hackathons, total } = await adminHackathonRepo.findAll(filters, pagination);
    
    return formatResponse({ hackathons, total, page, pageSize });
  } catch (error) {
    return formatError(error as Error);
  }
}
