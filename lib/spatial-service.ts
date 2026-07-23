import { IHackathonRepository, SupabaseHackathonRepository } from './repository';
import { HackathonDTO } from './dto';

export class SpatialService {
  private repository: IHackathonRepository;

  constructor(repository?: IHackathonRepository) {
    this.repository = repository || new SupabaseHackathonRepository();
  }

  async getHackathonsWithinRadius(lat: number, lng: number, radiusKm: number = 100): Promise<HackathonDTO[]> {
    const safeRadius = Math.min(Math.max(radiusKm, 5), 500); // Bounds safeguard 5km - 500km
    return this.repository.findWithinRadius(lat, lng, safeRadius);
  }

  async getHackathonsInBounds(south: number, west: number, north: number, east: number): Promise<HackathonDTO[]> {
    return this.repository.findInBounds(south, west, north, east);
  }
}

export const defaultSpatialService = new SpatialService();
