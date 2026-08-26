import { ConnectionStatus } from '@/types';

export interface ConnectionEntityProps {
  id: string;
  userLowId: string;
  userHighId: string;
  initiatorUserId: string;
  status: ConnectionStatus;
  createdAt: number;
  updatedAt: number;
  respondedAt: number | null;
}

export class ConnectionEntity {
  constructor(private readonly props: ConnectionEntityProps) {}

  public get id(): string { return this.props.id; }
  public get userLowId(): string { return this.props.userLowId; }
  public get userHighId(): string { return this.props.userHighId; }
  public get initiatorUserId(): string { return this.props.initiatorUserId; }
  public get status(): ConnectionStatus { return this.props.status; }
  public get createdAt(): number { return this.props.createdAt; }
  public get updatedAt(): number { return this.props.updatedAt; }
  public get respondedAt(): number | null { return this.props.respondedAt; }

  /**
   * Derives deterministic canonical pair (userLowId < userHighId)
   */
  public static getCanonicalPair(userA: string, userB: string): { userLowId: string; userHighId: string } {
    if (userA === userB) {
      throw new Error('Cannot create canonical pair for identical user IDs');
    }
    return userA < userB
      ? { userLowId: userA, userHighId: userB }
      : { userLowId: userB, userHighId: userA };
  }

  public isParticipant(userId: string): boolean {
    return this.props.userLowId === userId || this.props.userHighId === userId;
  }

  public getPartnerUserId(userId: string): string {
    if (this.props.userLowId === userId) return this.props.userHighId;
    if (this.props.userHighId === userId) return this.props.userLowId;
    throw new Error('User is not a participant in this connection');
  }

  public isPending(): boolean {
    return this.props.status === 'pending';
  }

  public isAccepted(): boolean {
    return this.props.status === 'accepted';
  }

  public isRecipient(userId: string): boolean {
    return this.isParticipant(userId) && this.props.initiatorUserId !== userId;
  }

  public isInitiator(userId: string): boolean {
    return this.props.initiatorUserId === userId;
  }

  public toJSON(): ConnectionEntityProps {
    return { ...this.props };
  }
}
