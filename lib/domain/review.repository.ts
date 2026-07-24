import { supabase } from '@/lib/supabase';
import { Review } from './hackathon.repository';

export const ReviewRepository = {
  async create(hackathonId: string, userId: string, rating: number, comment: string) {
    try {
      const { data, error } = await supabase
        .from('hackathon_reviews')
        .upsert({ hackathon_id: hackathonId, user_id: userId, rating, comment })
        .select()
        .single();
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  async getUserReview(hackathonId: string, userId: string): Promise<Review | null> {
    if (!userId || !hackathonId) return null;
    try {
      const { data } = await supabase
        .from('hackathon_reviews')
        .select('*')
        .eq('hackathon_id', hackathonId)
        .eq('user_id', userId)
        .single();
      return data || null;
    } catch {
      return null;
    }
  },

  async delete(hackathonId: string, userId: string) {
    if (!userId || !hackathonId) return;
    try {
      await supabase
        .from('hackathon_reviews')
        .delete()
        .eq('hackathon_id', hackathonId)
        .eq('user_id', userId);
    } catch (err) {
      console.error('Error deleting review:', err);
    }
  },

  async getForHackathon(hackathonId: string, limit = 20): Promise<Review[]> {
    if (!hackathonId) return [];
    try {
      const { data } = await supabase
        .from('hackathon_reviews')
        .select('*, profiles(full_name, avatar_url)')
        .eq('hackathon_id', hackathonId)
        .order('created_at', { ascending: false })
        .limit(limit);

      return (data || []).map((r: Review & { profiles?: { full_name: string | null; avatar_url: string | null } }) => ({
        ...r,
        profile: r.profiles || { full_name: null, avatar_url: null }
      }));
    } catch (err) {
      console.error('Error fetching reviews:', err);
      return [];
    }
  }
};
