import { Job } from './job.interface';
import { supabase } from '@/lib/supabase';
import { HackathonFactory } from '@/lib/domain/factories';

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
        const entity = HackathonFactory.createNew({
          title: h.title,
          description: h.description || '',
          tagline: h.tagline || null,
          startDate: h.start_date || new Date().toISOString(),
          endDate: h.end_date || new Date().toISOString(),
          registrationDeadline: h.registration_deadline || h.start_date || new Date().toISOString(),
          registerUrl: h.register_url || 'https://findathon.dev',
          organizer: h.organizer || 'Community Organizer',
          organization: h.organization || null,
          isOnline: Boolean(h.is_online),
          city: h.location_city,
          college: h.location_college,
          fullAddress: h.full_address,
          latitude: h.latitude ? Number(h.latitude) : null,
          longitude: h.longitude ? Number(h.longitude) : null,
          tags: Array.isArray(h.tags) ? h.tags : [],
          prizePool: h.prize_pool || null,
          minTeamSize: h.min_team_size || 1,
          maxTeamSize: h.max_team_size || 4,
          soloAllowed: h.solo_allowed ?? true,
          submittedBy: h.submitted_by || null
        });

        const qualityScore = entity.calculateQualityScore();
        await supabase.from('hackathons').update({ quality_score: qualityScore }).eq('id', h.id);
      }
    } catch (err) {
      console.error('ComputeQualityJob failed:', err);
    }
  }
};
