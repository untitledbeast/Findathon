import { NextRequest, NextResponse } from 'next/server';
import { createRequestContext } from '@/lib/context/request-context';
import { AuthService } from '@/lib/auth/auth.service';
import { createProfileModule } from '@/lib/composition';
import { formatError } from '@/lib/errors';
import { z } from 'zod';

const ProfileUpdateSchema = z.object({
  fullName: z.string().optional(),
  avatarUrl: z.string().nullable().optional(),
  bio: z.string().optional(),
  organization: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  socialTwitter: z.string().optional(),
  socialLinkedin: z.string().optional(),
  socialInstagram: z.string().optional(),
  socialDiscord: z.string().optional(),
  skills: z.array(z.string()).optional(),
  interests: z.array(z.string()).optional(),
  isFirstLogin: z.boolean().optional(),
  onboardingComplete: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((val, key) => { headers[key] = val; });
    const context = createRequestContext(user, headers);

    const { service } = createProfileModule();
    const result = await service.getProfile(context);

    if (!result.ok) {
      const err = formatError(result.error);
      return NextResponse.json({ success: false, error: err }, { status: result.error.statusCode });
    }

    return NextResponse.json({ success: true, data: result.value });
  } catch (err) {
    const formatted = formatError(err);
    return NextResponse.json({ success: false, error: formatted }, { status: formatted.statusCode });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ProfileUpdateSchema.parse(body);

    const user = await AuthService.getUser();
    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((val, key) => { headers[key] = val; });
    const context = createRequestContext(user, headers);

    const { service } = createProfileModule();
    const result = await service.updateProfile(context, parsed);

    if (!result.ok) {
      const err = formatError(result.error);
      return NextResponse.json({ success: false, error: err }, { status: result.error.statusCode });
    }

    return NextResponse.json({ success: true, data: result.value });
  } catch (err) {
    const formatted = formatError(err);
    return NextResponse.json({ success: false, error: formatted }, { status: formatted.statusCode });
  }
}
