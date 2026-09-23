import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { adminClient } from '@/lib/supabase-admin';
import { buildUserContext } from '@/lib/recommendation/context-builder';
import { findSimilarDevelopers, getHackathonsSavedBySimilarDevs } from '@/lib/recommendation/collaborative';
import { scoreHackathon } from '@/lib/recommendation/engine';
import type { HackathonScoringInput, SignalBreakdown, RecommendationV2Response } from '@/lib/recommendation/types';

/**
 * ====================================================================
 * FINDATHON RECOMMENDATION ENGINE V2 — MAIN RECOMMENDATIONS ENDPOINT
 * GET /api/v1/recommendations
 *
 * Query params:
 *   - limit: number of recommendations to return (default: 20)
 *   - offset: pagination offset (default: 0)
 *   - fresh: bypass cache if true (default: false)
 * ====================================================================
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Get authenticated user
    const user = await AuthService.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required for personalized recommendations' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limitParam = parseInt(searchParams.get('limit') || '20', 10);
    const offsetParam = parseInt(searchParams.get('offset') || '0', 10);
    const fresh = searchParams.get('fresh') === 'true';

    const limit = isNaN(limitParam) || limitParam < 1 ? 20 : Math.min(50, limitParam);
    const offset = isNaN(offsetParam) || offsetParam < 0 ? 0 : offsetParam;

    // 2. Check cache
    if (!fresh) {
      const { data: cacheRow } = await adminClient
        .from('recommendation_cache')
        .select('*')
        .eq('user_id', user.id)
        .eq('invalidated', false)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (cacheRow && Array.isArray(cacheRow.hackathon_ids) && cacheRow.hackathon_ids.length > 0) {
        // Fetch hackathons for cached IDs
        const { data: cachedHackathons } = await adminClient
          .from('hackathons')
          .select('id, title, slug, description, tags, difficulty, is_online, location_city, start_date, end_date, registration_deadline, prize_amount, cover_image_url, is_verified, is_featured, avg_rating, review_count, save_count, view_count, engagement_score, organizer, tech_stack')
          .in('id', cacheRow.hackathon_ids);

        if (cachedHackathons && cachedHackathons.length > 0) {
          const hackathonMap = new Map(cachedHackathons.map((h) => [h.id, h]));
          const scores = (cacheRow.scores || {}) as Record<string, number>;
          const explanations = (cacheRow.explanations || {}) as Record<string, string[]>;
          const breakdowns = (cacheRow.score_breakdown || {}) as Record<string, SignalBreakdown>;

          const ordered = (cacheRow.hackathon_ids as string[])
            .map((id: string) => {
              const h = hackathonMap.get(id);
              if (!h) return null;
              const match_score = scores[id] ?? 0;
              const reasons = (explanations[id] || []).filter(Boolean).slice(0, 3);
              const reason = reasons[0] ?? 'Recommended for you';
              const breakdown = breakdowns[id] ?? ({} as SignalBreakdown);
              return {
                id: h.id,
                title: h.title,
                slug: h.slug || h.id,
                description: h.description || '',
                tags: h.tags || [],
                difficulty: h.difficulty || 'intermediate',
                is_online: !!h.is_online,
                location_city: h.location_city || null,
                start_date: h.start_date,
                end_date: h.end_date,
                registration_deadline: h.registration_deadline || null,
                prize_amount: Number(h.prize_amount) || 0,
                cover_image_url: h.cover_image_url || null,
                is_verified: !!h.is_verified,
                is_featured: !!h.is_featured,
                organizer: h.organizer || '',
                match_score,
                confidence: (match_score >= 80 ? 'very_high' : match_score >= 60 ? 'high' : match_score >= 40 ? 'medium' : 'low') as 'very_high' | 'high' | 'medium' | 'low',
                reasons,
                recommendation_reason: reason,
                signal_breakdown: breakdown,
              };
            });
          const nonNullOrdered = ordered.filter((item: typeof ordered[number]): item is NonNullable<typeof item> => item !== null);

          const paginated = nonNullOrdered.slice(offset, offset + limit);
          const response: RecommendationV2Response = {
            success: true,
            data: {
              recommendations: paginated,
              total: nonNullOrdered.length,
              context_signals: {
                has_developer_profile: true,
                preferred_mode: 'cached',
                top_interests: [],
                experience_level: undefined,
              },
            },
          };
          return NextResponse.json(response);
        }
      }
    }

    // 3. Build user context from 7 parallel queries
    const context = await buildUserContext(user.id, adminClient);

    // 4. Collaborative filtering: similar developers & their saves
    const similarDevIds = await findSimilarDevelopers(user.id, context.developer_profile, adminClient);
    const collaborativeSaves = await getHackathonsSavedBySimilarDevs(
      similarDevIds,
      context.saved_hackathon_ids,
      adminClient
    );

    // 5. Hackathons similar to user's saved hackathons
    let similarToSaved: string[] = [];
    if (context.saved_hackathon_ids.length > 0) {
      const { data: simRows } = await adminClient
        .from('hackathon_similarity')
        .select('hackathon_b')
        .in('hackathon_a', context.saved_hackathon_ids)
        .order('similarity_score', { ascending: false })
        .limit(50);

      if (simRows) {
        similarToSaved = simRows.map((r: { hackathon_b: string }) => r.hackathon_b);
      }
    }

    // 6. Fetch candidate hackathons
    const today = new Date().toISOString().split('T')[0];
    let query = adminClient
      .from('hackathons')
      .select('id, title, slug, description, tags, difficulty, is_online, location_city, start_date, end_date, registration_deadline, prize_amount, cover_image_url, is_verified, is_featured, avg_rating, review_count, save_count, view_count, engagement_score, organizer, tech_stack')
      .eq('status', 'approved')
      .gte('start_date', today)
      .limit(200);

    if (context.registered_hackathon_ids.length > 0) {
      query = query.not('id', 'in', `(${context.registered_hackathon_ids.join(',')})`);
    }

    const { data: candidates, error: fetchErr } = await query;
    if (fetchErr) {
      console.error('[recommendations-v2] Error fetching candidates:', fetchErr);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch candidate hackathons' },
        { status: 500 }
      );
    }

    // 7. Score all candidates deterministically
    const scored = (candidates || []).map((h) => {
      const scoringInput: HackathonScoringInput = {
        id: h.id,
        title: h.title,
        slug: h.slug || h.id,
        description: h.description || '',
        tags: h.tags || [],
        difficulty: h.difficulty || 'intermediate',
        is_online: !!h.is_online,
        location_city: h.location_city || null,
        start_date: h.start_date,
        end_date: h.end_date,
        registration_deadline: h.registration_deadline || null,
        prize_amount: Number(h.prize_amount) || 0,
        cover_image_url: h.cover_image_url || null,
        is_verified: !!h.is_verified,
        is_featured: !!h.is_featured,
        avg_rating: Number(h.avg_rating) || 0,
        review_count: Number(h.review_count) || 0,
        save_count: Number(h.save_count) || 0,
        view_count: Number(h.view_count) || 0,
        engagement_score: Number(h.engagement_score) || 0,
        organizer: h.organizer || '',
        tech_stack: h.tech_stack || [],
      };

      return scoreHackathon(
        scoringInput,
        context,
        similarToSaved,
        collaborativeSaves[h.id] ?? []
      );
    });

    // 8. Sort and filter
    const sorted = scored
      .filter((s) => s.final_score > 0)
      .sort((a, b) => {
        // Primary: final score
        if (b.final_score !== a.final_score) return b.final_score - a.final_score;
        // Tiebreak 1: deadline urgency
        if (b.signal_breakdown.deadline_urgency !== a.signal_breakdown.deadline_urgency) {
          return b.signal_breakdown.deadline_urgency - a.signal_breakdown.deadline_urgency;
        }
        // Tiebreak 2: hackathon quality
        return b.signal_breakdown.hackathon_quality - a.signal_breakdown.hackathon_quality;
      });

    // 9. Save to recommendation_cache
    const scoresMap: Record<string, number> = {};
    const explanationsMap: Record<string, string[]> = {};
    const breakdownMap: Record<string, SignalBreakdown> = {};
    const hackathonIds: string[] = [];

    for (const s of sorted) {
      hackathonIds.push(s.hackathon.id);
      scoresMap[s.hackathon.id] = s.final_score;
      explanationsMap[s.hackathon.id] = s.explanations;
      breakdownMap[s.hackathon.id] = s.signal_breakdown;
    }

    if (hackathonIds.length > 0) {
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      await adminClient.from('recommendation_cache').upsert({
        user_id: user.id,
        hackathon_ids: hackathonIds,
        scores: scoresMap,
        explanations: explanationsMap,
        score_breakdown: breakdownMap,
        generated_at: new Date().toISOString(),
        expires_at: expiresAt,
        invalidated: false,
      });
    }

    // 10. Format and return
    const paginated = sorted.slice(offset, offset + limit).map((s) => ({
      id: s.hackathon.id,
      title: s.hackathon.title,
      slug: s.hackathon.slug,
      description: s.hackathon.description,
      tags: s.hackathon.tags,
      difficulty: s.hackathon.difficulty,
      is_online: s.hackathon.is_online,
      location_city: s.hackathon.location_city,
      start_date: s.hackathon.start_date,
      end_date: s.hackathon.end_date,
      registration_deadline: s.hackathon.registration_deadline,
      prize_amount: s.hackathon.prize_amount,
      cover_image_url: s.hackathon.cover_image_url,
      is_verified: s.hackathon.is_verified,
      is_featured: s.hackathon.is_featured,
      organizer: s.hackathon.organizer,
      match_score: s.final_score,
      confidence: s.confidence,
      reasons: s.explanations.filter(Boolean).slice(0, 3),
      recommendation_reason: s.recommendation_reason,
      signal_breakdown: s.signal_breakdown,
    }));

    const response: RecommendationV2Response = {
      success: true,
      data: {
        recommendations: paginated,
        total: sorted.length,
        context_signals: {
          has_developer_profile: !!context.developer_profile,
          preferred_mode: context.preferred_mode,
          top_interests: context.preferred_tags.slice(0, 5),
          experience_level: context.developer_profile?.experience_level,
        },
      },
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    console.error('[recommendations-v2] Error generating recommendations:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal recommendation engine error',
      },
      { status: 500 }
    );
  }
}
