import { ConnectionEntity } from '../entities/connection.entity';

export interface IConnectionRepository {
  createConnection(connection: ConnectionEntity): Promise<ConnectionEntity>;
  getConnectionById(id: string): Promise<ConnectionEntity | null>;
  getConnectionByPair(userA: string, userB: string): Promise<ConnectionEntity | null>;
  getAcceptedConnectionsByUserId(userId: string): Promise<ConnectionEntity[]>;
  getPendingReceivedRequests(userId: string): Promise<ConnectionEntity[]>;
  getPendingSentRequests(userId: string): Promise<ConnectionEntity[]>;
  updateConnection(connection: ConnectionEntity): Promise<ConnectionEntity>;
  deleteConnection(id: string): Promise<void>;
  isBlocked(userA: string, userB: string): Promise<boolean>;
}
