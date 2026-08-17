import { supabase } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { HackathonDTO } from './application/dtos/HackathonDTO';
import { ValidationError } from '@/lib/errors';

export interface AdminHackathonFilters {
  status?: string;
  search?: string;
}

export interface AdminStatsDTO {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
  totalUsers: number;
  totalReviews: number;
  totalViews: number;
}

export class AdminHackathonRepository {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapToDTO(record: Record<string, any>): HackathonDTO {
    return {
      id: record.id,
      title: record.title,
      slug: record.title ? record.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '',
      description: record.description || '',
      startDate: record.start_date || new Date().toISOString(),
      endDate: record.end_date || new Date().toISOString(),
      registrationDeadline: record.registration_deadline || record.start_date || new Date().toISOString(),
      locationCity: record.location_city,
      locationCollege: record.location_college,
      isOnline: Boolean(record.is_online),
      latitude: record.latitude,
      longitude: record.longitude,
      tags: record.tags || [],
      prizePool: record.prize_pool || '$0',
      prizeAmount: record.prize_amount || 0,
      organizer: record.organizer || 'Unknown',
      coverImage: record.cover_image_url,
      status: record.status || 'pending',
      viewsCount: record.view_count || 0,
      avgRating: record.avg_rating || 0,
      reviewsCount: record.review_count || 0,
      submittedBy: record.submitted_by,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      rejectionReason: record.rejection_reason,
      reviewedBy: record.reviewed_by,
      reviewedAt: record.reviewed_at,
      isVerified: Boolean(record.is_verified),
      submitter: record.submitter
    };
  }

  public async findPending(pagination: { page: number; pageSize: number }): Promise<{ data: HackathonDTO[]; total: number }> {
    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;

    const client = await this.getClient();
    const { data, error, count } = await client
      .from('hackathons')
      .select('*', { count: 'exact' })
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('[AdminHackathonRepository.findPending] Supabase error:', error);
      throw new Error(error.message);
    }

    const submitterIds = Array.from(
      new Set((data || []).map((h) => h.submitted_by).filter(Boolean))
    );

    const submittersMap: Record<string, { full_name?: string; email?: string; avatar_url?: string }> = {};
    if (submitterIds.length > 0) {
      try {
        const { data: profiles } = await client
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', submitterIds);

        (profiles || []).forEach((p) => {
          submittersMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
        });
      } catch {
        // Ignore submitter enrichment error
      }
    }

    return {
      data: (data || []).map(r => this.mapToDTO({ ...r, submitter: r.submitted_by ? submittersMap[r.submitted_by] : undefined })),
      total: count || 0
    };
  }

  public async findAll(filters: AdminHackathonFilters, pagination: { page: number; pageSize: number }): Promise<{ data: HackathonDTO[]; total: number }> {
    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;

    const client = await this.getClient();
    let query = client
      .from('hackathons')
      .select('*', { count: 'exact' });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('[AdminHackathonRepository.findAll] Supabase error:', error);
      throw new Error(error.message);
    }

    const submitterIds = Array.from(
      new Set((data || []).map((h) => h.submitted_by).filter(Boolean))
    );

    const submittersMap: Record<string, { full_name?: string; email?: string; avatar_url?: string }> = {};
    if (submitterIds.length > 0) {
      try {
        const { data: profiles } = await client
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', submitterIds);

        (profiles || []).forEach((p) => {
          submittersMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
        });
      } catch {
        // Ignore submitter enrichment error
      }
    }

    return {
      data: (data || []).map(r => this.mapToDTO({ ...r, submitter: r.submitted_by ? submittersMap[r.submitted_by] : undefined })),
      total: count || 0
    };
  }

  public async findById(id: string): Promise<HackathonDTO | null> {
    const client = await this.getClient();
    const { data, error } = await client
      .from('hackathons')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    let submitter;
    if (data.submitted_by) {
      try {
        const { data: profile } = await client
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', data.submitted_by)
          .single();
        if (profile) {
          submitter = { full_name: profile.full_name, avatar_url: profile.avatar_url };
        }
      } catch {
        // Ignore submitter fetch error
      }
    }

    return this.mapToDTO({ ...data, submitter });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async create(hackathonData: any): Promise<HackathonDTO> {
    const client = await this.getClient();
    const { data, error } = await client
      .from('hackathons')
      .insert([{
        ...hackathonData,
        status: 'approved', // Admin Quick Add is always approved
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Admin create hackathon error:', error);
      throw new Error(error.message);
    }
    return this.mapToDTO(data);
  }

  public async approve(id: string, adminId: string): Promise<void> {
    const client = await this.getClient();
    const { error } = await client
      .from('hackathons')
      .update({
        status: 'approved',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: null
      })
      .eq('id', id);

    if (error) {
      console.error('[AdminHackathonRepository.approve] Supabase error:', error);
      throw new Error(error.message);
    }
  }

  public async reject(id: string, adminId: string, reason: string): Promise<void> {
    if (!reason || reason.trim().length < 10) {
      throw new ValidationError('Rejection reason must be at least 10 characters long.');
    }

    const client = await this.getClient();
    const { error } = await client
      .from('hackathons')
      .update({
        status: 'rejected',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason.trim()
      })
      .eq('id', id);

    if (error) {
      console.error('[AdminHackathonRepository.reject] Supabase error:', error);
      throw new Error(error.message);
    }
  }

  public async requestChanges(id: string, adminId: string, message: string): Promise<void> {
    const client = await this.getClient();
    const { error } = await client
      .from('hackathons')
      .update({
        status: 'pending',
        rejection_reason: message,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('[AdminHackathonRepository.requestChanges] Supabase error:', error);
      throw new Error(error.message);
    }
  }

  public async toggleVerified(id: string, verified: boolean): Promise<void> {
    const client = await this.getClient();
    const { error } = await client
      .from('hackathons')
      .update({ is_verified: verified })
      .eq('id', id);

    if (error) {
      console.error('[AdminHackathonRepository.toggleVerified] Supabase error:', error);
      throw new Error(error.message);
    }
  }

  public async delete(id: string): Promise<void> {
    const client = await this.getClient();
    const { error } = await client
      .from('hackathons')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[AdminHackathonRepository.delete] Supabase error:', error);
      throw new Error(error.message);
    }
  }

  public async getStats(): Promise<AdminStatsDTO> {
    const client = await this.getClient();
    const [
      { count: pending, error: e1 },
      { count: approved, error: e2 },
      { count: rejected, error: e3 },
      { count: total, error: e4 },
      { count: totalUsers, error: e5 },
      { count: totalReviews, error: e6 },
      { data: viewsData, error: e7 }
    ] = await Promise.all([
      client.from('hackathons').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      client.from('hackathons').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      client.from('hackathons').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
      client.from('hackathons').select('*', { count: 'exact', head: true }),
      client.from('profiles').select('*', { count: 'exact', head: true }),
      client.from('reviews').select('*', { count: 'exact', head: true }),
      client.from('hackathons').select('view_count')
    ]);

    if (e1 || e2 || e3 || e4) {
      console.error('[AdminHackathonRepository.getStats] errors:', { e1, e2, e3, e4, e5, e6, e7 });
    }

    const totalViews = (viewsData || []).reduce((sum, h) => sum + (Number(h.view_count) || 0), 0);

    return {
      pending: pending || 0,
      approved: approved || 0,
      rejected: rejected || 0,
      total: total || 0,
      totalUsers: totalUsers || 0,
      totalReviews: totalReviews || 0,
      totalViews
    };
  }
}
