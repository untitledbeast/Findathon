import { supabase } from '@/lib/supabase';

export const SearchIndexService = {
  async reindexHackathon(id: string): Promise<boolean> {
    try {
      const { data } = await supabase.from('hackathons').select('*').eq('id', id).single();
      if (!data) return false;
      // Re-trigger vector calculation if needed
      return true;
    } catch {
      return false;
    }
  }
};
