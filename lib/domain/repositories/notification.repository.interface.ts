import { NotificationDTO, PaginationParams } from '@/types';

export interface INotificationRepository {
  findByUser(userId: string, pagination: PaginationParams): Promise<{ data: NotificationDTO[]; total: number }>;
  findUnreadCount(userId: string): Promise<number>;
  markRead(notificationId: string, userId: string): Promise<void>;
  markAllRead(userId: string): Promise<void>;
  create(data: Omit<NotificationDTO, 'id' | 'createdAt'>): Promise<NotificationDTO>;
  createBulk(notifications: Array<Omit<NotificationDTO, 'id' | 'createdAt'>>): Promise<void>;
}
