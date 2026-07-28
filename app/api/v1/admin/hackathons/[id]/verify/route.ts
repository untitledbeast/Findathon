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
    
    // Verification requires admin role only, not moderator
    if (user.role !== 'admin') {
      return formatError(new PermissionError('Admin access required'));
    }

    let body;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    if (typeof body.verified !== 'boolean') {
      return formatError(new ValidationError('Verified status must be a boolean'));
    }

    await adminHackathonRepo.toggleVerified(id, body.verified);
    
    return formatResponse({ success: true, verified: body.verified });
  } catch (error) {
    return formatError(error as Error);
  }
}
