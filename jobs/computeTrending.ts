import { Job } from './job.interface';
import { supabase } from '@/lib/supabase';
import { RankingService } from '@/lib/search/ranking.service';

export const computeTrendingJob: Job = {
  name: 'ComputeTrendingJob',
  retries: 3,
  timeout: 30000,
  concurrency: 1,
  async execute(): Promise<void> {
    try {
      const { data } = await supabase.from('hackathons').select('*').eq('status', 'approved');
      if (!data) return;

      for (const h of data) {
        const score = RankingService.calculateTrendingScore(h);
        await supabase.from('hackathons').update({ trending_score: score }).eq('id', h.id);
      }
    } catch (err) {
      console.error('ComputeTrendingJob failed:', err);
    }
  }
};
