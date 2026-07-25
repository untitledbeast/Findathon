import { apiClient } from './client';
import { BookmarkDTO } from '@/types';

export const bookmarksApi = {
  getUserBookmarks: async (): Promise<BookmarkDTO[]> => {
    return apiClient<BookmarkDTO[]>('/api/v1/bookmarks');
  },

  toggle: async (hackathonId: string): Promise<{ saved: boolean; count: number }> => {
    return apiClient<{ saved: boolean; count: number }>('/api/v1/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ hackathonId })
    });
  }
};
