import { ReviewDTO, ReviewDatabaseRow } from '@/types';
import { ProfileMapper } from './profile.mapper';

export class ReviewMapper {
  public static rowToDTO(row: ReviewDatabaseRow): ReviewDTO {
    return {
      id: row.id,
      hackathonId: row.hackathon_id,
      userId: row.user_id,
      rating: Number(row.rating || 5),
      title: row.title || '',
      body: row.body || '',
      organizationQuality: Number(row.organization_quality || 5),
      prizeTransparency: Number(row.prize_transparency || 5),
      mentorship: Number(row.mentorship || 5),
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
      profile: row.profiles ? ProfileMapper.rowToDTO(row.profiles) : null
    };
  }

  public static dtoToRow(dto: Partial<ReviewDTO>): Record<string, unknown> {
    const row: Record<string, unknown> = {};
    if (dto.hackathonId !== undefined) row.hackathon_id = dto.hackathonId;
    if (dto.userId !== undefined) row.user_id = dto.userId;
    if (dto.rating !== undefined) row.rating = dto.rating;
    if (dto.title !== undefined) row.title = dto.title;
    if (dto.body !== undefined) row.body = dto.body;
    if (dto.organizationQuality !== undefined) row.organization_quality = dto.organizationQuality;
    if (dto.prizeTransparency !== undefined) row.prize_transparency = dto.prizeTransparency;
    if (dto.mentorship !== undefined) row.mentorship = dto.mentorship;
    return row;
  }
}
