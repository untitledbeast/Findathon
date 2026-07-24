import { Job } from './job.interface';
import { supabase } from '@/lib/supabase';
import { computeDynamicScore } from '@/lib/discovery-score';
import { HackathonDTO } from '@/lib/dto';

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
        const score = computeDynamicScore(h as unknown as HackathonDTO);
        await supabase.from('hackathons').update({ trending_score: score }).eq('id', h.id);
      }
    } catch (err) {
      console.error('ComputeTrendingJob failed:', err);
    }
  }
};
