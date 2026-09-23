import { NextRequest, NextResponse } from 'next/server';
import { createRequestContext } from '@/lib/context/request-context';
import { AuthService } from '@/lib/auth/auth.service';
import { createHackathonRecommendationService } from '@/lib/services/factories';
import { formatError } from '@/lib/errors';
import { HackathonDTO } from '@/lib/dto';

export interface RecommendedHackathon extends HackathonDTO {
  recommendationReason: string;
}

/**
 * Legacy Recommended Hackathons Endpoint.
 * GATE 14: Unified with the canonical HackathonRecommendationService via a thin adapter.
 * Guarantees consistent deterministic scoring and eliminates duplicate scoring paths.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((val, key) => { headers[key] = val; });
    const context = createRequestContext(user, headers);

    const recommendationService = createHackathonRecommendationService();
    const recResult = await recommendationService.getRecommendations(context, { limit: 6 });

    const adapted: RecommendedHackathon[] = recResult.recommendations.map(rec => {
      const h = rec.hackathon;
      const m = rec.match;
      const reason = m.strengths.length > 0
        ? m.strengths[0].text
        : (m.recommendationMode === 'COLD_START' ? 'Top rated upcoming hackathon' : 'Recommended for your stack');

      return {
        id: h.id,
        title: h.title,
        description: h.description,
        tagline: h.tagline || undefined,
        start_date: h.startDate,
        end_date: h.endDate,
        registration_deadline: h.registrationDeadline || undefined,
        location_city: h.locationCity || undefined,
        is_online: h.isOnline,
        register_url: `/hackathons/${h.slug || h.id}`,
        prize_amount: h.prizeAmount,
        tags: h.tags,
        is_featured: h.isFeatured,
        is_verified: h.isVerified,
        base_score: m.matchPercentage,
        dynamic_score: m.matchPercentage,
        recommendationReason: reason
      } as unknown as RecommendedHackathon;
    });

    const res = NextResponse.json({
      success: true,
      data: adapted
    });

    res.headers.set('Cache-Control', 'private, s-maxage=600, stale-while-revalidate=1200');
    return res;
  } catch (err) {
    const formatted = formatError(err);
    return NextResponse.json({ success: false, error: formatted }, { status: formatted.statusCode });
  }
}
