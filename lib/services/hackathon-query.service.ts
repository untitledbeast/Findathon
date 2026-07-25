import { RequestContext } from '../context/request-context';
import { Result, ok, err } from '../errors/result';
import { BaseError, NotFoundError, PermissionError } from '../errors';
import { HackathonDTO, SearchResultDTO } from '@/types';
import { IHackathonRepository } from '../domain/repositories/hackathon.repository.interface';
import { HackathonSearchSpecification } from '../domain/specifications';
import { ICacheProvider, CacheKeys, HACKATHON_TTL, SEARCH_TTL } from '../cache';
import { HackathonPublicationPolicy } from '../domain/policies';

export class HackathonQueryService {
  constructor(
    private hackathonRepo: IHackathonRepository,
    private cache: ICacheProvider
  ) {}

  public async getAll(context: RequestContext, spec: HackathonSearchSpecification): Promise<Result<SearchResultDTO, BaseError>> {
    try {
      const cacheKey = CacheKeys.searchKey(spec.props.query || '', JSON.stringify(spec.toJSON()));
      const cached = this.cache.get<SearchResultDTO>(cacheKey);
      if (cached) return ok(cached);

      const result = await this.hackathonRepo.findAll(spec);
      const searchResult: SearchResultDTO = {
        hackathons: result.data,
        total: result.total,
        page: spec.getPagination().getPage(),
        pageSize: spec.getPagination().getPageSize(),
        query: spec.props.query || ''
      };

      this.cache.set(cacheKey, searchResult, SEARCH_TTL);
      return ok(searchResult);
    } catch (e) {
      return err(e instanceof BaseError ? e : new BaseError('Failed to fetch hackathons'));
    }
  }

  public async getById(context: RequestContext, id: string): Promise<Result<HackathonDTO, BaseError>> {
    try {
      const cacheKey = CacheKeys.hackathonKey(id);
      const cached = this.cache.get<HackathonDTO>(cacheKey);
      if (cached) {
        this.hackathonRepo.incrementViewCount(id).catch(() => {});
        return ok(cached);
      }

      const hackathon = await this.hackathonRepo.findById(id);
      if (!hackathon) return err(new NotFoundError(`Hackathon with ID ${id} not found`));

      if (hackathon.status !== 'approved') {
        const canViewDraft = HackathonPublicationPolicy.canEdit({ userId: context.user?.id || null, role: context.role }, hackathon.submittedBy);
        if (!canViewDraft) return err(new PermissionError('Draft hackathon is not published'));
      }

      this.cache.set(cacheKey, hackathon, HACKATHON_TTL);
      this.hackathonRepo.incrementViewCount(id).catch(() => {});
      return ok(hackathon);
    } catch (e) {
      return err(e instanceof BaseError ? e : new BaseError('Failed to get hackathon by id'));
    }
  }

  public async getByUserId(context: RequestContext, userId: string): Promise<Result<HackathonDTO[], BaseError>> {
    try {
      const items = await this.hackathonRepo.findByUserId(userId);
      return ok(items);
    } catch (e) {
      return err(e instanceof BaseError ? e : new BaseError('Failed to fetch user hackathons'));
    }
  }
}
