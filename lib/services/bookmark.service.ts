import { RequestContext } from '../context/request-context';
import { Result, ok, err } from '../errors/result';
import { BaseError, AuthenticationError } from '../errors';
import { BookmarkDTO } from '@/types';
import { IBookmarkRepository } from '../domain/repositories/bookmark.repository.interface';
import { ICacheProvider, CacheKeys } from '../cache';
import { IEventBus } from '../domain/events/event-bus';

export class BookmarkQueryService {
  constructor(
    private bookmarkRepo: IBookmarkRepository,
    private cache: ICacheProvider
  ) {}

  public async getByUser(context: RequestContext): Promise<Result<BookmarkDTO[], BaseError>> {
    try {
      if (!context.user) return err(new AuthenticationError());

      const cacheKey = CacheKeys.bookmarksKey(context.user.id);
      const cached = this.cache.get<BookmarkDTO[]>(cacheKey);
      if (cached) return ok(cached);

      const bookmarks = await this.bookmarkRepo.findByUser(context.user.id);
      this.cache.set(cacheKey, bookmarks, 300);

      return ok(bookmarks);
    } catch (e) {
      return err(e instanceof BaseError ? e : new BaseError('Failed to fetch bookmarks'));
    }
  }
}

export class BookmarkCommandService {
  constructor(
    private bookmarkRepo: IBookmarkRepository,
    private cache: ICacheProvider,
    private eventBus: IEventBus
  ) {}

  public async toggle(
    context: RequestContext,
    hackathonId: string
  ): Promise<Result<{ saved: boolean; count: number }, BaseError>> {
    try {
      if (!context.user) return err(new AuthenticationError());

      const existing = await this.bookmarkRepo.findOne(context.user.id, hackathonId);
      let saved = false;

      if (existing) {
        await this.bookmarkRepo.delete(context.user.id, hackathonId);
        saved = false;
      } else {
        await this.bookmarkRepo.create(context.user.id, hackathonId);
        saved = true;

        await this.eventBus.publish({
          eventId: `evt_${Date.now()}`,
          eventName: 'BookmarkCreated',
          timestamp: new Date().toISOString(),
          userId: context.user.id,
          hackathonId
        });
      }

      this.cache.delete(CacheKeys.bookmarksKey(context.user.id));
      const count = await this.bookmarkRepo.countByHackathon(hackathonId);

      return ok({ saved, count });
    } catch (e) {
      return err(e instanceof BaseError ? e : new BaseError('Failed to toggle bookmark'));
    }
  }
}
