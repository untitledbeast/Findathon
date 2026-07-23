import { IHackathonRepository, SupabaseHackathonRepository, HackathonQueryFilters } from './repository';
import { HackathonDTO } from './dto';
import { rankHackathons, ScoreContext } from './discovery-score';
import { SpatialService, defaultSpatialService } from './spatial-service';

export interface DiscoveryOptions extends HackathonQueryFilters {
  userLat?: number;
  userLng?: number;
  userTags?: string[];
  maxDistanceKm?: number;
  timelineDaysAhead?: number;
}

export interface IDiscoveryEngineV1 {
  discover(options?: DiscoveryOptions): Promise<HackathonDTO[]>;
  getById(id: string): Promise<HackathonDTO | null>;
  discoverNearby(lat: number, lng: number, radiusKm?: number): Promise<HackathonDTO[]>;
}

export class UnifiedDiscoveryEngine implements IDiscoveryEngineV1 {
  private repository: IHackathonRepository;
  private spatialService: SpatialService;

  constructor(repository?: IHackathonRepository, spatialService?: SpatialService) {
    this.repository = repository || new SupabaseHackathonRepository();
    this.spatialService = spatialService || defaultSpatialService;
  }

  async discover(options?: DiscoveryOptions): Promise<HackathonDTO[]> {
    let items: HackathonDTO[] = [];

    if (options?.userLat !== undefined && options?.userLng !== undefined && options?.maxDistanceKm) {
      items = await this.spatialService.getHackathonsWithinRadius(
        options.userLat,
        options.userLng,
        options.maxDistanceKm
      );
    } else {
      items = await this.repository.findAll(options);
    }

    // Apply Timeline Filter if specified
    if (options?.timelineDaysAhead !== undefined) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + options.timelineDaysAhead);

      items = items.filter(h => {
        const start = new Date(h.start_date);
        return start <= targetDate;
      });
    }

    // Rank via Hybrid Dynamic Scoring Algorithm
    const scoreContext: ScoreContext = {
      userLat: options?.userLat,
      userLng: options?.userLng,
      userTags: options?.userTags,
      maxDistanceKm: options?.maxDistanceKm
    };

    return rankHackathons(items, scoreContext);
  }

  async getById(id: string): Promise<HackathonDTO | null> {
    return this.repository.findById(id);
  }

  async discoverNearby(lat: number, lng: number, radiusKm: number = 100): Promise<HackathonDTO[]> {
    const items = await this.spatialService.getHackathonsWithinRadius(lat, lng, radiusKm);
    return rankHackathons(items, { userLat: lat, userLng: lng, maxDistanceKm: radiusKm });
  }
}

export const discoveryEngine = new UnifiedDiscoveryEngine();
