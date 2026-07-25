import { apiClient } from './client';

export const analyticsApi = {
  track: async (event: string, metadata: Record<string, unknown> = {}): Promise<void> => {
    try {
      await apiClient<void>('/api/v1/analytics', {
        method: 'POST',
        body: JSON.stringify({ event, metadata })
      });
    } catch {
      // Fire and forget
    }
  }
};
