'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { storageService } from '@/lib/storage-service';
import { useAuth } from '@/lib/auth-context';

export function useBookmark(hackathonId: string) {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(() => storageService.isSaved(hackathonId));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id || !hackathonId) return;
    const userId = user.id;
    async function checkSaved() {
      try {
        const { data } = await supabase
          .from('saved_hackathons')
          .select('id')
          .eq('user_id', userId)
          .eq('hackathon_id', hackathonId)
          .single();
        setIsSaved(!!data);
      } catch {
        // Ignore single query error if not found
      }
    }
    checkSaved();
  }, [user?.id, hackathonId]);

  const toggle = async () => {
    if (!hackathonId) return false;
    setLoading(true);

    // Sync with local storage
    const updatedLocalStorage = storageService.toggleSavedId(hackathonId);
    const currentlySaved = updatedLocalStorage.includes(hackathonId);
    setIsSaved(currentlySaved);

    // Sync with Supabase if logged in
    if (user) {
      try {
        if (currentlySaved) {
          await supabase.from('saved_hackathons').insert({ user_id: user.id, hackathon_id: hackathonId });
        } else {
          await supabase.from('saved_hackathons').delete().eq('user_id', user.id).eq('hackathon_id', hackathonId);
        }
      } catch (err) {
        console.error('Error syncing saved hackathon:', err);
      }
    }

    setLoading(false);
    return currentlySaved;
  };

  return { isSaved, toggle, loading };
}
