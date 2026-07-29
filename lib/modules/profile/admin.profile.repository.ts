import { adminClient } from '@/lib/supabase-admin';
import { ProfileDTO } from './application/dtos/ProfileDTO';

export class AdminProfileRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapToDTO(record: Record<string, any>): ProfileDTO {
    return {
      id: record.id,
      fullName: record.full_name || 'Unknown',
      avatarUrl: record.avatar_url,
      bio: record.bio || '',
      organization: record.organization || '',
      phone: record.phone || '',
      website: record.website || '',
      socialTwitter: record.social_twitter || '',
      socialLinkedin: record.social_linkedin || '',
      socialInstagram: record.social_instagram || '',
      socialDiscord: record.social_discord || '',
      skills: record.skills || [],
      interests: record.interests || [],
      role: record.role || 'user',
      isFirstLogin: Boolean(record.is_first_login),
      onboardingComplete: Boolean(record.onboarding_complete),
      xpPoints: record.xp_points || 0,
      email: record.email,
      createdAt: record.created_at
    };
  }

  public async findAll(pagination: { page: number; pageSize: number }, search?: string): Promise<{ data: ProfileDTO[]; total: number }> {
    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;

    let query = adminClient
      .from('profiles')
      .select('full_name, email, role, organization, avatar_url, created_at, id', { count: 'exact' });

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
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

  public async updateRole(userId: string, role: 'user' | 'organizer' | 'moderator' | 'admin'): Promise<void> {
    const validRoles = ['user', 'organizer', 'moderator', 'admin'];
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid role: ${role}`);
    }

    const { error } = await adminClient
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (error) throw new Error(error.message);
  }

  public async findById(userId: string): Promise<ProfileDTO | null> {
    const { data, error } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) return null;
    return this.mapToDTO(data);
  }
}
