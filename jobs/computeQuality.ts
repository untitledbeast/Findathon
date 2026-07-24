import { Job } from './job.interface';
import { supabase } from '@/lib/supabase';
import { HackathonEntity } from '@/lib/domain/entities/hackathon.entity';

export const computeQualityJob: Job = {
  name: 'ComputeQualityJob',
  retries: 3,
  timeout: 30000,
  concurrency: 1,
  async execute(): Promise<void> {
    try {
      const { data } = await supabase.from('hackathons').select('*');
      if (!data) return;

      for (const h of data) {
        const entity = new HackathonEntity({
          id: h.id,
          title: h.title,
          description: h.description || '',
          tagline: h.tagline || null,
          startDate: h.start_date,
          endDate: h.end_date,
          registrationDeadline: h.registration_deadline || null,
          status: h.status,
          maxParticipants: h.max_participants || null,
          currentParticipants: h.current_participants || 0,
          isVerified: Boolean(h.is_verified),
          prizeAmount: h.prize_amount || 0
        });

        const qualityScore = entity.calculateQualityScore();
        await supabase.from('hackathons').update({ quality_score: qualityScore }).eq('id', h.id);
      }
    } catch (err) {
      console.error('ComputeQualityJob failed:', err);
    }
  }
};
