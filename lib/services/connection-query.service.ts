/* eslint-disable @typescript-eslint/no-explicit-any */
import { RequestContext } from '../context/request-context';
import { IConnectionRepository } from '../domain/repositories/connection.repository.interface';
import { IUserBlockRepository } from '../domain/repositories/user-block.repository.interface';
import { IProfileRepository } from '../domain/repositories/profile.repository.interface';
import { ConnectionMapper } from '../domain/mappers/connection.mapper';
import { ConnectionDTO, UserBlockDTO } from '@/types';
import { AuthenticationError } from '../errors';

export class ConnectionQueryService {
  constructor(
    private readonly connectionRepo: IConnectionRepository,
    private readonly userBlockRepo: IUserBlockRepository,
    private readonly profileRepo: IProfileRepository
  ) {}

  public async getMyConnections(context: RequestContext): Promise<{
    connections: ConnectionDTO[];
    pendingReceived: ConnectionDTO[];
    pendingSent: ConnectionDTO[];
  }> {
    const userId = context.user?.id;
    if (!userId) {
      throw new AuthenticationError('Authentication required');
    }

    const [acceptedEntities, receivedEntities, sentEntities] = await Promise.all([
      this.connectionRepo.getAcceptedConnectionsByUserId(userId),
      this.connectionRepo.getPendingReceivedRequests(userId),
      this.connectionRepo.getPendingSentRequests(userId)
    ]);

    const enrichConnection = async (entity: typeof acceptedEntities[0]): Promise<ConnectionDTO> => {
      const partnerId = entity.getPartnerUserId(userId);
      const profile = await this.profileRepo.findById(partnerId);
      return ConnectionMapper.entityToDTO(
        entity,
        profile ? {
          id: profile.id,
          fullName: profile.fullName,
          avatarUrl: typeof (profile.avatarUrl as any)?.getValue === 'function'
            ? (profile.avatarUrl as any).getValue()
            : (profile.avatarUrl || null),
          bio: profile.bio
        } : undefined
      );
    };

    const [connections, pendingReceived, pendingSent] = await Promise.all([
      Promise.all(acceptedEntities.map(enrichConnection)),
      Promise.all(receivedEntities.map(enrichConnection)),
      Promise.all(sentEntities.map(enrichConnection))
    ]);

    return {
      connections,
      pendingReceived,
      pendingSent
    };
  }

  public async getBlockedUsers(context: RequestContext): Promise<UserBlockDTO[]> {
    const userId = context.user?.id;
    if (!userId) {
      throw new AuthenticationError('Authentication required');
    }

    const blockedIds = await this.userBlockRepo.getBlockedUserIds(userId);
    return await Promise.all(
      blockedIds.map(async blockedId => {
        const profile = await this.profileRepo.findById(blockedId);
        return {
          id: `${userId}_${blockedId}`,
          blockerUserId: userId,
          blockedUserId: blockedId,
          createdAt: new Date().toISOString(),
          blockedUser: profile ? {
            id: profile.id,
            fullName: profile.fullName,
            avatarUrl: typeof (profile.avatarUrl as any)?.getValue === 'function'
              ? (profile.avatarUrl as any).getValue()
              : (profile.avatarUrl || null)
          } : undefined
        };
      })
    );
  }

  public async getConnectionState(
    currentUserId: string,
    targetUserId: string
  ): Promise<'none' | 'pending_sent' | 'pending_received' | 'accepted'> {
    if (currentUserId === targetUserId) return 'none';

    const conn = await this.connectionRepo.getConnectionByPair(currentUserId, targetUserId);
    if (!conn) return 'none';

    if (conn.isAccepted()) return 'accepted';
    if (conn.isPending()) {
      return conn.initiatorUserId === currentUserId ? 'pending_sent' : 'pending_received';
    }

    return 'none';
  }
}
