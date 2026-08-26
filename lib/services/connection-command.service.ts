import { RequestContext } from '../context/request-context';
import { IConnectionRepository } from '../domain/repositories/connection.repository.interface';
import { IUserBlockRepository } from '../domain/repositories/user-block.repository.interface';
import { IProfileRepository } from '../domain/repositories/profile.repository.interface';
import { INotificationRepository } from '../domain/repositories/notification.repository.interface';
import { ConnectionEntity } from '../domain/entities/connection.entity';
import { UserBlockEntity } from '../domain/entities/user-block.entity';
import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ConflictError
} from '../errors';

export class ConnectionCommandService {
  constructor(
    private readonly connectionRepo: IConnectionRepository,
    private readonly userBlockRepo: IUserBlockRepository,
    private readonly profileRepo: IProfileRepository,
    private readonly notificationRepo: INotificationRepository
  ) {}

  /**
   * Sends a connection request to another developer.
   */
  public async sendRequest(context: RequestContext, targetUserId: string): Promise<ConnectionEntity> {
    const userId = context.user?.id;
    if (!userId) {
      throw new AuthenticationError('Authentication required to send connection request');
    }

    if (userId === targetUserId) {
      throw new ValidationError('You cannot connect with yourself');
    }

    // Verify target user exists
    const targetProfile = await this.profileRepo.findById(targetUserId);
    if (!targetProfile) {
      throw new NotFoundError('Target developer profile not found');
    }

    // Check bidirectional block barrier
    const isBlocked = await this.userBlockRepo.isBlockedEitherDirection(userId, targetUserId);
    if (isBlocked) {
      throw new ValidationError('Cannot connect with this user');
    }

    const { userLowId, userHighId } = ConnectionEntity.getCanonicalPair(userId, targetUserId);
    const existing = await this.connectionRepo.getConnectionByPair(userId, targetUserId);

    const now = Date.now();

    if (existing) {
      if (existing.isAccepted()) {
        return existing; // Idempotent
      }

      if (existing.isPending()) {
        if (existing.initiatorUserId === userId) {
          return existing; // Already sent
        } else {
          // Reverse incoming request already exists — do NOT auto-accept
          throw new ConflictError('You have an incoming connection request from this developer. Please accept it instead.');
        }
      }

      // Check decline cooldown (24 hours)
      if (existing.status === 'declined' && existing.respondedAt && (now - existing.respondedAt < 24 * 60 * 60 * 1000)) {
        throw new ValidationError('A connection request was recently declined. Please wait 24 hours before sending another request.');
      }

      // Re-open existing connection row as pending
      const reopened = new ConnectionEntity({
        ...existing.toJSON(),
        initiatorUserId: userId,
        status: 'pending',
        updatedAt: now,
        respondedAt: null
      });

      const updated = await this.connectionRepo.updateConnection(reopened);

      // Dispatch in-app notification
      try {
        await this.notificationRepo.create({
          userId: targetUserId,
          type: 'connection_request',
          title: 'New Connection Request',
          body: `${context.user?.fullName || 'A developer'} sent you a connection request on Findathon.`,
          isRead: false,
          metadata: {
            connectionId: updated.id,
            requesterId: userId
          }
        });
      } catch (err) {
        console.warn('[ConnectionCommandService] Failed to send notification:', err);
      }

      return updated;
    }

    // Create fresh connection entity
    const newConnection = new ConnectionEntity({
      id: crypto.randomUUID(),
      userLowId,
      userHighId,
      initiatorUserId: userId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      respondedAt: null
    });

    const created = await this.connectionRepo.createConnection(newConnection);

    // Dispatch notification
    try {
      await this.notificationRepo.create({
        userId: targetUserId,
        type: 'connection_request',
        title: 'New Connection Request',
        body: `${context.user?.fullName || 'A developer'} sent you a connection request on Findathon.`,
        isRead: false,
        metadata: {
          connectionId: created.id,
          requesterId: userId
        }
      });
    } catch (err) {
      console.warn('[ConnectionCommandService] Failed to send notification:', err);
    }

    return created;
  }

  /**
   * Accepts an incoming connection request.
   */
  public async acceptRequest(context: RequestContext, connectionId: string): Promise<ConnectionEntity> {
    const userId = context.user?.id;
    if (!userId) {
      throw new AuthenticationError('Authentication required');
    }

    const connection = await this.connectionRepo.getConnectionById(connectionId);
    if (!connection) {
      throw new NotFoundError('Connection request not found');
    }

    if (!connection.isParticipant(userId)) {
      throw new AuthorizationError('You are not authorized to respond to this connection');
    }

    if (!connection.isRecipient(userId)) {
      throw new AuthorizationError('Only the recipient can accept a connection request');
    }

    if (!connection.isPending()) {
      if (connection.isAccepted()) return connection; // Idempotent
      throw new ValidationError(`Connection is no longer pending (current: ${connection.status})`);
    }

    const isBlocked = await this.userBlockRepo.isBlockedEitherDirection(connection.userLowId, connection.userHighId);
    if (isBlocked) {
      throw new ValidationError('Cannot connect with a blocked user');
    }

    const now = Date.now();
    const updated = new ConnectionEntity({
      ...connection.toJSON(),
      status: 'accepted',
      updatedAt: now,
      respondedAt: now
    });

    const saved = await this.connectionRepo.updateConnection(updated);

    // Notify initiator that connection was accepted
    try {
      await this.notificationRepo.create({
        userId: connection.initiatorUserId,
        type: 'connection_accepted',
        title: 'Connection Accepted',
        body: `${context.user?.fullName || 'A developer'} accepted your connection request.`,
        isRead: false,
        metadata: {
          connectionId: saved.id,
          partnerId: userId
        }
      });
    } catch (err) {
      console.warn('[ConnectionCommandService] Failed to send notification:', err);
    }

    return saved;
  }

  /**
   * Declines an incoming connection request.
   */
  public async declineRequest(context: RequestContext, connectionId: string): Promise<ConnectionEntity> {
    const userId = context.user?.id;
    if (!userId) {
      throw new AuthenticationError('Authentication required');
    }

    const connection = await this.connectionRepo.getConnectionById(connectionId);
    if (!connection) {
      throw new NotFoundError('Connection request not found');
    }

    if (!connection.isRecipient(userId)) {
      throw new AuthorizationError('Only the recipient can decline a connection request');
    }

    if (!connection.isPending()) {
      if (connection.status === 'declined') return connection;
      throw new ValidationError(`Connection is no longer pending (current: ${connection.status})`);
    }

    const now = Date.now();
    const updated = new ConnectionEntity({
      ...connection.toJSON(),
      status: 'declined',
      updatedAt: now,
      respondedAt: now
    });

    return await this.connectionRepo.updateConnection(updated);
  }

  /**
   * Cancels a pending outgoing connection request.
   */
  public async cancelRequest(context: RequestContext, connectionId: string): Promise<ConnectionEntity> {
    const userId = context.user?.id;
    if (!userId) {
      throw new AuthenticationError('Authentication required');
    }

    const connection = await this.connectionRepo.getConnectionById(connectionId);
    if (!connection) {
      throw new NotFoundError('Connection request not found');
    }

    if (!connection.isInitiator(userId)) {
      throw new AuthorizationError('Only the requester can cancel a pending connection request');
    }

    if (!connection.isPending()) {
      if (connection.status === 'cancelled') return connection;
      throw new ValidationError(`Connection is no longer pending (current: ${connection.status})`);
    }

    const now = Date.now();
    const updated = new ConnectionEntity({
      ...connection.toJSON(),
      status: 'cancelled',
      updatedAt: now,
      respondedAt: now
    });

    return await this.connectionRepo.updateConnection(updated);
  }

  /**
   * Blocks another user.
   */
  public async blockUser(context: RequestContext, targetUserId: string): Promise<UserBlockEntity> {
    const userId = context.user?.id;
    if (!userId) {
      throw new AuthenticationError('Authentication required');
    }

    if (userId === targetUserId) {
      throw new ValidationError('You cannot block yourself');
    }

    const now = Date.now();
    const block = new UserBlockEntity({
      id: crypto.randomUUID(),
      blockerUserId: userId,
      blockedUserId: targetUserId,
      createdAt: now
    });

    const saved = await this.userBlockRepo.blockUser(block);

    // Clean up any pending connection between the two users
    try {
      const existingConn = await this.connectionRepo.getConnectionByPair(userId, targetUserId);
      if (existingConn && existingConn.isPending()) {
        await this.connectionRepo.updateConnection(new ConnectionEntity({
          ...existingConn.toJSON(),
          status: 'cancelled',
          updatedAt: now,
          respondedAt: now
        }));
      }
    } catch (err) {
      console.warn('[ConnectionCommandService] Failed to cancel connection on block:', err);
    }

    return saved;
  }

  /**
   * Unblocks a user.
   */
  public async unblockUser(context: RequestContext, targetUserId: string): Promise<void> {
    const userId = context.user?.id;
    if (!userId) {
      throw new AuthenticationError('Authentication required');
    }

    await this.userBlockRepo.unblockUser(userId, targetUserId);
  }
}
