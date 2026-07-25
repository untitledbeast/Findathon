import { RequestContext } from '../context/request-context';
import { Result, ok, err } from '../errors/result';
import { BaseError } from '../errors';
import { SearchResultDTO, HackathonFilters, PaginationParams } from '@/types';
import { ISearchProvider } from '../infrastructure/search';
import { ICacheProvider, CacheKeys, SEARCH_TTL } from '../cache';

export class SearchQueryService {
  constructor(
    private searchProvider: ISearchProvider,
    private cache: ICacheProvider
  ) {}

  public async search(
    _context: RequestContext,
    params: {
      query?: string;
      filters: HackathonFilters;
      pagination: PaginationParams;
    }
  ): Promise<Result<SearchResultDTO, BaseError>> {
    try {
      const q = params.query?.trim() || '';
      const cacheKey = CacheKeys.searchKey(q, JSON.stringify(params));
      const cached = this.cache.get<SearchResultDTO>(cacheKey);
      if (cached) return ok(cached);

      const result = await this.searchProvider.search(q, params.filters, params.pagination);
      const searchResult: SearchResultDTO = {
        hackathons: result.data,
        total: result.total,
        page: params.pagination.page,
        pageSize: params.pagination.pageSize,
        query: q
      };

      this.cache.set(cacheKey, searchResult, SEARCH_TTL);
      return ok(searchResult);
    } catch (e) {
      return err(e instanceof BaseError ? e : new BaseError('Search query failed'));
    }
  }
}
