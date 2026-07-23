import { HackathonCard } from './types/hackathon';

export interface RankingOptions {
  userTags?: string[];
  userLocation?: { lat: number; lng: number };
  now?: Date;
}

/**
 * Pure deterministic ranking function for business logic score adjustments.
 * Zero side-effects, zero network calls, zero hidden globals.
 */
export function rankHackathons(
  results: HackathonCard[],
  options: RankingOptions = {}
): HackathonCard[] {
  const currentDate = options.now || new Date();

  const scored = results.map(item => {
    let score = item.relevance_score || 10;

    // 1. Featured & Verified Boost
    if (item.is_featured) score += 15;
    if (item.is_verified) score += 10;

    // 2. Deadline Urgency Boost (closing in next 3 days ranks higher)
    if (item.registration_deadline) {
      const deadlineDate = new Date(item.registration_deadline);
      const diffDays = Math.ceil((deadlineDate.getTime() - currentDate.getTime()) / (1000 * 3600 * 24));
      if (diffDays >= 0 && diffDays <= 3) {
        score += 12;
      }
    }

    // 3. User Interest Tag Affinity Boost
    if (options.userTags && options.userTags.length > 0 && item.tags) {
      const matches = item.tags.filter(t =>
        options.userTags!.some(ut => ut.toLowerCase() === t.toLowerCase())
      ).length;
      score += matches * 8;
    }

    // 4. Proximity Boost
    if (item.distance_km !== undefined && item.distance_km !== null) {
      if (item.distance_km <= 25) score += 15;
      else if (item.distance_km <= 50) score += 10;
      else if (item.distance_km <= 100) score += 5;
    }

    return {
      ...item,
      relevance_score: Math.round(score * 10) / 10
    };
  });

  return scored.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
}
