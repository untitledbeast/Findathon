import { RequestContext } from '../context/request-context';
import { Result, ok, err } from '../errors/result';
import { BaseError, AuthenticationError, PermissionError, NotFoundError } from '../errors';
import { HackathonDTO } from '@/types';
import { IHackathonRepository } from '../domain/repositories/hackathon.repository.interface';
import { ICacheProvider, CacheKeys } from '../cache';
import { HackathonPublicationPolicy } from '../domain/policies';
import { IEventBus } from '../domain/events/event-bus';
import { HackathonFactory } from '../domain/factories';

export class HackathonCommandService {
  constructor(
    private hackathonRepo: IHackathonRepository,
    private cache: ICacheProvider,
    private eventBus: IEventBus
  ) {}

  public async create(
    context: RequestContext,
    input: {
      title: string;
      description: string;
      tagline?: string | null;
      startDate: string;
      endDate: string;
      registrationDeadline: string;
      registerUrl: string;
      organizer: string;
      organization?: string | null;
      isOnline: boolean;
      mode?: 'online' | 'offline' | 'hybrid';
      city?: string | null;
      locationCity?: string | null;
      venueName?: string | null;
      college?: string | null;
      locationCollege?: string | null;
      fullAddress?: string | null;
      address?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      tags?: string[];
      prizePool?: string | null;
      prizeCurrency?: string | null;
      coverImageUrl?: string | null;
      coverImage?: string | null;
      minTeamSize?: number;
      maxTeamSize?: number;
      soloAllowed?: boolean;
      contactName?: string | null;
      contactEmail?: string | null;
      contactPhone?: string | null;
      socialTwitter?: string | null;
      socialLinkedin?: string | null;
      socialDiscord?: string | null;
      socialInstagram?: string | null;
      submittedBy?: string | null;
    }
  ): Promise<Result<HackathonDTO, BaseError>> {
    try {
      if (!context.user) return err(new AuthenticationError());
      if (!HackathonPublicationPolicy.canPublish({ userId: context.user.id, role: context.role })) {
        // All logged in users can submit pending hackathons
      }

      const entity = HackathonFactory.createNew({
        ...input,
        submittedBy: context.user.id
      });

      const coords = entity.location.getCoordinates();

      const dto = await this.hackathonRepo.create({
        title: entity.title,
        description: entity.description,
        tagline: entity.tagline,
        startDate: entity.dateRange.getStartDate().toISOString(),
        endDate: entity.dateRange.getEndDate().toISOString(),
        registrationDeadline: entity.registrationWindow.getDeadline().toISOString(),
        locationCity: entity.location.getCity() || null,
        locationCollege: entity.location.getVenueName() || null,
        fullAddress: entity.location.getFullAddress() || null,
        isOnline: entity.location.getIsOnline(),
        mode: entity.location.getIsOnline() ? 'online' : (input.mode || 'offline'),
        tags: entity.tags,
        registerUrl: entity.registerUrl.getValue(),
        organizer: entity.organizer,
        organization: entity.organization,
        coverImageUrl: entity.coverImageUrl ? entity.coverImageUrl.getValue() : null,
        status: entity.status.getValue(),
        minTeamSize: entity.teamSize.getMinSize(),
        maxTeamSize: entity.teamSize.getMaxSize(),
        soloAllowed: entity.teamSize.isSoloAllowed(),
        eligibility: entity.eligibility,
        prizePool: entity.prizePool.getFormatted(),
        registrationFee: 'Free',
        contactName: entity.contactName,
        contactEmail: entity.contactEmail ? entity.contactEmail.getValue() : null,
        contactPhone: entity.contactPhone,
        socialTwitter: entity.socialTwitter,
        socialLinkedin: entity.socialLinkedin,
        socialDiscord: entity.socialDiscord,
        socialInstagram: entity.socialInstagram,
        submittedBy: entity.submittedBy,
        latitude: coords ? coords.getLatitude() : null,
        longitude: coords ? coords.getLongitude() : null,
        isVerified: false,
        isFeatured: false,
        difficulty: entity.difficulty,
        hasCertificate: entity.hasCertificate,
        isHiring: entity.isHiring
      });

      this.cache.invalidatePrefix('search:');
      this.cache.invalidatePrefix('hackathons:');

      await this.eventBus.publish({
        eventId: `evt_${Date.now()}`,
        eventName: 'HackathonCreated',
        timestamp: new Date().toISOString(),
        userId: context.user.id,
        hackathonId: dto.id,
        title: dto.title,
        organizerName: dto.organizer
      });

      return ok(dto);
    } catch (e) {
      return err(e instanceof BaseError ? e : new BaseError('Failed to create hackathon'));
    }
  }

  public async update(
    context: RequestContext,
    id: string,
    data: Partial<HackathonDTO>
  ): Promise<Result<HackathonDTO, BaseError>> {
    try {
      if (!context.user) return err(new AuthenticationError());
      const existing = await this.hackathonRepo.findById(id);
      if (!existing) return err(new NotFoundError(`Hackathon ${id} not found`));

      const canEdit = HackathonPublicationPolicy.canEdit(
        { userId: context.user.id, role: context.role },
        existing.submittedBy
      );
      if (!canEdit) return err(new PermissionError());

      const updated = await this.hackathonRepo.update(id, data);
      this.cache.delete(CacheKeys.hackathonKey(id));
      this.cache.invalidatePrefix('search:');

      await this.eventBus.publish({
        eventId: `evt_${Date.now()}`,
        eventName: 'HackathonUpdated',
        timestamp: new Date().toISOString(),
        userId: context.user.id,
        hackathonId: id,
        title: updated.title
      });

      return ok(updated);
    } catch (e) {
      return err(e instanceof BaseError ? e : new BaseError('Failed to update hackathon'));
    }
  }

  public async approve(context: RequestContext, id: string): Promise<Result<void, BaseError>> {
    try {
      if (!context.user) return err(new AuthenticationError());
      const canApprove = HackathonPublicationPolicy.canPublish({ userId: context.user.id, role: context.role });
      if (!canApprove) return err(new PermissionError());

      await this.hackathonRepo.updateStatus(id, 'approved');
      this.cache.delete(CacheKeys.hackathonKey(id));
      this.cache.invalidatePrefix('search:');

      const hackathon = await this.hackathonRepo.findById(id);
      if (hackathon) {
        await this.eventBus.publish({
          eventId: `evt_${Date.now()}`,
          eventName: 'HackathonPublished',
          timestamp: new Date().toISOString(),
          userId: context.user.id,
          hackathonId: id,
          title: hackathon.title
        });
      }

      return ok(undefined);
    } catch (e) {
      return err(e instanceof BaseError ? e : new BaseError('Failed to approve hackathon'));
    }
  }
}
