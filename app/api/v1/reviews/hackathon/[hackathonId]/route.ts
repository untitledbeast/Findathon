import { NextRequest, NextResponse } from 'next/server';
import { createRequestContext } from '@/lib/context/request-context';
import { AuthService } from '@/lib/auth/auth.service';
import { createReviewQueryService } from '@/lib/services/factories';
import { formatError } from '@/lib/errors';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;
    const user = await AuthService.getUser();
    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => { headers[key] = value; });
    const context = createRequestContext(user, headers);

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);

    const queryService = createReviewQueryService();
    const result = await queryService.getByHackathon(context, hackathonId, { page, pageSize });

    if (!result.ok) {
      const err = formatError(result.error);
      return NextResponse.json(err, { status: result.error.statusCode });
    }

    return NextResponse.json({ data: result.value });
  } catch (err) {
    const formatted = formatError(err);
    return NextResponse.json(formatted, { status: formatted.statusCode });
  }
}
