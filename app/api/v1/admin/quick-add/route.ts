import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { AdminHackathonRepository } from '@/lib/modules/hackathons/admin.repository';
import { formatError, formatResponse } from '@/lib/transport/api-response';
import { AuthenticationError, PermissionError, ValidationError } from '@/lib/errors';
import { z } from 'zod';

const adminHackathonRepo = new AdminHackathonRepository();

const QuickAddSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(500),
  startDate: z.string(), 
  endDate: z.string(),
  registrationDeadline: z.string().optional().nullable(),
  mode: z.enum(['online', 'offline', 'hybrid']),
  locationCity: z.string().optional().nullable(),
  locationCollege: z.string().optional().nullable(),
  prizePool: z.string().optional().nullable(),
  registerUrl: z.string().url('Must be a valid URL'),
  coverImageUrl: z.string().url().optional().or(z.literal('')).nullable(),
  sourceUrl: z.string().url().optional().or(z.literal('')).nullable(),
  tags: z.array(z.string()).min(1).max(5),
  organizer: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    if (!user) return formatError(new AuthenticationError('Authentication required'));

    // Verify role is admin or moderator
    const { getProfile } = await import('@/lib/supabase');
    const profile = await getProfile(user.id);
    if (!profile || (profile.role !== 'admin' && profile.role !== 'moderator')) {
      return formatError(new PermissionError('Admin or moderator access required'));
    }

    const body = await req.json();
    const validatedData = QuickAddSchema.parse(body);

    if (new Date(validatedData.endDate) < new Date(validatedData.startDate)) {
      return formatError(new ValidationError('End date must be after start date'));
    }

    if ((validatedData.mode === 'offline' || validatedData.mode === 'hybrid') && !validatedData.locationCity) {
      return formatError(new ValidationError('City is required for offline/hybrid events'));
    }

    const hackathonData = {
      title: validatedData.title,
      description: validatedData.description,
      start_date: validatedData.startDate,
      end_date: validatedData.endDate,
      registration_deadline: validatedData.registrationDeadline || null,
      mode: validatedData.mode === 'online' ? 'Online' : validatedData.mode === 'offline' ? 'Offline' : 'Hybrid',
      is_online: validatedData.mode === 'online',
      location_city: validatedData.locationCity || null,
      location_college: validatedData.locationCollege || null,
      prize_pool: validatedData.prizePool || null,
      register_url: validatedData.registerUrl,
      cover_image: validatedData.coverImageUrl || null,
      tags: validatedData.tags,
      organizer: validatedData.organizer || 'Unknown Organizer',
      source: validatedData.sourceUrl || null,
      status: 'approved',
      submitted_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const hackathon = await adminHackathonRepo.create(hackathonData);

    return formatResponse({ success: true, hackathon });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return formatError(new ValidationError(error.issues[0].message));
    }
    return formatError(error as Error);
  }
}
