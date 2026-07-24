import { supabase } from '@/lib/supabase';
import { UniversityEntity } from './hackathon.repository';

export const UniversityRepository = {
  async getBySlug(slug: string): Promise<UniversityEntity | null> {
    try {
      const { data } = await supabase
        .from('universities')
        .select('*')
        .eq('slug', slug)
        .single();
      return data || null;
    } catch (err) {
      console.error('Error fetching university by slug:', err);
      return null;
    }
  },

  async getHackathons(universityId: string, limit = 12) {
    if (!universityId) return [];
    try {
      const { data } = await supabase
        .from('hackathons')
        .select('*')
        .eq('university_id', universityId)
        .eq('status', 'approved')
        .order('start_date', { ascending: false })
        .limit(limit);
      return data || [];
    } catch (err) {
      console.error('Error fetching university hackathons:', err);
      return [];
    }
  },

  async getAll(limit = 50): Promise<UniversityEntity[]> {
    try {
      const { data } = await supabase
        .from('universities')
        .select('*')
        .order('hackathon_count', { ascending: false })
        .limit(limit);
      return data || [];
    } catch (err) {
      console.error('Error fetching universities:', err);
      return [];
    }
  },

  async isFollowing(userId: string, universityId: string): Promise<boolean> {
    if (!userId || !universityId) return false;
    try {
      const { data } = await supabase
        .from('university_followers')
        .select('user_id')
        .eq('user_id', userId)
        .eq('university_id', universityId)
        .single();
      return !!data;
    } catch {
      return false;
    }
  },

  async toggleFollow(userId: string, universityId: string): Promise<boolean> {
    if (!userId || !universityId) return false;
    try {
      const isFollowing = await this.isFollowing(userId, universityId);
      if (isFollowing) {
        await supabase
          .from('university_followers')
          .delete()
          .eq('user_id', userId)
          .eq('university_id', universityId);
        return false;
      } else {
        await supabase
          .from('university_followers')
          .insert({ user_id: userId, university_id: universityId });
        return true;
      }
    } catch (err) {
      console.error('Error toggling university follow:', err);
      return false;
    }
  }
};
