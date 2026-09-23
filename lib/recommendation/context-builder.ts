/**
 * ====================================================================
 * FINDATHON RECOMMENDATION ENGINE V2 — CONTEXT BUILDER
 *
 * Assembles the full UserSignalContext for a given user from 7 parallel
 * Supabase queries. Called by the API route before scoring.
 * ====================================================================
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserSignalContext } from './types';

/**
 * Builds the complete user signal context from Supabase tables.
 * Uses Promise.allSettled for parallel fetches — any single table failure
 * degrades gracefully rather than crashing the entire context build.
 *
 * @param userId   - The authenticated user's UUID
 * @param supabase - Supabase client (service role for API routes)
 * @returns Fully assembled UserSignalContext
 */
export async function buildUserContext(
  userId: string,
  supabase: SupabaseClient,
): Promise<UserSignalContext> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();

  // ── 7 Parallel Fetches ────────────────────────────────────────────
  const [
    profileResult,
    interestsResult,
    savedResult,
    eventsResult,
    searchResult,
    feedbackResult,
    userProfileResult,
  ] = await Promise.allSettled([
    // 1. Developer profile
    supabase
      .from('developer_profiles')
      .select('language_scores, top_languages, competencies, interests, experience_level, overall_score')
      .eq('user_id', userId)
      .maybeSingle(),

    // 2. User interests (tag weights)
    supabase
      .from('user_interests')
      .select('tag, weight')
      .eq('user_id', userId)
      .order('weight', { ascending: false }),

    // 3. Saved hackathons (IDs + collect tags)
    supabase
      .from('saved_hackathons')
      .select('hackathon_id, hackathons(tags, is_online)')
      .eq('user_id', userId),

    // 4. Recent events (views, dismissals, registrations)
    supabase
      .from('recommendation_events')
      .select('hackathon_id, event_type, was_recommended')
      .eq('user_id', userId)
      .in('event_type', ['view', 'dismiss', 'apply', 'save'])
      .gte('created_at', ninetyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(100),

    // 5. Recent search queries
    supabase
      .from('search_history')
      .select('query')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),

    // 6. Explicit feedback
    supabase
      .from('hackathon_feedback')
      .select('hackathon_id, feedback')
      .eq('user_id', userId),

    // 7. User profile (city, organization)
    supabase
      .from('profiles')
      .select('organization')
      .eq('id', userId)
      .maybeSingle(),
  ]);

  // ── Extract Results (graceful nulls on failure) ───────────────────

  const devProfile = profileResult.status === 'fulfilled'
    ? profileResult.value.data
    : null;

  const interestsRows = interestsResult.status === 'fulfilled'
    ? (interestsResult.value.data ?? [])
    : [];

  const savedRows = savedResult.status === 'fulfilled'
    ? (savedResult.value.data ?? [])
    : [];

  const eventRows = eventsResult.status === 'fulfilled'
    ? (eventsResult.value.data ?? [])
    : [];

  const searchRows = searchResult.status === 'fulfilled'
    ? (searchResult.value.data ?? [])
    : [];

  const feedbackRows = feedbackResult.status === 'fulfilled'
    ? (feedbackResult.value.data ?? [])
    : [];

  const userProfile = userProfileResult.status === 'fulfilled'
    ? userProfileResult.value.data
    : null;

  // ── Build developer_profile ────────────────────────────────────────

  const developer_profile = devProfile ? {
    language_scores: (devProfile.language_scores as Record<string, number>) ?? {},
    top_languages: (devProfile.top_languages as string[]) ?? [],
    competencies: (devProfile.competencies as Record<string, number>) ?? {},
    interests: (devProfile.interests as string[]) ?? [],
    experience_level: (devProfile.experience_level as 'beginner' | 'intermediate' | 'advanced') ?? 'beginner',
    overall_score: (devProfile.overall_score as number) ?? 0,
  } : null;

  // ── Build interest weights ─────────────────────────────────────────

  const interest_weights: Record<string, number> = {};
  for (const row of interestsRows) {
    const r = row as { tag: string; weight: number };
    interest_weights[r.tag.toLowerCase()] = r.weight;
  }

  // ── Build saved hackathon data ─────────────────────────────────────

  const saved_hackathon_ids: string[] = [];
  const saved_hackathon_tags: string[] = [];
  let onlineSaveCount = 0;
  let offlineSaveCount = 0;

  for (const row of savedRows) {
    const r = row as unknown as {
      hackathon_id: string;
      hackathons: { tags: string[]; is_online: boolean } | { tags: string[]; is_online: boolean }[] | null;
    };
    saved_hackathon_ids.push(r.hackathon_id);
    const hackathon = Array.isArray(r.hackathons) ? r.hackathons[0] : r.hackathons;
    if (hackathon?.tags) {
      saved_hackathon_tags.push(...hackathon.tags);
    }
    if (hackathon?.is_online === true) onlineSaveCount++;
    else if (hackathon?.is_online === false) offlineSaveCount++;
  }

  // ── Build event-derived signals ────────────────────────────────────

  const viewed_hackathon_ids: string[] = [];
  const dismissed_hackathon_ids: string[] = [];
  const registered_hackathon_ids: string[] = [];

  for (const row of eventRows) {
    const r = row as { hackathon_id: string; event_type: string };
    if (r.event_type === 'view' && !viewed_hackathon_ids.includes(r.hackathon_id)) {
      viewed_hackathon_ids.push(r.hackathon_id);
    }
    if (r.event_type === 'dismiss' && !dismissed_hackathon_ids.includes(r.hackathon_id)) {
      dismissed_hackathon_ids.push(r.hackathon_id);
    }
    if (r.event_type === 'apply' && !registered_hackathon_ids.includes(r.hackathon_id)) {
      registered_hackathon_ids.push(r.hackathon_id);
    }
  }

  // ── Build search queries ───────────────────────────────────────────

  const recent_search_queries = searchRows.map(
    (r) => (r as { query: string }).query
  );

  // ── Build feedback map ─────────────────────────────────────────────

  const feedback: Record<string, string> = {};
  for (const row of feedbackRows) {
    const r = row as { hackathon_id: string; feedback: string };
    feedback[r.hackathon_id] = r.feedback;
  }

  // ── Compute preferred_mode ─────────────────────────────────────────
  // Inferred from ratio of online vs offline saves

  let preferred_mode: 'online' | 'offline' | 'no_preference' = 'no_preference';
  if (onlineSaveCount > offlineSaveCount * 1.5) {
    preferred_mode = 'online';
  } else if (offlineSaveCount > onlineSaveCount * 1.5) {
    preferred_mode = 'offline';
  }

  // ── Compute preferred_tags (top 5 by weight) ──────────────────────

  const preferred_tags = interestsRows
    .slice(0, 5)
    .map((r) => (r as { tag: string }).tag);

  // ── Compute preferred_experience_range ─────────────────────────────
  // Include adjacent level if overall_score is near the boundary

  const preferred_experience_range: ('beginner' | 'intermediate' | 'advanced')[] = [];
  if (developer_profile) {
    preferred_experience_range.push(developer_profile.experience_level);
    if (developer_profile.experience_level === 'beginner' && developer_profile.overall_score > 40) {
      preferred_experience_range.push('intermediate');
    }
    if (developer_profile.experience_level === 'intermediate' && developer_profile.overall_score > 70) {
      preferred_experience_range.push('advanced');
    }
  }

  // ── Extract city from organization field or profile ────────────────
  // The profiles table stores organization; we extract city heuristically

  const user_city: string | null = (userProfile?.organization as string) ?? null;
  const user_country: string | null = null; // Not stored in profiles table

  return {
    developer_profile,
    interest_weights,
    saved_hackathon_ids,
    saved_hackathon_tags,
    recent_search_queries,
    viewed_hackathon_ids,
    dismissed_hackathon_ids,
    registered_hackathon_ids,
    feedback,
    preferred_mode,
    preferred_tags,
    preferred_experience_range,
    user_city,
    user_country,
  };
}
