import { RichHackathon } from '@/lib/domain/hackathon.repository';

export const RankingService = {
  calculateTrendingScore(hackathon: Partial<RichHackathon>): number {
    const views = hackathon.view_count || 0;
    const saves = hackathon.save_count || 0;
    const rating = hackathon.avg_rating || 0;
    const verifiedBonus = hackathon.is_verified ? 20 : 0;

    return (views * 1) + (saves * 5) + (rating * 10) + verifiedBonus;
  }
};
