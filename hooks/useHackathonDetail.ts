'use client';

import { useState, useEffect } from 'react';
import { HackathonService } from '@/lib/services/hackathon.service';
import { HackathonDetailDTO } from '@/lib/domain/dtos/hackathon.dto';

export function useHackathonDetail(id: string) {
  const [data, setData] = useState<HackathonDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    HackathonService.getDetail(id)
      .then(dto => {
        if (isMounted) {
          setData(dto);
          setError(dto ? null : 'Hackathon not found');
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load hackathon');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [id]);

  return { data, loading, error };
}
