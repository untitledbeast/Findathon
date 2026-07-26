import { supabase } from '@/lib/supabase';
import { IProfileRepository } from '../../domain/repositories/IProfileRepository';
import { ProfileEntity } from '../../domain/entities/ProfileEntity';

export class SupabaseProfileRepository implements IProfileRepository {
  public async findById(id: string): Promise<ProfileEntity | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return ProfileEntity.create(
      {
        fullName: data.full_name || 'User',
        avatarUrl: data.avatar_url || null,
        bio: data.bio || '',
        organization: data.organization || '',
        phone: data.phone || '',
        website: data.website || '',
        socialTwitter: data.social_twitter || '',
        socialLinkedin: data.social_linkedin || '',
        socialInstagram: data.social_instagram || '',
        socialDiscord: data.social_discord || '',
        skills: Array.isArray(data.skills) ? data.skills : [],
        interests: Array.isArray(data.interests) ? data.interests : [],
        role: data.role || 'user',
        isFirstLogin: Boolean(data.is_first_login),
        onboardingComplete: Boolean(data.onboarding_complete ?? true),
        xpPoints: Number(data.xp_points || 0),
      },
      data.id
    );
  }

  public async save(profile: ProfileEntity): Promise<ProfileEntity> {
    const row = {
      id: profile.id.toString(),
      full_name: profile.fullName,
      avatar_url: profile.avatarUrl,
      bio: profile.bio,
      organization: profile.organization,
      phone: profile.phone,
      website: profile.website,
      social_twitter: profile.socialTwitter,
      social_linkedin: profile.socialLinkedin,
      social_instagram: profile.socialInstagram,
      social_discord: profile.socialDiscord,
      skills: profile.skills,
      interests: profile.interests,
      role: profile.role,
      is_first_login: profile.isFirstLogin,
      onboarding_complete: profile.onboardingComplete,
      xp_points: profile.xpPoints,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(row)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to save profile: ${error?.message || 'Unknown database error'}`);
    }

    return ProfileEntity.create(
      {
        fullName: data.full_name || profile.fullName,
        avatarUrl: data.avatar_url || profile.avatarUrl,
        bio: data.bio || '',
        organization: data.organization || '',
        phone: data.phone || '',
        website: data.website || '',
        socialTwitter: data.social_twitter || '',
        socialLinkedin: data.social_linkedin || '',
        socialInstagram: data.social_instagram || '',
        socialDiscord: data.social_discord || '',
        skills: Array.isArray(data.skills) ? data.skills : profile.skills,
        interests: Array.isArray(data.interests) ? data.interests : profile.interests,
        role: data.role || profile.role,
        isFirstLogin: Boolean(data.is_first_login),
        onboardingComplete: Boolean(data.onboarding_complete ?? true),
        xpPoints: Number(data.xp_points || profile.xpPoints),
      },
      data.id
    );
  }

  public async update(id: string): Promise<ProfileEntity> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Profile with ID ${id} not found`);
    }
    return this.save(existing);
  }
}
