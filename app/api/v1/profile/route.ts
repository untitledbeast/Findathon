import { NextRequest } from 'next/server';
import { z } from 'zod';
import { formatResponse, formatError } from '@/lib/transport/api-response';
import { BaseError, AuthenticationError, ValidationError } from '@/lib/errors';
import { AuthService } from '@/lib/auth/auth.service';
import { createProfileRepository } from '@/lib/services/factories';

const updateProfileSchema = z.object({
  fullName: z.string().optional(),
  bio: z.string().max(200).optional(),
  organization: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  socialTwitter: z.string().optional(),
  socialLinkedin: z.string().url().optional().or(z.literal('')),
  socialInstagram: z.string().optional(),
  socialDiscord: z.string().optional(),
  discoverableForTeams: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    if (!user) {
      return formatError(new AuthenticationError('Authentication required to view profile'));
    }

    const profileRepo = createProfileRepository();
    const profile = await profileRepo.findById(user.id);

    if (!profile) {
      // Safe fallback / initial profile for authenticated user
      return formatResponse({
        id: user.id,
        fullName: user.fullName || 'Developer User',
        avatarUrl: user.avatarUrl || null,
        bio: null,
        organization: null,
        phone: null,
        website: null,
        email: user.email || null,
        role: user.role || 'user',
        socialTwitter: null,
        socialLinkedin: null,
        socialInstagram: null,
        socialDiscord: null,
        discoverableForTeams: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return formatResponse({
      id: profile.id,
      fullName: profile.fullName,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
      organization: profile.organization,
      phone: profile.phone,
      website: profile.website,
      email: user.email,
      role: profile.role,
      socialTwitter: profile.socialTwitter,
      socialLinkedin: profile.socialLinkedin,
      socialInstagram: profile.socialInstagram,
      socialDiscord: profile.socialDiscord,
      discoverableForTeams: profile.discoverableForTeams ?? false,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    });
  } catch (err: unknown) {
    if (err instanceof BaseError) {
      return formatError(err);
    }
    return formatError(new BaseError('Failed to fetch profile', 'INTERNAL_ERROR', 500));
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    if (!user) {
      return formatError(new AuthenticationError('Authentication required to update profile'));
    }

    const body = await req.json();
    const parsed = updateProfileSchema.parse(body);

    const profileRepo = createProfileRepository();
    const updated = await profileRepo.upsert(user.id, parsed);

    return formatResponse({
      id: updated.id,
      fullName: updated.fullName,
      avatarUrl: updated.avatarUrl,
      bio: updated.bio,
      organization: updated.organization,
      phone: updated.phone,
      website: updated.website,
      email: user.email,
      role: updated.role,
      socialTwitter: updated.socialTwitter,
      socialLinkedin: updated.socialLinkedin,
      socialInstagram: updated.socialInstagram,
      socialDiscord: updated.socialDiscord,
      discoverableForTeams: updated.discoverableForTeams ?? false,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return formatError(new ValidationError(err.issues[0].message));
    }
    if (err instanceof BaseError) {
      return formatError(err);
    }
    return formatError(new BaseError('Failed to update profile', 'INTERNAL_ERROR', 500));
  }
}
