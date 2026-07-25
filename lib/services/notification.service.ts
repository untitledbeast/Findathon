import { RequestContext } from '../context/request-context';
import { Result, ok, err } from '../errors/result';
import { BaseError, AuthenticationError } from '../errors';
import { NotificationDTO, PaginationParams } from '@/types';
import { INotificationRepository } from '../domain/repositories/notification.repository.interface';
import { NotificationFactory } from '../domain/factories';

export class NotificationQueryService {
  constructor(private notificationRepo: INotificationRepository) {}

  public async getForUser(
    context: RequestContext,
    pagination: PaginationParams
  ): Promise<Result<{ notifications: NotificationDTO[]; total: number; unreadCount: number }, BaseError>> {
    try {
      if (!context.user) return err(new AuthenticationError());

      const result = await this.notificationRepo.findByUser(context.user.id, pagination);
      const unreadCount = await this.notificationRepo.findUnreadCount(context.user.id);

      return ok({ notifications: result.data, total: result.total, unreadCount });
    } catch (e) {
      return err(e instanceof BaseError ? e : new BaseError('Failed to fetch notifications'));
    }
  }

  public async getUnreadCount(context: RequestContext): Promise<Result<number, BaseError>> {
    try {
      if (!context.user) return err(new AuthenticationError());
      const count = await this.notificationRepo.findUnreadCount(context.user.id);
      return ok(count);
    } catch (e) {
      return err(e instanceof BaseError ? e : new BaseError('Failed to fetch unread count'));
    }
  }
}

export class NotificationCommandService {
  constructor(private notificationRepo: INotificationRepository) {}

  public async markRead(context: RequestContext, notificationId: string): Promise<Result<void, BaseError>> {
    try {
      if (!context.user) return err(new AuthenticationError());
      await this.notificationRepo.markRead(notificationId, context.user.id);
      return ok(undefined);
    } catch (e) {
      return err(e instanceof BaseError ? e : new BaseError('Failed to mark notification as read'));
    }
  }

  public async markAllRead(context: RequestContext): Promise<Result<void, BaseError>> {
    try {
      if (!context.user) return err(new AuthenticationError());
      await this.notificationRepo.markAllRead(context.user.id);
      return ok(undefined);
    } catch (e) {
      return err(e instanceof BaseError ? e : new BaseError('Failed to mark all notifications as read'));
    }
  }

  public async notifyUser(
    userId: string,
    type: string,
    title: string,
    body: string,
    metadata: Record<string, unknown> = {}
  ): Promise<Result<NotificationDTO, BaseError>> {
    try {
      const entity = NotificationFactory.createNew({ userId, type, title, body, metadata });
      const dto = await this.notificationRepo.create({
        userId: entity.userId,
        type: entity.type,
        title: entity.title,
        body: entity.body,
        isRead: entity.isRead,
        metadata: entity.metadata
      });
      return ok(dto);
    } catch (e) {
      return err(e instanceof BaseError ? e : new BaseError('Failed to send notification'));
    }
  }
}
