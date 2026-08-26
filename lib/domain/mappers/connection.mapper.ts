import { ConnectionEntity } from '../entities/connection.entity';
import { ConnectionDTO, ConnectionStatus } from '@/types';

export interface ConnectionDatabaseRow {
  id: string;
  user_low_id: string;
  user_high_id: string;
  initiator_user_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  responded_at: string | null;
}

export class ConnectionMapper {
  public static rowToEntity(row: ConnectionDatabaseRow): ConnectionEntity {
    return new ConnectionEntity({
      id: row.id,
      userLowId: row.user_low_id,
      userHighId: row.user_high_id,
      initiatorUserId: row.initiator_user_id,
      status: row.status as ConnectionStatus,
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
      respondedAt: row.responded_at ? new Date(row.responded_at).getTime() : null
    });
  }

  public static entityToRow(entity: ConnectionEntity): ConnectionDatabaseRow {
    return {
      id: entity.id,
      user_low_id: entity.userLowId,
      user_high_id: entity.userHighId,
      initiator_user_id: entity.initiatorUserId,
      status: entity.status,
      created_at: new Date(entity.createdAt).toISOString(),
      updated_at: new Date(entity.updatedAt).toISOString(),
      responded_at: entity.respondedAt ? new Date(entity.respondedAt).toISOString() : null
    };
  }

  public static entityToDTO(
    entity: ConnectionEntity,
    partner?: { id: string; fullName: string | null; avatarUrl: string | null; bio?: string | null }
  ): ConnectionDTO {
    return {
      id: entity.id,
      userLowId: entity.userLowId,
      userHighId: entity.userHighId,
      initiatorUserId: entity.initiatorUserId,
      status: entity.status,
      createdAt: new Date(entity.createdAt).toISOString(),
      updatedAt: new Date(entity.updatedAt).toISOString(),
      respondedAt: entity.respondedAt ? new Date(entity.respondedAt).toISOString() : null,
      partner
    };
  }
}
