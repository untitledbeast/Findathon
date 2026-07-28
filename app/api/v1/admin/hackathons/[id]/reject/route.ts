import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { formatResponse, formatError } from '@/lib/transport/api-response';
import { AuthenticationError, PermissionError, ValidationError } from '@/lib/errors';
import { AdminHackathonRepository } from '@/lib/modules/hackathons/admin.repository';

const adminHackathonRepo = new AdminHackathonRepository();

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await AuthService.getUser();
    if (!user) return formatError(new AuthenticationError('Authentication required'));
    
    if (!['admin', 'moderator'].includes(user.role)) {
      return formatError(new PermissionError('Admin or moderator access required'));
    }

    let body;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const { reason } = body;
    if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
      return formatError(new ValidationError('Rejection reason must be at least 10 characters long'));
    }

    await adminHackathonRepo.reject(id, user.id, reason.trim());
    
    return formatResponse({ success: true });
  } catch (error) {
    return formatError(error as Error);
  }
}
