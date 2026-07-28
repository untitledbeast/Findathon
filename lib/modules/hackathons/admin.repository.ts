import { adminClient } from '@/lib/supabase-admin';
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
  private mapToDTO(record: Record<string, any>): HackathonDTO {
    return {
      id: record.id,
      title: record.title,
      slug: record.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
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

    const { data, error, count } = await adminClient
      .from('hackathons')
      .select('*, submitter:profiles!submitted_by(full_name, email, avatar_url)', { count: 'exact' })
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(error.message);

    return {
      data: (data || []).map(r => this.mapToDTO(r)),
      total: count || 0
    };
  }

  public async findAll(filters: AdminHackathonFilters, pagination: { page: number; pageSize: number }): Promise<{ data: HackathonDTO[]; total: number }> {
    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;

    let query = adminClient
      .from('hackathons')
      .select('*, submitter:profiles!submitted_by(full_name, email, avatar_url)', { count: 'exact' });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(error.message);

    return {
      data: (data || []).map(r => this.mapToDTO(r)),
      total: count || 0
    };
  }

  public async findById(id: string): Promise<HackathonDTO | null> {
    const { data, error } = await adminClient
      .from('hackathons')
      .select('*, submitter:profiles!submitted_by(full_name, email, avatar_url)')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.mapToDTO(data);
  }

  public async approve(id: string, adminId: string): Promise<void> {
    const { error } = await adminClient
      .from('hackathons')
      .update({
        status: 'approved',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: null
      })
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  public async reject(id: string, adminId: string, reason: string): Promise<void> {
    if (!reason || reason.trim().length < 10) {
      throw new ValidationError('Rejection reason must be at least 10 characters long.');
    }

    const { error } = await adminClient
      .from('hackathons')
      .update({
        status: 'rejected',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason.trim()
      })
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  public async requestChanges(id: string, adminId: string, message: string): Promise<void> {
    const { error } = await adminClient
      .from('hackathons')
      .update({
        status: 'pending',
        rejection_reason: message,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  public async toggleVerified(id: string, verified: boolean): Promise<void> {
    const { error } = await adminClient
      .from('hackathons')
      .update({ is_verified: verified })
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  public async delete(id: string): Promise<void> {
    const { error } = await adminClient
      .from('hackathons')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  public async getStats(): Promise<AdminStatsDTO> {
    const [
      { count: pending },
      { count: approved },
      { count: rejected },
      { count: total },
      { count: totalUsers },
      { count: totalReviews },
      { data: viewsData }
    ] = await Promise.all([
      adminClient.from('hackathons').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      adminClient.from('hackathons').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      adminClient.from('hackathons').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
      adminClient.from('hackathons').select('*', { count: 'exact', head: true }),
      adminClient.from('profiles').select('*', { count: 'exact', head: true }),
      adminClient.from('reviews').select('*', { count: 'exact', head: true }),
      adminClient.from('hackathons').select('view_count')
    ]);

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
