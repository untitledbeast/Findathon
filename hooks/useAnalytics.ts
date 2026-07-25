'use client';

import { useCallback } from 'react';
import { analyticsApi } from '@/lib/api/analytics';

export function useAnalytics() {
  const track = useCallback((event: string, metadata: Record<string, unknown> = {}) => {
    analyticsApi.track(event, metadata);
  }, []);

  return { track };
}
