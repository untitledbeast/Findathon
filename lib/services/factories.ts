import { SupabaseHackathonRepository } from '../repositories/supabase-hackathon.repository';
import { SupabaseReviewRepository } from '../repositories/supabase-review.repository';
import { SupabaseBookmarkRepository } from '../repositories/supabase-bookmark.repository';
import { SupabaseProfileRepository } from '../repositories/supabase-profile.repository';
import { SupabaseNotificationRepository } from '../repositories/supabase-notification.repository';
import { SupabaseDeveloperProfileRepository } from '../repositories/supabase-developer-profile.repository';
import { SupabaseTeamRepository } from '../repositories/supabase-team.repository';
import { SupabaseConnectionRepository } from '../repositories/supabase-connection.repository';
import { SupabaseUserBlockRepository } from '../repositories/supabase-user-block.repository';
import { GitHubProvider } from '../providers/github.provider';
import { LeetCodeProvider } from '../providers/leetcode.provider';
import { LinkedInProvider } from '../providers/linkedin.provider';
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
import { DeveloperProfileQueryService } from './developer-profile-query.service';
import { DeveloperProfileCommandService } from './developer-profile-command.service';
import { HackathonRecommendationService } from './hackathon-recommendation.service';
import { TeamCommandService } from './team-command.service';
import { TeamQueryService } from './team-query.service';
import { ConnectionCommandService } from './connection-command.service';
import { ConnectionQueryService } from './connection-query.service';

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

export function createDeveloperProfileRepository() {
  return new SupabaseDeveloperProfileRepository();
}

export function createGitHubProvider() {
  return new GitHubProvider();
}

export function createLeetCodeProvider() {
  return new LeetCodeProvider();
}

export function createLinkedInProvider() {
  return new LinkedInProvider();
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

export function createConnectionRepository() {
  return new SupabaseConnectionRepository();
}

export function createUserBlockRepository() {
  return new SupabaseUserBlockRepository();
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

export function createDeveloperProfileQueryService() {
  return new DeveloperProfileQueryService(createDeveloperProfileRepository());
}

export function createDeveloperProfileCommandService() {
  return new DeveloperProfileCommandService(
    createDeveloperProfileRepository(),
    createGitHubProvider(),
    createLeetCodeProvider(),
    createLinkedInProvider()
  );
}

export function createHackathonRecommendationService() {
  return new HackathonRecommendationService(createDeveloperProfileRepository());
}

export function createTeamRepository() {
  return new SupabaseTeamRepository();
}

export function createTeamCommandService() {
  return new TeamCommandService(
    createTeamRepository(),
    createHackathonRepository(),
    createProfileRepository(),
    createNotificationRepository(),
    createUserBlockRepository()
  );
}

export function createTeamQueryService() {
  return new TeamQueryService(
    createTeamRepository(),
    createHackathonRepository(),
    createDeveloperProfileRepository(),
    createProfileRepository(),
    createConnectionRepository(),
    createUserBlockRepository()
  );
}

export function createConnectionCommandService() {
  return new ConnectionCommandService(
    createConnectionRepository(),
    createUserBlockRepository(),
    createProfileRepository(),
    createNotificationRepository()
  );
}

export function createConnectionQueryService() {
  return new ConnectionQueryService(
    createConnectionRepository(),
    createUserBlockRepository(),
    createProfileRepository()
  );
}


