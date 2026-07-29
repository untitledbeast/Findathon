import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { formatResponse, formatError } from '@/lib/transport/api-response';
import { BaseError } from '@/lib/errors';
import { AuthService } from '@/lib/auth/auth.service';

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
});

export async function GET(req: NextRequest) {
  try {
    const user = await AuthService.requireAuth();
    
    // We use the anon key client since it's an authenticated user request relying on RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization') || '',
          }
        }
      }
    );

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      throw new BaseError('Profile not found', 'NOT_FOUND', 404);
    }

    return formatResponse({
      id: data.id,
      fullName: data.full_name,
      avatarUrl: data.avatar_url,
      bio: data.bio,
      organization: data.organization,
      phone: data.phone,
      website: data.website,
      email: data.email,
      role: data.role,
      socialTwitter: data.social_twitter,
      socialLinkedin: data.social_linkedin,
      socialInstagram: data.social_instagram,
      socialDiscord: data.social_discord,
      xpPoints: data.xp_points || 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
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
    const user = await AuthService.requireAuth();
    const body = await req.json();
    const parsed = updateProfileSchema.parse(body);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization') || '',
          }
        }
      }
    );

    const updateData: Record<string, string> = {};
    if (parsed.fullName !== undefined) updateData.full_name = parsed.fullName;
    if (parsed.bio !== undefined) updateData.bio = parsed.bio;
    if (parsed.organization !== undefined) updateData.organization = parsed.organization;
    if (parsed.phone !== undefined) updateData.phone = parsed.phone;
    if (parsed.website !== undefined) updateData.website = parsed.website;
    if (parsed.socialTwitter !== undefined) updateData.social_twitter = parsed.socialTwitter;
    if (parsed.socialLinkedin !== undefined) updateData.social_linkedin = parsed.socialLinkedin;
    if (parsed.socialInstagram !== undefined) updateData.social_instagram = parsed.socialInstagram;
    if (parsed.socialDiscord !== undefined) updateData.social_discord = parsed.socialDiscord;

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      throw new BaseError('Failed to update profile', 'UPDATE_ERROR', 500);
    }

    return formatResponse({
      id: data.id,
      fullName: data.full_name,
      avatarUrl: data.avatar_url,
      bio: data.bio,
      organization: data.organization,
      phone: data.phone,
      website: data.website,
      email: data.email,
      role: data.role,
      socialTwitter: data.social_twitter,
      socialLinkedin: data.social_linkedin,
      socialInstagram: data.social_instagram,
      socialDiscord: data.social_discord,
      xpPoints: data.xp_points || 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return formatError(new BaseError(err.issues[0].message, 'VALIDATION_ERROR', 400));
    }
    if (err instanceof BaseError) {
      return formatError(err);
    }
    return formatError(new BaseError('Failed to update profile', 'INTERNAL_ERROR', 500));
  }
}
