import { BookmarkDTO } from '@/types';

export interface IBookmarkRepository {
  findByUser(userId: string): Promise<BookmarkDTO[]>;
  findOne(userId: string, hackathonId: string): Promise<BookmarkDTO | null>;
  create(userId: string, hackathonId: string): Promise<BookmarkDTO>;
  delete(userId: string, hackathonId: string): Promise<void>;
  countByHackathon(hackathonId: string): Promise<number>;
}
