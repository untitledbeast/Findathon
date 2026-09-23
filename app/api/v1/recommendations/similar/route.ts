import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase-admin';

/**
 * ====================================================================
 * FINDATHON RECOMMENDATION ENGINE V2 — SIMILAR HACKATHONS ENDPOINT
 * GET /api/v1/recommendations/similar?hackathon_id=<uuid>
 *
 * Returns up to 6 hackathons similar to the given hackathon based on
 * the precomputed hackathon_similarity table (or fallback tag overlap).
 * ====================================================================
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hackathonId = searchParams.get('hackathon_id') || searchParams.get('id');

    if (!hackathonId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: hackathon_id' },
        { status: 400 }
      );
    }

    // 1. Fetch precomputed similarities from hackathon_similarity table
    const { data: simRows, error: simError } = await adminClient
      .from('hackathon_similarity')
      .select('hackathon_b, similarity_score, shared_tags')
      .eq('hackathon_a', hackathonId)
      .order('similarity_score', { ascending: false })
      .limit(6);

    if (simError) {
      console.warn('[recommendations-similar] Error reading hackathon_similarity:', simError);
    }

    let similarItems: Array<{
      hackathon_id: string;
      similarity_score: number;
      shared_tags: string[];
    }> = [];

    if (simRows && simRows.length > 0) {
      similarItems = simRows.map((r: { hackathon_b: string; similarity_score: number; shared_tags: string[] }) => ({
        hackathon_id: r.hackathon_b,
        similarity_score: Number(r.similarity_score),
        shared_tags: r.shared_tags || [],
      }));
    } else {
      // 2. Fallback: If similarity has not been precomputed yet, query source hackathon tags
      const { data: sourceHackathon } = await adminClient
        .from('hackathons')
        .select('tags, is_online, location_city, difficulty')
        .eq('id', hackathonId)
        .maybeSingle();

      if (sourceHackathon && Array.isArray(sourceHackathon.tags) && sourceHackathon.tags.length > 0) {
        const { data: candidates } = await adminClient
          .from('hackathons')
          .select('id, tags, is_online, location_city, difficulty')
          .neq('id', hackathonId)
          .eq('status', 'approved')
          .overlaps('tags', sourceHackathon.tags)
          .limit(20);

        if (candidates) {
          const sourceTags = new Set(sourceHackathon.tags.map((t: string) => t.toLowerCase()));
          const scoredCandidates = candidates.map((c) => {
            const cTags = (c.tags || []).map((t: string) => t.toLowerCase());
            const shared = cTags.filter((t: string) => sourceTags.has(t));
            const unionSize = new Set([...sourceTags, ...cTags]).size;
            let score = unionSize > 0 ? shared.length / unionSize : 0;
            if (c.is_online === sourceHackathon.is_online) score += 0.05;
            if (c.difficulty === sourceHackathon.difficulty) score += 0.05;
            score = Math.min(1.0, score);
            return {
              hackathon_id: c.id,
              similarity_score: Math.round(score * 100) / 100,
              shared_tags: shared,
            };
          });

          scoredCandidates.sort((a, b) => b.similarity_score - a.similarity_score);
          similarItems = scoredCandidates.slice(0, 6);
        }
      }
    }

    if (similarItems.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          similar_hackathons: [],
          total: 0,
        },
      });
    }

    // 3. Fetch full hackathon records for the similar IDs
    const targetIds = similarItems.map((item) => item.hackathon_id);
    const { data: hackathons, error: fetchError } = await adminClient
      .from('hackathons')
      .select('id, title, slug, description, tags, difficulty, is_online, location_city, start_date, end_date, registration_deadline, prize_amount, cover_image_url, is_verified, is_featured, organizer')
      .in('id', targetIds)
      .eq('status', 'approved');

    if (fetchError || !hackathons) {
      console.error('[recommendations-similar] Error fetching hackathon details:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch details for similar hackathons' },
        { status: 500 }
      );
    }

    const simMap = new Map(similarItems.map((item) => [item.hackathon_id, item]));
    const result = hackathons
      .map((h) => {
        const sim = simMap.get(h.id);
        return {
          ...h,
          similarity_score: sim?.similarity_score ?? 0,
          shared_tags: sim?.shared_tags ?? [],
        };
      })
      .sort((a, b) => b.similarity_score - a.similarity_score);

    return NextResponse.json({
      success: true,
      data: {
        similar_hackathons: result,
        total: result.length,
      },
    });
  } catch (err: unknown) {
    console.error('[recommendations-similar] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal error retrieving similar hackathons',
      },
      { status: 500 }
    );
  }
}
