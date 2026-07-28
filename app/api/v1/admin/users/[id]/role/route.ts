import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { formatResponse, formatError } from '@/lib/transport/api-response';
import { AuthenticationError, PermissionError, ValidationError } from '@/lib/errors';
import { AdminProfileRepository } from '@/lib/modules/profile/admin.profile.repository';

const adminProfileRepo = new AdminProfileRepository();

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await AuthService.getUser();
    if (!user) return formatError(new AuthenticationError('Authentication required'));
    
    if (user.role !== 'admin') {
      return formatError(new PermissionError('Admin access required'));
    }

    if (user.id === id) {
      return formatError(new PermissionError('Cannot change your own role'));
    }

    let body;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const { role } = body;
    if (!role || !['user', 'organizer', 'moderator', 'admin'].includes(role)) {
      return formatError(new ValidationError('Invalid role specified'));
    }

    await adminProfileRepo.updateRole(id, role);
    
    return formatResponse({ success: true });
  } catch (error) {
    return formatError(error as Error);
  }
}
