import { NotificationDTO, NotificationDatabaseRow } from '@/types';

export class NotificationMapper {
  public static rowToDTO(row: NotificationDatabaseRow): NotificationDTO {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type || 'info',
      title: row.title || '',
      body: row.body || '',
      isRead: Boolean(row.is_read),
      metadata: row.metadata || {},
      createdAt: row.created_at || new Date().toISOString()
    };
  }

  public static dtoToRow(dto: Partial<NotificationDTO>): Record<string, unknown> {
    const row: Record<string, unknown> = {};
    if (dto.userId !== undefined) row.user_id = dto.userId;
    if (dto.type !== undefined) row.type = dto.type;
    if (dto.title !== undefined) row.title = dto.title;
    if (dto.body !== undefined) row.body = dto.body;
    if (dto.isRead !== undefined) row.is_read = dto.isRead;
    if (dto.metadata !== undefined) row.metadata = dto.metadata;
    return row;
  }
}
