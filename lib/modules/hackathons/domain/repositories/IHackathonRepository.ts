import { HackathonAggregate } from '../aggregates/HackathonAggregate';
import { HackathonSearchSpecification } from '../specifications/HackathonSearchSpecification';
import { SpatialSpecification } from '../specifications/SpatialSpecification';

export interface IHackathonRepository {
  findById(id: string): Promise<HackathonAggregate | null>;
  findBySlug(slug: string): Promise<HackathonAggregate | null>;
  search(spec: HackathonSearchSpecification): Promise<{ items: HackathonAggregate[]; total: number; cursor?: string }>;
  findByViewport(spec: SpatialSpecification): Promise<HackathonAggregate[]>;
  save(hackathon: HackathonAggregate): Promise<HackathonAggregate>;
  delete(id: string): Promise<void>;
}
