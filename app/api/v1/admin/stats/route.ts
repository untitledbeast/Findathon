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

    const stats = await adminHackathonRepo.getStats();
    return formatResponse(stats);
  } catch (error) {
    return formatError(error as Error);
  }
}
