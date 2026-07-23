import { HackathonDTO } from './dto';

export interface ScoreContext {
  userLat?: number;
  userLng?: number;
  userTags?: string[];
  maxDistanceKm?: number;
}

export function computeDynamicScore(hackathon: HackathonDTO, context?: ScoreContext): number {
  let score = hackathon.base_score || 50;

  // 1. Deadline Urgency Factor (0 - 25 points)
  if (hackathon.registration_deadline) {
    const now = Date.now();
    const deadlineTime = new Date(hackathon.registration_deadline).getTime();
    const daysLeft = Math.ceil((deadlineTime - now) / (1000 * 60 * 60 * 24));

    if (daysLeft >= 0 && daysLeft <= 3) {
      score += 25; // Urgent closing soon bonus
    } else if (daysLeft > 3 && daysLeft <= 14) {
      score += 15;
    } else if (daysLeft < 0) {
      score -= 20; // Expired deadline penalty
    }
  }

  // 2. Prize Fund Weighting (0 - 20 points)
  if (hackathon.prize_amount && hackathon.prize_amount > 0) {
    const prizeScore = Math.min(20, Math.log10(hackathon.prize_amount) * 4);
    score += prizeScore;
  }

  // 3. Featured & Verified Boost (15 points)
  if (hackathon.is_featured) score += 10;
  if (hackathon.is_verified) score += 5;

  // 4. Proximity Match (0 - 20 points)
  if (context?.userLat && context?.userLng && hackathon.latitude && hackathon.longitude) {
    const dist = hackathon.distance_km !== undefined
      ? hackathon.distance_km
      : calculateDistance(context.userLat, context.userLng, hackathon.latitude, hackathon.longitude);

    if (dist <= 25) {
      score += 20;
    } else if (dist <= 100) {
      score += 12;
    } else if (dist <= 300) {
      score += 5;
    }
  }

  // 5. User Interest Alignment (0 - 15 points)
  if (context?.userTags && context.userTags.length > 0 && hackathon.tags) {
    const matches = hackathon.tags.filter(t =>
      context.userTags!.some(ut => t.toLowerCase().includes(ut.toLowerCase()))
    ).length;
    score += Math.min(15, matches * 5);
  }

  return Math.round(score * 10) / 10;
}

export function rankHackathons(hackathons: HackathonDTO[], context?: ScoreContext): HackathonDTO[] {
  return hackathons.map(h => {
    const dynamicScore = computeDynamicScore(h, context);
    return {
      ...h,
      dynamic_score: dynamicScore,
      final_discovery_score: dynamicScore
    };
  }).sort((a, b) => (b.final_discovery_score || 0) - (a.final_discovery_score || 0));
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
