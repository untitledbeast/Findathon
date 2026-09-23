import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase-admin';

/**
 * ====================================================================
 * FINDATHON RECOMMENDATION ENGINE V2 — SIMILARITY PRECOMPUTATION CRON
 * GET /api/cron/precompute-similarity
 *
 * Nightly background job (runs at 02:00 UTC via Vercel Cron):
 *   1. Calls compute_hackathon_similarity() RPC
 *   2. Updates engagement_score, save_rate, register_click_rate on hackathons
 *   3. Calls apply_interest_decay() RPC
 * ====================================================================
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Secret authorization check (Vercel Cron Header or secret param)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const urlSecret = req.nextUrl.searchParams.get('secret');
      if (urlSecret !== cronSecret) {
        return NextResponse.json({ success: false, error: 'Unauthorized cron request' }, { status: 401 });
      }
    }

    // 2. Execute compute_hackathon_similarity() RPC
    let similarityError: string | null = null;
    const { error: rpcSimError } = await adminClient.rpc('compute_hackathon_similarity');
    if (rpcSimError) {
      console.warn('[cron/precompute-similarity] compute_hackathon_similarity RPC error:', rpcSimError.message);
      similarityError = rpcSimError.message;
    }

    // Count computed pairs
    const { count: pairsCount } = await adminClient
      .from('hackathon_similarity')
      .select('*', { count: 'exact', head: true });

    // 3. Update hackathons engagement_score
    const { data: approvedHackathons, error: hackError } = await adminClient
      .from('hackathons')
      .select('id, save_count, view_count')
      .eq('status', 'approved');

    let hackathonsUpdated = 0;
    if (approvedHackathons && approvedHackathons.length > 0) {
      for (const h of approvedHackathons) {
        const viewCount = Math.max(1, h.view_count || 1);
        const saveCount = h.save_count || 0;

        const { count: regClicks } = await adminClient
          .from('recommendation_events')
          .select('*', { count: 'exact', head: true })
          .eq('hackathon_id', h.id)
          .eq('event_type', 'register_click');

        const registerClicks = regClicks || 0;
        const saveRate = Math.min(1.0, saveCount / viewCount);
        const registerRate = Math.min(1.0, registerClicks / viewCount);
        const engagementScore = Math.round(((saveRate * 0.5) + (registerRate * 0.5)) * 100) / 100;

        const { error: updateErr } = await adminClient
          .from('hackathons')
          .update({
            engagement_score: engagementScore,
            save_rate: Math.round(saveRate * 1000) / 1000,
            register_click_rate: Math.round(registerRate * 1000) / 1000,
          })
          .eq('id', h.id);

        if (!updateErr) {
          hackathonsUpdated++;
        }
      }
    } else if (hackError) {
      console.warn('[cron/precompute-similarity] Error fetching approved hackathons:', hackError.message);
    }

    // 4. Call apply_interest_decay() RPC
    let decayError: string | null = null;
    const { error: rpcDecayError } = await adminClient.rpc('apply_interest_decay');
    if (rpcDecayError) {
      console.warn('[cron/precompute-similarity] apply_interest_decay RPC error:', rpcDecayError.message);
      decayError = rpcDecayError.message;
    }

    return NextResponse.json({
      success: true,
      data: {
        pairs_computed: pairsCount ?? 0,
        hackathons_updated: hackathonsUpdated,
        similarity_rpc_status: similarityError ? `warning: ${similarityError}` : 'success',
        decay_rpc_status: decayError ? `warning: ${decayError}` : 'success',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    console.error('[cron/precompute-similarity] Unhandled cron error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal cron error',
      },
      { status: 500 }
    );
  }
}
