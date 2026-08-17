import { IHackathonRepository } from '../domain/repositories/hackathon.repository.interface';
import { HackathonSearchSpecification } from '../domain/specifications';
import {
  HackathonDTO,
  HackathonFilters,
  PaginationParams,
  HackathonDatabaseRow
} from '@/types';
import { supabase, MOCK_HACKATHONS } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { HackathonMapper } from '../domain/mappers/hackathon.mapper';
import { DatabaseError } from '../errors';

export class SupabaseHackathonRepository implements IHackathonRepository {
  private async getClient() {
    if (typeof window === 'undefined') {
      try {
        return await createSupabaseServerClient();
      } catch {
        return supabase;
      }
    }
    return supabase;
  }
  /**
   * Determines whether the application is actually configured
   * to use Supabase.
   */
  private isSupabaseConfigured(): boolean {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

    return Boolean(
      url &&
      !url.includes('placeholder')
    );
  }

  /**
   * Return mock data only when Supabase is genuinely not configured.
   *
   * IMPORTANT:
   * We do NOT fall back to mock data when a real Supabase request
   * fails. Doing that hides real database/RLS/authentication bugs.
   */
  private getMockHackathons(): HackathonDTO[] {
    return MOCK_HACKATHONS.map((hackathon) =>
      HackathonMapper.rowToDTO(
        hackathon as unknown as HackathonDatabaseRow
      )
    );
  }

  /**
   * Find hackathons for homepage/category/search.
   *
   * By default only approved hackathons are returned.
   */
  public async findAll(
    spec: HackathonSearchSpecification
  ): Promise<{ data: HackathonDTO[]; total: number }> {
    try {
      if (!this.isSupabaseConfigured()) {
        const dtos = this.getMockHackathons();

        return {
          data: dtos,
          total: dtos.length
        };
      }

      const pagination = spec.getPagination();

      const client = await this.getClient();
      let query = client
        .from('hackathons')
        .select('*', { count: 'exact' });

      /**
       * Status filtering.
       *
       * Homepage/category pages should normally show approved
       * hackathons unless another status is explicitly requested.
       */
      if (spec.props.status) {
        query = query.eq('status', spec.props.status);
      } else {
        query = query.eq('status', 'approved');
      }

      if (spec.props.isOnline !== undefined) {
        query = query.eq('is_online', spec.props.isOnline);
      }

      if (spec.props.tags && spec.props.tags.length > 0) {
        query = query.overlaps('tags', spec.props.tags);
      }

      if (spec.props.city) {
        query = query.ilike(
          'location_city',
          `%${spec.props.city}%`
        );
      }

      const offset = pagination.getOffset();

      query = query
        .range(
          offset,
          offset + pagination.getPageSize() - 1
        )
        .order('created_at', {
          ascending: false
        });

      const {
        data,
        count,
        error
      } = await query;

      if (error) {
        console.error(
          '[HACKATHON FIND ALL] Supabase error:',
          error
        );

        throw new DatabaseError(error.message);
      }

      const items = (data || []).map((row) =>
        HackathonMapper.rowToDTO(
          row as unknown as HackathonDatabaseRow
        )
      );

      return {
        data: items,
        total: count ?? items.length
      };
    } catch (err) {
      if (err instanceof DatabaseError) {
        throw err;
      }

      console.error(
        '[HACKATHON FIND ALL] Unexpected error:',
        err
      );

      throw new DatabaseError(
        'Failed to fetch hackathons'
      );
    }
  }

  /**
   * Find a single hackathon.
   */
  public async findById(
    id: string
  ): Promise<HackathonDTO | null> {
    try {
      if (!this.isSupabaseConfigured()) {
        const found =
          MOCK_HACKATHONS.find(
            (hackathon) => hackathon.id === id
          ) || MOCK_HACKATHONS[0];

        return found
          ? HackathonMapper.rowToDTO(
            found as unknown as HackathonDatabaseRow
          )
          : null;
      }

      const client = await this.getClient();
      const {
        data,
        error
      } = await client
        .from('hackathons')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error(
          '[HACKATHON FIND BY ID] Supabase error:',
          error
        );

        throw new DatabaseError(error.message);
      }

      if (!data) {
        return null;
      }

      return HackathonMapper.rowToDTO(
        data as unknown as HackathonDatabaseRow
      );
    } catch (err) {
      if (err instanceof DatabaseError) {
        throw err;
      }

      console.error(
        '[HACKATHON FIND BY ID] Unexpected error:',
        err
      );

      throw new DatabaseError(
        'Failed to fetch hackathon'
      );
    }
  }

  /**
   * Find all hackathons submitted by a specific user.
   *
   * THIS METHOD IS CRITICAL FOR THE USER PROFILE
   * "SUBMITTED" TAB.
   *
   * It deliberately does NOT filter by status.
   *
   * Therefore:
   * pending   -> visible to submitting user
   * approved  -> visible to submitting user
   * rejected  -> visible to submitting user
   * archived  -> visible to submitting user
   */
  public async findByUserId(
    userId: string
  ): Promise<HackathonDTO[]> {
    try {
      if (!userId) {
        console.error(
          '[HACKATHON FIND BY USER] Missing userId'
        );

        throw new DatabaseError(
          'User ID is required to fetch submitted hackathons'
        );
      }

      if (!this.isSupabaseConfigured()) {
        return this.getMockHackathons();
      }

      console.log(
        '[HACKATHON FIND BY USER] Fetching submissions for user:',
        userId
      );

      const client = await this.getClient();
      const {
        data,
        error
      } = await client
        .from('hackathons')
        .select('*')
        .eq('submitted_by', userId)
        .order('created_at', {
          ascending: false
        });

      if (error) {
        console.error(
          '[HACKATHON FIND BY USER] Supabase error:',
          error
        );

        throw new DatabaseError(error.message);
      }

      console.log(
        '[HACKATHON FIND BY USER] Rows returned:',
        data?.length ?? 0
      );

      console.log(
        '[HACKATHON FIND BY USER] Data:',
        JSON.stringify(data, null, 2)
      );

      return (data || []).map((row) =>
        HackathonMapper.rowToDTO(
          row as unknown as HackathonDatabaseRow
        )
      );
    } catch (err) {
      if (err instanceof DatabaseError) {
        throw err;
      }

      console.error(
        '[HACKATHON FIND BY USER] Unexpected error:',
        err
      );

      throw new DatabaseError(
        'Failed to fetch submitted hackathons'
      );
    }
  }

  /**
   * Create a new hackathon.
   *
   * A normal authenticated user OR an admin can submit.
   *
   * The caller is responsible for supplying submittedBy.
   * The command service currently sets it to context.user.id.
   */
  public async create(
    data: Omit<
      HackathonDTO,
      | 'id'
      | 'createdAt'
      | 'updatedAt'
      | 'slug'
      | 'viewCount'
      | 'saveCount'
      | 'avgRating'
      | 'reviewCount'
    >
  ): Promise<HackathonDTO> {
    try {
      const rowPayload =
        HackathonMapper.dtoToRow(
          data as Partial<HackathonDTO>
        );

      rowPayload.created_at =
        new Date().toISOString();

      /**
       * IMPORTANT DEBUGGING INFORMATION
       *
       * We specifically want to verify:
       *
       * 1. submitted_by exists
       * 2. submitted_by contains the authenticated user's UUID
       * 3. status is pending
       */
      console.log(
        '[HACKATHON CREATE] rowPayload:',
        JSON.stringify(rowPayload, null, 2)
      );

      console.log(
        '[HACKATHON CREATE] submitted_by:',
        rowPayload.submitted_by
      );

      console.log(
        '[HACKATHON CREATE] status:',
        rowPayload.status
      );

      if (!this.isSupabaseConfigured()) {
        const mockRow = {
          ...rowPayload,
          id: `hack_${Date.now()}`
        } as unknown as HackathonDatabaseRow;

        const mockDto =
          HackathonMapper.rowToDTO(mockRow);

        console.log(
          '[HACKATHON CREATE] Using mock database:',
          mockDto
        );

        return mockDto;
      }

      const client = await this.getClient();
      const {
        data: inserted,
        error
      } = await client
        .from('hackathons')
        .insert([rowPayload])
        .select('*')
        .single();

      /**
       * Log BOTH values so we can distinguish:
       *
       * - client payload problem
       * - database/RLS problem
       * - returned-row problem
       */
      console.log(
        '[HACKATHON CREATE] Supabase inserted row:',
        JSON.stringify(inserted, null, 2)
      );

      console.log(
        '[HACKATHON CREATE] Supabase error:',
        error
      );

      if (error) {
        console.error(
          '[HACKATHON CREATE] Insert failed:',
          error
        );

        throw new DatabaseError(
          error.message
        );
      }

      if (!inserted) {
        throw new DatabaseError(
          'Supabase inserted the hackathon but returned no row'
        );
      }

      const dto =
        HackathonMapper.rowToDTO(
          inserted as unknown as HackathonDatabaseRow
        );

      console.log(
        '[HACKATHON CREATE] Final DTO:',
        JSON.stringify(dto, null, 2)
      );

      console.log(
        '[HACKATHON CREATE] Final submittedBy:',
        dto.submittedBy
      );

      return dto;
    } catch (err) {
      if (err instanceof DatabaseError) {
        throw err;
      }

      console.error(
        '[HACKATHON CREATE] Unexpected error:',
        err
      );

      throw new DatabaseError(
        'Database write operation failed'
      );
    }
  }

  /**
   * Update a hackathon.
   */
  public async update(
    id: string,
    data: Partial<HackathonDTO>
  ): Promise<HackathonDTO> {
    try {
      const rowPayload =
        HackathonMapper.dtoToRow(data);

      console.log(
        '[HACKATHON UPDATE] id:',
        id
      );

      console.log(
        '[HACKATHON UPDATE] payload:',
        JSON.stringify(rowPayload, null, 2)
      );

      if (!this.isSupabaseConfigured()) {
        const existing =
          await this.findById(id);

        return {
          ...(existing || {}),
          ...data,
          updatedAt: new Date().toISOString()
        } as HackathonDTO;
      }

      const client = await this.getClient();
      const {
        data: updated,
        error
      } = await client
        .from('hackathons')
        .update(rowPayload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error(
          '[HACKATHON UPDATE] Supabase error:',
          error
        );

        throw new DatabaseError(
          error.message
        );
      }

      if (!updated) {
        throw new DatabaseError(
          'Failed to update hackathon: no row returned'
        );
      }

      return HackathonMapper.rowToDTO(
        updated as unknown as HackathonDatabaseRow
      );
    } catch (err) {
      if (err instanceof DatabaseError) {
        throw err;
      }

      console.error(
        '[HACKATHON UPDATE] Unexpected error:',
        err
      );

      throw new DatabaseError(
        'Failed to update hackathon'
      );
    }
  }

  /**
   * Update only the hackathon status.
   *
   * Used by admin approval/rejection workflows.
   */
  public async updateStatus(
    id: string,
    status: string
  ): Promise<void> {
    try {
      if (!this.isSupabaseConfigured()) {
        console.log(
          '[HACKATHON UPDATE STATUS] Mock database:',
          { id, status }
        );

        return;
      }

      console.log(
        '[HACKATHON UPDATE STATUS]',
        {
          id,
          status
        }
      );

      const client = await this.getClient();
      const {
        error
      } = await client
        .from('hackathons')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error(
          '[HACKATHON UPDATE STATUS] Supabase error:',
          error
        );

        throw new DatabaseError(
          error.message
        );
      }
    } catch (err) {
      if (err instanceof DatabaseError) {
        throw err;
      }

      console.error(
        '[HACKATHON UPDATE STATUS] Unexpected error:',
        err
      );

      throw new DatabaseError(
        'Failed to update hackathon status'
      );
    }
  }

  /**
   * Increment view count.
   */
  public async incrementViewCount(
    id: string
  ): Promise<void> {
    try {
      if (!this.isSupabaseConfigured()) {
        return;
      }

      const client = await this.getClient();
      const {
        error
      } = await client.rpc(
        'increment_view_count',
        {
          hackathon_id: id
        }
      );

      if (error) {
        console.error(
          '[HACKATHON INCREMENT VIEW] Supabase error:',
          error
        );
      }
    } catch (err) {
      /**
       * View counting is intentionally non-critical.
       * A view-count failure should not break the page.
       */
      console.error(
        '[HACKATHON INCREMENT VIEW] Unexpected error:',
        err
      );
    }
  }

  /**
   * Search hackathons.
   */
  public async search(
    query: string,
    filters: HackathonFilters,
    pagination: PaginationParams
  ): Promise<{
    data: HackathonDTO[];
    total: number;
  }> {
    try {
      if (!this.isSupabaseConfigured()) {
        const dtos = this.getMockHackathons();

        return {
          data: dtos,
          total: dtos.length
        };
      }

      const client = await this.getClient();
      let builder = client
        .from('hackathons')
        .select('*', { count: 'exact' });

      if (query?.trim()) {
        builder = builder.textSearch(
          'search_vector',
          query.trim(),
          {
            type: 'websearch'
          }
        );
      }

      if (filters.city) {
        builder = builder.ilike(
          'location_city',
          `%${filters.city}%`
        );
      }

      if (filters.mode) {
        builder = builder.eq(
          'mode',
          filters.mode
        );
      }

      if (filters.isOnline !== undefined) {
        builder = builder.eq(
          'is_online',
          filters.isOnline
        );
      }

      if (
        filters.tags &&
        filters.tags.length > 0
      ) {
        builder = builder.overlaps(
          'tags',
          filters.tags
        );
      }

      const offset =
        (pagination.page - 1) *
        pagination.pageSize;

      builder = builder
        .range(
          offset,
          offset + pagination.pageSize - 1
        )
        .order('created_at', {
          ascending: false
        });

      const {
        data,
        count,
        error
      } = await builder;

      if (error) {
        console.error(
          '[HACKATHON SEARCH] Supabase error:',
          error
        );

        throw new DatabaseError(
          error.message
        );
      }

      const dtos = (data || []).map(
        (row) =>
          HackathonMapper.rowToDTO(
            row as unknown as HackathonDatabaseRow
          )
      );

      return {
        data: dtos,
        total: count ?? dtos.length
      };
    } catch (err) {
      if (err instanceof DatabaseError) {
        throw err;
      }

      console.error(
        '[HACKATHON SEARCH] Unexpected error:',
        err
      );

      throw new DatabaseError(
        'Failed to search hackathons'
      );
    }
  }
}