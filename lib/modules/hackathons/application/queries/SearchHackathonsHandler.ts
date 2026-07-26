import { Result, ok } from '@/lib/shared';
import { BaseError } from '@/lib/errors';
import { RequestContext } from '@/lib/context/request-context';
import { IHackathonRepository } from '../../domain/repositories/IHackathonRepository';
import { HackathonSearchSpecification, HackathonSearchFilters } from '../../domain/specifications/HackathonSearchSpecification';
import { HackathonDTO } from '../dtos/HackathonDTO';
import { HackathonMapper } from '../mappers/HackathonMapper';

export interface SearchHackathonsResponse {
  hackathons: HackathonDTO[];
  total: number;
  cursor?: string;
  took: number;
}

export class SearchHackathonsHandler {
  constructor(private readonly repository: IHackathonRepository) {}

  public async execute(
    _context: RequestContext,
    filters: HackathonSearchFilters
  ): Promise<Result<SearchHackathonsResponse, BaseError>> {
    const startTime = Date.now();
    const spec = new HackathonSearchSpecification(filters);
    const { items, total, cursor } = await this.repository.search(spec);

    const hackathons = items.map(HackathonMapper.toDTO);
    const took = Date.now() - startTime;

    return ok({
      hackathons,
      total,
      cursor,
      took
    });
  }
}
