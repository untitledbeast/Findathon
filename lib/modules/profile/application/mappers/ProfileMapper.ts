import { ProfileEntity } from '../../domain/entities/ProfileEntity';
import { ProfileDTO } from '../dtos/ProfileDTO';

export class ProfileMapper {
  public static toDTO(entity: ProfileEntity): ProfileDTO {
    return {
      id: entity.id.toString(),
      fullName: entity.fullName,
      avatarUrl: entity.avatarUrl,
      bio: entity.bio,
      organization: entity.organization,
      phone: entity.phone,
      website: entity.website,
      socialTwitter: entity.socialTwitter,
      socialLinkedin: entity.socialLinkedin,
      socialInstagram: entity.socialInstagram,
      socialDiscord: entity.socialDiscord,
      skills: entity.skills,
      interests: entity.interests,
      role: entity.role,
      isFirstLogin: entity.isFirstLogin,
      onboardingComplete: entity.onboardingComplete,
      xpPoints: entity.xpPoints,
    };
  }

  public static toDomain(dto: ProfileDTO): ProfileEntity {
    return ProfileEntity.create(
      {
        fullName: dto.fullName,
        avatarUrl: dto.avatarUrl,
        bio: dto.bio,
        organization: dto.organization,
        phone: dto.phone,
        website: dto.website,
        socialTwitter: dto.socialTwitter,
        socialLinkedin: dto.socialLinkedin,
        socialInstagram: dto.socialInstagram,
        socialDiscord: dto.socialDiscord,
        skills: dto.skills,
        interests: dto.interests,
        role: dto.role,
        isFirstLogin: dto.isFirstLogin,
        onboardingComplete: dto.onboardingComplete,
        xpPoints: dto.xpPoints,
      },
      dto.id
    );
  }
}
