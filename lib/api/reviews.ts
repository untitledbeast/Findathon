import { apiClient } from './client';
import { ReviewDTO, PaginationParams } from '@/types';

export const reviewsApi = {
  getByHackathon: async (hackathonId: string, pagination: PaginationParams = { page: 1, pageSize: 10 }): Promise<{ reviews: ReviewDTO[]; average: number; total: number }> => {
    return apiClient<{ reviews: ReviewDTO[]; average: number; total: number }>(`/api/v1/reviews/hackathon/${hackathonId}?page=${pagination.page}&pageSize=${pagination.pageSize}`);
  },

  create: async (data: {
    hackathonId: string;
    rating: number;
    title: string;
    body: string;
    organizationQuality: number;
    prizeTransparency: number;
    mentorship: number;
  }): Promise<ReviewDTO> => {
    return apiClient<ReviewDTO>('/api/v1/reviews', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  delete: async (id: string): Promise<void> => {
    return apiClient<void>(`/api/v1/reviews/${id}`, {
      method: 'DELETE'
    });
  }
};
