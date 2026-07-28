import { NextRequest, NextResponse } from 'next/server';
import { createRequestContext } from '@/lib/context/request-context';
import { AuthService } from '@/lib/auth/auth.service';
import { createHackathonQueryService, createHackathonCommandService } from '@/lib/services/factories';
import { HackathonSearchSpecification } from '@/lib/domain/specifications';
import { Pagination } from '@/lib/domain/value-objects';
import { submitHackathonSchema } from '@/lib/validators/hackathon.schema';
import { validate } from '@/lib/middleware/validate';
import { formatError } from '@/lib/errors';
import { checkRateLimit } from '@/lib/middleware/rate-limit';
import { GeocodeService } from '@/lib/services/geocode.service';

export async function GET(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => { headers[key] = value; });
    const context = createRequestContext(user, headers);

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || undefined;
    const city = searchParams.get('city') || undefined;
    const mode = (searchParams.get('mode') as 'online' | 'offline' | 'hybrid') || undefined;
    const isOnlineParam = searchParams.get('isOnline');
    const isOnline = isOnlineParam !== null ? isOnlineParam === 'true' : undefined;
    const tagsParam = searchParams.get('tags');
    const tags = tagsParam ? tagsParam.split(',') : undefined;

    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '12', 10);

    const spec = new HackathonSearchSpecification({
      query,
      city,
      mode,
      isOnline,
      tags,
      pagination: new Pagination(page, pageSize)
    });

    const queryService = createHackathonQueryService();
    const result = await queryService.getAll(context, spec);

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

export async function POST(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    if (!user) {
      const err = formatError({ message: 'Authentication required', statusCode: 401 });
      return NextResponse.json(err, { status: 401 });
    }

    checkRateLimit(`submit:${user.id}`, 5, 3600000);

    const body = await req.json();
    const validatedData = validate(submitHackathonSchema, body);

    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => { headers[key] = value; });
    const context = createRequestContext(user, headers);

    const commandService = createHackathonCommandService();
    const result = await commandService.create(context, {
      ...validatedData,
      registrationDeadline: validatedData.registrationDeadline || validatedData.startDate
    });

    if (!result.ok) {
      const err = formatError(result.error);
      return NextResponse.json(err, { status: result.error.statusCode });
    }

    // Trigger background geocoding for offline/hybrid events
    if (!validatedData.isOnline && (validatedData.locationCity || validatedData.locationCollege)) {
      GeocodeService.geocodeAndSaveHackathon(
        result.value.id,
        validatedData.locationCity,
        validatedData.locationCollege
      ).catch(() => {});
    }

    return NextResponse.json({ data: result.value }, { status: 201 });
  } catch (err) {
    const formatted = formatError(err);
    return NextResponse.json(formatted, { status: formatted.statusCode });
  }
}
