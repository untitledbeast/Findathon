import { AuthService } from '@/lib/modules/auth';
import { ProfileService, SupabaseProfileRepository } from '@/lib/modules/profile';
import {
  SupabaseHackathonRepository,
  GetHackathonDetailHandler,
  SearchHackathonsHandler
} from '@/lib/modules/hackathons';
import { GetSearchSuggestionsHandler } from '@/lib/modules/search';

export function createProfileModule() {
  const repository = new SupabaseProfileRepository();
  const service = new ProfileService(repository);
  return { repository, service };
}

export function createAuthModule() {
  const { service: profileService } = createProfileModule();
  const service = new AuthService(profileService);
  return { service };
}

export function createHackathonModule() {
  const repository = new SupabaseHackathonRepository();
  const getDetailHandler = new GetHackathonDetailHandler(repository);
  const searchHandler = new SearchHackathonsHandler(repository);
  return { repository, getDetailHandler, searchHandler };
}

export function createSearchModule() {
  const suggestionsHandler = new GetSearchSuggestionsHandler();
  return { suggestionsHandler };
}
