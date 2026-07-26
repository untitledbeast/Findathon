import { Result, ok, err } from '@/lib/shared';
import { BaseError, NotFoundError } from '@/lib/errors';
import { RequestContext } from '@/lib/context/request-context';
import { IProfileRepository } from '../../domain/repositories/IProfileRepository';
import { ProfileDTO } from '../dtos/ProfileDTO';
import { ProfileMapper } from '../mappers/ProfileMapper';
import { ProfileEntity } from '../../domain/entities/ProfileEntity';

export class ProfileService {
  constructor(private readonly repository: IProfileRepository) {}

  public async getProfile(context: RequestContext, userId?: string): Promise<Result<ProfileDTO, BaseError>> {
    const targetId = userId || context.user?.id;
    if (!targetId) {
      return err(new NotFoundError('User ID is required to fetch profile'));
    }

    const entity = await this.repository.findById(targetId);
    if (!entity) {
      return err(new NotFoundError(`Profile not found for ID: ${targetId}`));
    }

    return ok(ProfileMapper.toDTO(entity));
  }

  public async updateProfile(
    context: RequestContext,
    updates: Partial<ProfileDTO>
  ): Promise<Result<ProfileDTO, BaseError>> {
    const userId = context.user?.id;
    if (!userId) {
      return err(new NotFoundError('User must be authenticated to update profile'));
    }

    const existing = await this.repository.findById(userId);
    if (!existing) {
      // Bootstrap new profile entity if missing
      const newEntity = ProfileEntity.create(
        {
          fullName: updates.fullName || context.user?.fullName || 'User',
          avatarUrl: updates.avatarUrl || context.user?.avatarUrl || null,
          bio: updates.bio,
          organization: updates.organization,
          phone: updates.phone,
          website: updates.website,
          socialTwitter: updates.socialTwitter,
          socialLinkedin: updates.socialLinkedin,
          socialInstagram: updates.socialInstagram,
          socialDiscord: updates.socialDiscord,
          skills: updates.skills,
          interests: updates.interests,
          role: (context.user?.role === 'organizer' || context.user?.role === 'admin') ? context.user.role : 'user',
          isFirstLogin: false,
          onboardingComplete: true
        },
        userId
      );
      const saved = await this.repository.save(newEntity);
      return ok(ProfileMapper.toDTO(saved));
    }

    const updatedEntity = existing.updateDetails({
      fullName: updates.fullName,
      avatarUrl: updates.avatarUrl,
      bio: updates.bio,
      organization: updates.organization,
      phone: updates.phone,
      website: updates.website,
      socialTwitter: updates.socialTwitter,
      socialLinkedin: updates.socialLinkedin,
      socialInstagram: updates.socialInstagram,
      socialDiscord: updates.socialDiscord,
      skills: updates.skills,
      interests: updates.interests,
    });

    const saved = await this.repository.save(updatedEntity);
    return ok(ProfileMapper.toDTO(saved));
  }

  public async completeOnboarding(
    context: RequestContext,
    interests: string[],
    skills: string[]
  ): Promise<Result<ProfileDTO, BaseError>> {
    const userId = context.user?.id;
    if (!userId) {
      return err(new NotFoundError('User must be authenticated to complete onboarding'));
    }

    const existing = await this.repository.findById(userId);
    const entity = existing || ProfileEntity.create(
      {
        fullName: context.user?.fullName || 'User',
        avatarUrl: context.user?.avatarUrl || null,
        role: (context.user?.role === 'organizer' || context.user?.role === 'admin') ? context.user.role : 'user'
      },
      userId
    );

    const completedEntity = entity.completeOnboarding(interests, skills);
    const saved = await this.repository.save(completedEntity);
    return ok(ProfileMapper.toDTO(saved));
  }
}
