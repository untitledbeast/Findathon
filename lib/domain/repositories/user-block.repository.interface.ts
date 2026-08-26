import { UserBlockEntity } from '../entities/user-block.entity';

export interface IUserBlockRepository {
  blockUser(block: UserBlockEntity): Promise<UserBlockEntity>;
  unblockUser(blockerUserId: string, blockedUserId: string): Promise<void>;
  getBlock(blockerUserId: string, blockedUserId: string): Promise<UserBlockEntity | null>;
  isBlockedEitherDirection(userA: string, userB: string): Promise<boolean>;
  getBlockedUserIds(blockerUserId: string): Promise<string[]>;
  getBlockerUserIds(blockedUserId: string): Promise<string[]>;
  getAllBlockedOrBlockerIds(userId: string): Promise<Set<string>>;
}
