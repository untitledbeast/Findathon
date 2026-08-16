import { NextRequest, NextResponse } from 'next/server';
import { createRequestContext } from '@/lib/context/request-context';
import { AuthService } from '@/lib/auth/auth.service';
import { createHackathonQueryService, createHackathonCommandService } from '@/lib/services/factories';
import { editHackathonSchema } from '@/lib/validators/hackathon.schema';
import { validate } from '@/lib/middleware/validate';
import { formatError } from '@/lib/errors';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await AuthService.getUser();
    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => { headers[key] = value; });
    const context = createRequestContext(user, headers);

    const queryService = createHackathonQueryService();
    const result = await queryService.getById(context, id);

    if (!result.ok) {
      const err = formatError(result.error);
      return NextResponse.json({ success: false, error: err }, { status: result.error.statusCode });
    }

    return NextResponse.json({ success: true, data: result.value }, { status: 200 });
  } catch (err) {
    const formatted = formatError(err);
    return NextResponse.json({ success: false, error: formatted }, { status: formatted.statusCode });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await AuthService.getUser();
    if (!user) {
      const err = formatError({ message: 'Authentication required', statusCode: 401 });
      return NextResponse.json({ success: false, error: err }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = validate(editHackathonSchema, body);

    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => { headers[key] = value; });
    const context = createRequestContext(user, headers);

    const commandService = createHackathonCommandService();
    const result = await commandService.update(context, id, validatedData);

    if (!result.ok) {
      const err = formatError(result.error);
      return NextResponse.json({ success: false, error: err }, { status: result.error.statusCode });
    }

    return NextResponse.json({ success: true, data: result.value }, { status: 200 });
  } catch (err) {
    const formatted = formatError(err);
    return NextResponse.json({ success: false, error: formatted }, { status: formatted.statusCode });
  }
}
