'use client';

import { useState, useEffect } from 'react';
import { HackathonRepository, HackathonDetail } from '@/lib/domain/hackathon.repository';

export function useHackathon(id: string) {
  const [data, setData] = useState<HackathonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    HackathonRepository.getById(id)
      .then(h => {
        if (isMounted) {
          setData(h);
          setError(h ? null : 'Hackathon not found');
        }
      })
      .catch(e => {
        if (isMounted) {
          setError(e instanceof Error ? e.message : 'Failed to load hackathon');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  return { data, loading, error };
}
