import { NextRequest, NextResponse } from 'next/server';
import { createRequestContext } from '@/lib/context/request-context';
import { AuthService } from '@/lib/auth/auth.service';
import { createReviewCommandService } from '@/lib/services/factories';
import { createReviewSchema } from '@/lib/validators/review.schema';
import { validate } from '@/lib/middleware/validate';
import { formatError } from '@/lib/errors';
import { checkRateLimit } from '@/lib/middleware/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    if (!user) {
      const err = formatError({ message: 'Authentication required', statusCode: 401 });
      return NextResponse.json(err, { status: 401 });
    }

    checkRateLimit(`review:${user.id}`, 3, 86400000);

    const body = await req.json();
    const validated = validate(createReviewSchema, body);

    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => { headers[key] = value; });
    const context = createRequestContext(user, headers);

    const commandService = createReviewCommandService();
    const result = await commandService.create(context, {
      hackathonId: validated.hackathonId,
      rating: validated.rating,
      title: validated.title || 'Review',
      body: validated.comment || '',
      organizationQuality: validated.organizationQuality || 5,
      prizeTransparency: validated.prizeTransparency || 5,
      mentorship: validated.mentorship || 5
    });

    if (!result.ok) {
      const err = formatError(result.error);
      return NextResponse.json(err, { status: result.error.statusCode });
    }

    return NextResponse.json({ data: result.value }, { status: 201 });
  } catch (err) {
    const formatted = formatError(err);
    return NextResponse.json(formatted, { status: formatted.statusCode });
  }
}
