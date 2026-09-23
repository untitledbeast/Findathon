/**
 * ====================================================================
 * FINDATHON RECOMMENDATION ENGINE V2 — COLLABORATIVE FILTERING
 *
 * Pure deterministic collaborative filtering — no ML, no vectors.
 * Finds developers with similar profiles by computing:
 *   languageOverlap × 0.4 + competencyOverlap × 0.4 + experienceMatch × 0.2
 * Threshold: ≥ 0.6 similarity = meaningful signal.
 * ====================================================================
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ── Experience level numeric mapping ────────────────────────────────
const EXP_LEVEL_MAP: Record<string, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

// ── Weight constants for similarity calculation ─────────────────────
// Why 0.4 language: Languages are the most direct indicator of skill overlap.
// Two React/Python developers are far more likely to enjoy the same hackathons.
const LANGUAGE_WEIGHT = 0.4;

// Why 0.4 competency: Domain competency (Web Dev, AI/ML) captures thematic
// interest beyond just programming language.
const COMPETENCY_WEIGHT = 0.4;

// Why 0.2 experience: Same experience level means same hackathon difficulty
// preference, but less important than skill overlap.
const EXPERIENCE_WEIGHT = 0.2;

// Minimum similarity to consider a developer "similar"
// Why 0.6: Below this threshold, the overlap is too weak to be a useful signal.
const SIMILARITY_THRESHOLD = 0.6;

// Maximum similar developers to return — limits collaborative signal noise
const MAX_SIMILAR_DEVS = 20;

// Maximum developers to scan — prevents full-table scan on large user bases
const MAX_CANDIDATES = 200;

interface DeveloperProfileRow {
  user_id: string;
  top_languages: string[] | null;
  competencies: Record<string, number> | null;
  experience_level: string | null;
  overall_score: number | null;
}

/**
 * Finds developer user IDs whose profiles are ≥60% similar to the current user.
 * Similarity = language overlap × 0.4 + competency overlap × 0.4 + experience match × 0.2
 *
 * @param userId      - Current user's UUID (excluded from results)
 * @param userProfile - Current user's developer profile data
 * @param supabase    - Supabase client (service role)
 * @returns Array of similar user IDs, sorted by similarity DESC, max 20
 */
export async function findSimilarDevelopers(
  userId: string,
  userProfile: {
    top_languages: string[];
    competencies: Record<string, number>;
    experience_level: string;
  } | null,
  supabase: SupabaseClient,
): Promise<string[]> {
  if (!userProfile || userProfile.top_languages.length === 0) {
    return []; // No profile = no basis for similarity
  }

  const { data: candidates, error } = await supabase
    .from('developer_profiles')
    .select('user_id, top_languages, competencies, experience_level, overall_score')
    .neq('user_id', userId)
    .order('overall_score', { ascending: false })
    .limit(MAX_CANDIDATES);

  if (error || !candidates) {
    console.warn('[collaborative] Error fetching developer profiles:', error?.message);
    return [];
  }

  const userLangsSet = new Set(
    userProfile.top_languages.map(l => l.toLowerCase())
  );

  const scored: Array<{ userId: string; similarity: number }> = [];

  for (const raw of candidates) {
    const candidate = raw as DeveloperProfileRow;
    if (!candidate.user_id) continue;

    // ── Language Overlap ─────────────────────────────────────────────
    const candidateLangs = (candidate.top_languages ?? []).map(l => l.toLowerCase());
    const candidateLangsSet = new Set(candidateLangs);
    const sharedLangs = [...userLangsSet].filter(l => candidateLangsSet.has(l));
    const maxLangs = Math.max(userLangsSet.size, candidateLangsSet.size);
    const languageOverlap = maxLangs > 0 ? sharedLangs.length / maxLangs : 0;

    // ── Competency Overlap ───────────────────────────────────────────
    const userCompetencies = userProfile.competencies;
    const candidateCompetencies = (candidate.competencies ?? {}) as Record<string, number>;
    let domainSim = 0;
    let totalDomains = 0;

    for (const [domain, userScore] of Object.entries(userCompetencies)) {
      if (candidateCompetencies[domain] !== undefined) {
        const candidateScore = candidateCompetencies[domain];
        domainSim += Math.min(userScore, candidateScore) / Math.max(userScore, candidateScore);
        totalDomains++;
      } else {
        totalDomains++;
      }
    }
    // Also count candidate domains not in user
    for (const domain of Object.keys(candidateCompetencies)) {
      if (userCompetencies[domain] === undefined) {
        totalDomains++;
      }
    }
    const competencyOverlap = totalDomains > 0 ? domainSim / totalDomains : 0;

    // ── Experience Match ─────────────────────────────────────────────
    const userLevel = EXP_LEVEL_MAP[userProfile.experience_level] ?? 0;
    const candidateLevel = EXP_LEVEL_MAP[candidate.experience_level ?? ''] ?? 0;
    const levelDiff = Math.abs(userLevel - candidateLevel);
    const experienceMatch = levelDiff === 0 ? 1.0 : levelDiff === 1 ? 0.5 : 0.0;

    // ── Weighted Similarity ──────────────────────────────────────────
    const similarity =
      languageOverlap * LANGUAGE_WEIGHT +
      competencyOverlap * COMPETENCY_WEIGHT +
      experienceMatch * EXPERIENCE_WEIGHT;

    if (similarity >= SIMILARITY_THRESHOLD) {
      scored.push({ userId: candidate.user_id, similarity });
    }
  }

  // Sort by similarity DESC, take top N
  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, MAX_SIMILAR_DEVS).map(s => s.userId);
}

/**
 * Finds hackathons saved by similar developers, excluding the current user's saves.
 * Returns a map: hackathon_id → [similar user IDs who saved it]
 *
 * @param similarUserIds - User IDs returned by findSimilarDevelopers()
 * @param excludeIds     - Hackathon IDs already saved by the current user
 * @param supabase       - Supabase client (service role)
 */
export async function getHackathonsSavedBySimilarDevs(
  similarUserIds: string[],
  excludeIds: string[],
  supabase: SupabaseClient,
): Promise<Record<string, string[]>> {
  if (similarUserIds.length === 0) return {};

  const { data, error } = await supabase
    .from('saved_hackathons')
    .select('user_id, hackathon_id')
    .in('user_id', similarUserIds);

  if (error || !data) {
    console.warn('[collaborative] Error fetching similar saves:', error?.message);
    return {};
  }

  const excludeSet = new Set(excludeIds);
  const result: Record<string, string[]> = {};

  for (const row of data) {
    const r = row as { user_id: string; hackathon_id: string };
    if (excludeSet.has(r.hackathon_id)) continue;

    if (!result[r.hackathon_id]) {
      result[r.hackathon_id] = [];
    }
    result[r.hackathon_id].push(r.user_id);
  }

  return result;
}
