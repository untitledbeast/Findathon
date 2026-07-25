import { ProfileDTO, ProfileDatabaseRow, UserRole } from '@/types';
import { USER_ROLES } from '@/constants/roles';

export class ProfileMapper {
  public static rowToDTO(row: ProfileDatabaseRow): ProfileDTO {
    const role = (row.role?.toLowerCase() as UserRole) || USER_ROLES.USER;

    return {
      id: row.id,
      fullName: row.full_name || null,
      avatarUrl: row.avatar_url || null,
      bio: row.bio || null,
      organization: row.organization || null,
      phone: row.phone || null,
      website: row.website || null,
      socialTwitter: row.social_twitter || null,
      socialLinkedin: row.social_linkedin || null,
      socialInstagram: row.social_instagram || null,
      socialDiscord: row.social_discord || null,
      role,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString()
    };
  }

  public static dtoToRow(dto: Partial<ProfileDTO>): Record<string, unknown> {
    const row: Record<string, unknown> = {};
    if (dto.fullName !== undefined) row.full_name = dto.fullName;
    if (dto.avatarUrl !== undefined) row.avatar_url = dto.avatarUrl;
    if (dto.bio !== undefined) row.bio = dto.bio;
    if (dto.organization !== undefined) row.organization = dto.organization;
    if (dto.phone !== undefined) row.phone = dto.phone;
    if (dto.website !== undefined) row.website = dto.website;
    if (dto.socialTwitter !== undefined) row.social_twitter = dto.socialTwitter;
    if (dto.socialLinkedin !== undefined) row.social_linkedin = dto.socialLinkedin;
    if (dto.socialInstagram !== undefined) row.social_instagram = dto.socialInstagram;
    if (dto.socialDiscord !== undefined) row.social_discord = dto.socialDiscord;
    if (dto.role !== undefined) row.role = dto.role;
    row.updated_at = new Date().toISOString();
    return row;
  }
}
