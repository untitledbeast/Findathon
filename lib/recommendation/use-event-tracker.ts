'use client';

/**
 * ====================================================================
 * FINDATHON RECOMMENDATION ENGINE V2 — CLIENT-SIDE EVENT TRACKER
 *
 * Fire-and-forget tracking hook. Never throws, never blocks UI.
 * Import and use in HackathonCard, detail pages, search results.
 * ====================================================================
 */

import { useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import type { RecommendationEventType } from './types';

export { type RecommendationEventType } from './types';

/**
 * Custom hook that fires tracking events to /api/v1/recommendations/event.
 *
 * Usage:
 *   const { track } = useEventTracker();
 *   track(hackathonId, 'view', { position: 1, wasRecommended: true });
 */
export function useEventTracker() {
  const { user } = useAuth();

  const track = useCallback(async (
    hackathonId: string,
    eventType: RecommendationEventType,
    meta?: {
      position?: number;
      score?: number;
      wasRecommended?: boolean;
    },
  ) => {
    if (!user) return; // Only track authenticated users

    // Fire and forget — never block UI
    try {
      fetch('/api/v1/recommendations/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hackathon_id: hackathonId,
          event_type: eventType,
          position: meta?.position,
          score: meta?.score,
          was_recommended: meta?.wasRecommended ?? false,
        }),
      }).catch(() => {
        // Silent fail — tracking should never break UX
      });
    } catch {
      // Silent fail — tracking should never break UX
    }
  }, [user]);

  return { track };
}
