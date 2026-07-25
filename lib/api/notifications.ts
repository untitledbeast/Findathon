import { apiClient } from './client';
import { NotificationDTO, PaginationParams } from '@/types';

export const notificationsApi = {
  getUserNotifications: async (pagination: PaginationParams = { page: 1, pageSize: 20 }): Promise<{ notifications: NotificationDTO[]; total: number; unreadCount: number }> => {
    return apiClient<{ notifications: NotificationDTO[]; total: number; unreadCount: number }>(`/api/v1/notifications?page=${pagination.page}&pageSize=${pagination.pageSize}`);
  },

  markRead: async (notificationId: string): Promise<void> => {
    return apiClient<void>('/api/v1/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ notificationId })
    });
  },

  markAllRead: async (): Promise<void> => {
    return apiClient<void>('/api/v1/notifications/read-all', {
      method: 'POST'
    });
  }
};
