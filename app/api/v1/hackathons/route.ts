import { NextRequest, NextResponse } from 'next/server';
import { createRequestContext } from '@/lib/context/request-context';
import { AuthService } from '@/lib/auth/auth.service';
import {
  createHackathonQueryService,
  createHackathonCommandService
} from '@/lib/services/factories';
import { HackathonSearchSpecification } from '@/lib/domain/specifications';
import { Pagination } from '@/lib/domain/value-objects';
import { submitHackathonSchema } from '@/lib/validators/hackathon.schema';
import { validate } from '@/lib/middleware/validate';
import { formatError } from '@/lib/errors';
import { checkRateLimit } from '@/lib/middleware/rate-limit';
import { GeocodeService } from '@/lib/services/geocode.service';

/**
 * GET /api/v1/hackathons
 *
 * Used for discovering/searching hackathons.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await AuthService.getUser();

    // Build request context
    const headers: Record<string, string | undefined> = {};

    req.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const context = createRequestContext(user, headers);

    // Read query parameters
    const { searchParams } = new URL(req.url);

    const query =
      searchParams.get('query') || undefined;

    const city =
      searchParams.get('city') || undefined;

    const modeParam =
      searchParams.get('mode');

    const mode =
      modeParam === 'online' ||
        modeParam === 'offline' ||
        modeParam === 'hybrid'
        ? modeParam
        : undefined;

    const isOnlineParam =
      searchParams.get('isOnline');

    const isOnline =
      isOnlineParam !== null
        ? isOnlineParam === 'true'
        : undefined;

    const tagsParam =
      searchParams.get('tags');

    const tags =
      tagsParam
        ? tagsParam
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
        : undefined;

    const page =
      parseInt(
        searchParams.get('page') || '1',
        10
      );

    const pageSize =
      parseInt(
        searchParams.get('pageSize') || '12',
        10
      );

    // Build search specification
    const spec =
      new HackathonSearchSpecification({
        query,
        city,
        mode,
        isOnline,
        tags,
        pagination: new Pagination(
          page,
          pageSize
        )
      });

    // Execute query
    const queryService =
      createHackathonQueryService();

    const result =
      await queryService.getAll(
        context,
        spec
      );

    // Handle domain/service error
    if (!result.ok) {
      const errorResponse =
        formatError(result.error);

      return NextResponse.json(
        errorResponse,
        {
          status:
            result.error.statusCode
        }
      );
    }

    /**
     * IMPORTANT:
     *
     * transportClient expects:
     *
     * {
     *   success: true,
     *   data: ...
     * }
     *
     * Do NOT return only { data: ... }.
     */
    return NextResponse.json(
      {
        success: true,
        data: result.value
      },
      {
        status: 200
      }
    );
  } catch (err) {
    const formatted =
      formatError(err);

    return NextResponse.json(
      formatted,
      {
        status:
          formatted.statusCode
      }
    );
  }
}


/**
 * POST /api/v1/hackathons
 *
 * Creates a new hackathon submission.
 *
 * The submission is associated with the
 * authenticated user through:
 *
 * submittedBy: user.id
 *
 * The hackathon should initially remain
 * pending/unapproved according to the
 * command/domain implementation.
 */
export async function POST(req: NextRequest) {
  try {
    // --------------------------------------------------
    // 1. Authenticate user
    // --------------------------------------------------

    const user =
      await AuthService.getUser();

    if (!user) {
      const errorResponse =
        formatError({
          message:
            'Authentication required',
          statusCode: 401
        });

      return NextResponse.json(
        errorResponse,
        {
          status: 401
        }
      );
    }


    // --------------------------------------------------
    // 2. Rate limit submissions
    // --------------------------------------------------

    checkRateLimit(
      `submit:${user.id}`,
      5,
      3600000
    );


    // --------------------------------------------------
    // 3. Read request body
    // --------------------------------------------------

    const body =
      await req.json();


    // --------------------------------------------------
    // 4. Support frontend aliases
    // --------------------------------------------------

    /**
     * Some clients may send registrationUrl
     * instead of registerUrl.
     */
    if (
      body.registrationUrl &&
      !body.registerUrl
    ) {
      body.registerUrl =
        body.registrationUrl;
    }

    /**
     * Some clients may send coverImage
     * instead of coverImageUrl.
     */
    if (
      body.coverImage &&
      !body.coverImageUrl
    ) {
      body.coverImageUrl =
        body.coverImage;
    }


    // --------------------------------------------------
    // 5. Validate request
    // --------------------------------------------------

    const validatedData =
      validate(
        submitHackathonSchema,
        body
      );


    // --------------------------------------------------
    // 6. Determine organizer name
    // --------------------------------------------------

    const organizer =
      validatedData.organizer &&
        validatedData.organizer.trim().length > 0
        ? validatedData.organizer
        : validatedData.contactName &&
          validatedData.contactName.trim().length > 0
          ? validatedData.contactName
          : user.user_metadata?.full_name ||
          user.email?.split('@')[0] ||
          'Community Organizer';


    // --------------------------------------------------
    // 7. Build request context
    // --------------------------------------------------

    const headers:
      Record<string, string | undefined> = {};

    req.headers.forEach(
      (value, key) => {
        headers[key] = value;
      }
    );

    const context =
      createRequestContext(
        user,
        headers
      );


    // --------------------------------------------------
    // 8. Create hackathon
    // --------------------------------------------------

    const commandService =
      createHackathonCommandService();

    const result =
      await commandService.create(
        context,
        {
          ...validatedData,

          registerUrl:
            validatedData.registerUrl,

          organizer,

          /**
           * VERY IMPORTANT
           *
           * This connects the submission
           * to the authenticated user.
           *
           * The user's account/submissions
           * page should use this value to
           * find their submissions.
           */
          submittedBy: user.id,

          /**
           * If registrationDeadline wasn't
           * supplied, use startDate as fallback.
           */
          registrationDeadline:
            validatedData.registrationDeadline ||
            validatedData.startDate
        }
      );


    // --------------------------------------------------
    // 9. Handle command/service error
    // --------------------------------------------------

    if (!result.ok) {
      const errorResponse =
        formatError(result.error);

      return NextResponse.json(
        errorResponse,
        {
          status:
            result.error.statusCode
        }
      );
    }


    // --------------------------------------------------
    // 10. Background geocoding
    // --------------------------------------------------

    /**
     * Offline/hybrid hackathons can be
     * geocoded in the background.
     *
     * We intentionally don't await this,
     * so geocoding failure doesn't cause
     * the submission itself to fail.
     */
    if (
      !validatedData.isOnline &&
      (
        validatedData.locationCity ||
        validatedData.locationCollege
      )
    ) {
      GeocodeService
        .geocodeAndSaveHackathon(
          result.value.id,
          validatedData.locationCity,
          validatedData.locationCollege
        )
        .catch(() => {
          // Ignore background geocoding errors.
        });
    }


    // --------------------------------------------------
    // 11. Return successful response
    // --------------------------------------------------

    /**
     * IMPORTANT FIX:
     *
     * Your transportClient expects:
     *
     * {
     *   success: true,
     *   data: result.value
     * }
     *
     * Previously you returned only:
     *
     * {
     *   data: result.value
     * }
     *
     * That caused transportClient to think
     * the request failed even when the database
     * operation succeeded.
     */
    return NextResponse.json(
      {
        success: true,
        data: result.value
      },
      {
        status: 201
      }
    );
  } catch (err) {
    // --------------------------------------------------
    // 12. Handle unexpected errors
    // --------------------------------------------------

    const formatted =
      formatError(err);

    return NextResponse.json(
      formatted,
      {
        status:
          formatted.statusCode
      }
    );
  }
}