import { SupabaseHackathonRepository } from '../repositories/supabase-hackathon.repository';
import { SupabaseReviewRepository } from '../repositories/supabase-review.repository';
import { SupabaseBookmarkRepository } from '../repositories/supabase-bookmark.repository';
import { SupabaseProfileRepository } from '../repositories/supabase-profile.repository';
import { SupabaseNotificationRepository } from '../repositories/supabase-notification.repository';
import { CacheService } from '../cache';
import { eventBus } from '../domain/events/event-bus';
import { SupabaseSearchProvider } from '../infrastructure/search';
import { SupabaseStorageProvider } from '../infrastructure/storage';

import { HackathonQueryService } from './hackathon-query.service';
import { HackathonCommandService } from './hackathon-command.service';
import { ReviewQueryService, ReviewCommandService } from './review.service';
import { BookmarkQueryService, BookmarkCommandService } from './bookmark.service';
import { NotificationQueryService, NotificationCommandService } from './notification.service';
import { SearchQueryService } from './search.service';

export function createHackathonRepository() {
  return new SupabaseHackathonRepository();
}

export function createReviewRepository() {
  return new SupabaseReviewRepository();
}

export function createBookmarkRepository() {
  return new SupabaseBookmarkRepository();
}

export function createProfileRepository() {
  return new SupabaseProfileRepository();
}

export function createNotificationRepository() {
  return new SupabaseNotificationRepository();
}

export function createCacheService() {
  return new CacheService();
}

export function createEventBus() {
  return eventBus;
}

export function createSearchProvider() {
  return new SupabaseSearchProvider();
}

export function createStorageProvider() {
  return new SupabaseStorageProvider();
}

// CQRS Services Composition Root
export function createHackathonQueryService() {
  return new HackathonQueryService(createHackathonRepository(), createCacheService());
}

export function createHackathonCommandService() {
  return new HackathonCommandService(createHackathonRepository(), createCacheService(), createEventBus());
}

export function createReviewQueryService() {
  return new ReviewQueryService(createReviewRepository());
}

export function createReviewCommandService() {
  return new ReviewCommandService(createReviewRepository(), createHackathonRepository(), createEventBus());
}

export function createBookmarkQueryService() {
  return new BookmarkQueryService(createBookmarkRepository(), createCacheService());
}

export function createBookmarkCommandService() {
  return new BookmarkCommandService(createBookmarkRepository(), createCacheService(), createEventBus());
}

export function createNotificationQueryService() {
  return new NotificationQueryService(createNotificationRepository());
}

export function createNotificationCommandService() {
  return new NotificationCommandService(createNotificationRepository());
}

export function createSearchQueryService() {
  return new SearchQueryService(createSearchProvider(), createCacheService());
}
