import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { formatResponse, formatError } from '@/lib/transport/api-response';
import { AuthenticationError, PermissionError } from '@/lib/errors';
import { AdminProfileRepository } from '@/lib/modules/profile/admin.profile.repository';

const adminProfileRepo = new AdminProfileRepository();

export async function GET(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    if (!user) return formatError(new AuthenticationError('Authentication required'));
    
    if (user.role !== 'admin') {
      return formatError(new PermissionError('Admin access required'));
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const pagination = { page, pageSize };

    const { data: users, total } = await adminProfileRepo.findAll(pagination, search);
    
    return formatResponse({ users, total, page, pageSize });
  } catch (error) {
    return formatError(error as Error);
  }
}
