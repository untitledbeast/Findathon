import { SupabaseProfileRepository, ProfileService } from '@/lib/modules/profile';
import { AuthService } from '@/lib/modules/auth';
import { SupabaseHackathonRepository, GetHackathonDetailHandler, SearchHackathonsHandler } from '@/lib/modules/hackathons';
import { GetSearchSuggestionsHandler } from '@/lib/modules/search';

export class Container {
  private static instance: Container;

  private profileRepository?: SupabaseProfileRepository;
  private profileService?: ProfileService;
  private authService?: AuthService;
  private hackathonRepository?: SupabaseHackathonRepository;
  private detailHandler?: GetHackathonDetailHandler;
  private searchHandler?: SearchHackathonsHandler;
  private suggestionsHandler?: GetSearchSuggestionsHandler;

  private constructor() {}

  public static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  public getProfileRepository(): SupabaseProfileRepository {
    if (!this.profileRepository) {
      this.profileRepository = new SupabaseProfileRepository();
    }
    return this.profileRepository;
  }

  public getProfileService(): ProfileService {
    if (!this.profileService) {
      this.profileService = new ProfileService(this.getProfileRepository());
    }
    return this.profileService;
  }

  public getAuthService(): AuthService {
    if (!this.authService) {
      this.authService = new AuthService(this.getProfileService());
    }
    return this.authService;
  }

  public getHackathonRepository(): SupabaseHackathonRepository {
    if (!this.hackathonRepository) {
      this.hackathonRepository = new SupabaseHackathonRepository();
    }
    return this.hackathonRepository;
  }

  public getHackathonDetailHandler(): GetHackathonDetailHandler {
    if (!this.detailHandler) {
      this.detailHandler = new GetHackathonDetailHandler(this.getHackathonRepository());
    }
    return this.detailHandler;
  }

  public getSearchHackathonsHandler(): SearchHackathonsHandler {
    if (!this.searchHandler) {
      this.searchHandler = new SearchHackathonsHandler(this.getHackathonRepository());
    }
    return this.searchHandler;
  }

  public getSearchSuggestionsHandler(): GetSearchSuggestionsHandler {
    if (!this.suggestionsHandler) {
      this.suggestionsHandler = new GetSearchSuggestionsHandler();
    }
    return this.suggestionsHandler;
  }
}

export const container = Container.getInstance();
