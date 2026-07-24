import { supabase } from '@/lib/supabase';
import { OrganizerEntity } from './hackathon.repository';

export const OrganizerRepository = {
  async getBySlug(slug: string): Promise<OrganizerEntity | null> {
    try {
      const { data } = await supabase
        .from('organizers')
        .select('*')
        .eq('slug', slug)
        .single();
      return data || null;
    } catch (err) {
      console.error('Error fetching organizer by slug:', err);
      return null;
    }
  },

  async getHackathons(organizerId: string, limit = 12) {
    if (!organizerId) return [];
    try {
      const { data } = await supabase
        .from('hackathons')
        .select('*')
        .eq('organizer_id', organizerId)
        .eq('status', 'approved')
        .order('start_date', { ascending: false })
        .limit(limit);
      return data || [];
    } catch (err) {
      console.error('Error fetching organizer hackathons:', err);
      return [];
    }
  },

  async getFollowerCount(organizerId: string): Promise<number> {
    if (!organizerId) return 0;
    try {
      const { count } = await supabase
        .from('organizer_followers')
        .select('*', { count: 'exact', head: true })
        .eq('organizer_id', organizerId);
      return count || 0;
    } catch (err) {
      console.error('Error fetching follower count:', err);
      return 0;
    }
  },

  async isFollowing(userId: string, organizerId: string): Promise<boolean> {
    if (!userId || !organizerId) return false;
    try {
      const { data } = await supabase
        .from('organizer_followers')
        .select('user_id')
        .eq('user_id', userId)
        .eq('organizer_id', organizerId)
        .single();
      return !!data;
    } catch {
      return false;
    }
  },

  async toggleFollow(userId: string, organizerId: string): Promise<boolean> {
    if (!userId || !organizerId) return false;
    try {
      const isFollowing = await this.isFollowing(userId, organizerId);
      if (isFollowing) {
        await supabase
          .from('organizer_followers')
          .delete()
          .eq('user_id', userId)
          .eq('organizer_id', organizerId);
        return false;
      } else {
        await supabase
          .from('organizer_followers')
          .insert({ user_id: userId, organizer_id: organizerId });
        return true;
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
      return false;
    }
  },

  async getAll(limit = 20): Promise<OrganizerEntity[]> {
    try {
      const { data } = await supabase
        .from('organizers')
        .select('*')
        .order('hackathon_count', { ascending: false })
        .limit(limit);
      return data || [];
    } catch (err) {
      console.error('Error fetching organizers:', err);
      return [];
    }
  }
};
