import {
  Slug,
  Url,
  Email,
  PrizePool,
  Location,
  Coordinates,
  DateRange,
  RegistrationWindow,
  TeamSize,
  Rating,
  Role,
  HackathonStatusState
} from '../value-objects';
import { HackathonEntity, HackathonEntityProps } from '../entities/hackathon.entity';
import { ReviewEntity } from '../entities/review.entity';
import { ProfileEntity } from '../entities/profile.entity';
import { NotificationEntity } from '../entities/notification.entity';
import { HACKATHON_STATUS } from '@/constants/status';
import { USER_ROLES } from '@/constants/roles';

export class HackathonFactory {
  public static createNew(input: {
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
    city?: string | null;
    college?: string | null;
    fullAddress?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    tags?: string[];
    prizePool?: string | null;
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
  }): HackathonEntity {
    const id = `hack_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    const slug = new Slug(input.title);
    const dateRange = new DateRange(input.startDate, input.endDate);
    const registrationWindow = new RegistrationWindow(input.registrationDeadline, dateRange);
    
    let coords: Coordinates | null = null;
    if (typeof input.latitude === 'number' && typeof input.longitude === 'number') {
      coords = new Coordinates(input.latitude, input.longitude);
    }

    const location = new Location({
      city: input.city,
      college: input.college,
      fullAddress: input.fullAddress,
      coordinates: coords,
      isOnline: input.isOnline
    });

    const teamSize = new TeamSize(
      input.minTeamSize || 1,
      input.maxTeamSize || 4,
      input.soloAllowed ?? true
    );

    const props: HackathonEntityProps = {
      id,
      title: input.title.trim(),
      slug,
      tagline: input.tagline?.trim() || null,
      description: input.description.trim(),
      dateRange,
      registrationWindow,
      location,
      tags: input.tags && input.tags.length > 0 ? input.tags : ['General'],
      registerUrl: new Url(input.registerUrl),
      organizer: input.organizer.trim(),
      organization: input.organization?.trim() || null,
      coverImageUrl: null,
      status: new HackathonStatusState(HACKATHON_STATUS.PENDING),
      teamSize,
      eligibility: 'Open to All',
      prizePool: new PrizePool(input.prizePool || 'TBD'),
      contactName: input.contactName?.trim() || null,
      contactEmail: input.contactEmail ? new Email(input.contactEmail) : null,
      contactPhone: input.contactPhone?.trim() || null,
      socialTwitter: input.socialTwitter?.trim() || null,
      socialLinkedin: input.socialLinkedin?.trim() || null,
      socialDiscord: input.socialDiscord?.trim() || null,
      socialInstagram: input.socialInstagram?.trim() || null,
      submittedBy: input.submittedBy || null,
      viewCount: 0,
      saveCount: 0,
      avgRating: 0,
      reviewCount: 0,
      isVerified: false,
      isFeatured: false,
      difficulty: 'open',
      hasCertificate: false,
      isHiring: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return new HackathonEntity(props);
  }
}

export class ReviewFactory {
  public static createNew(input: {
    hackathonId: string;
    userId: string;
    rating: number;
    title: string;
    body: string;
    organizationQuality: number;
    prizeTransparency: number;
    mentorship: number;
  }): ReviewEntity {
    const id = `rev_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    return new ReviewEntity({
      id,
      hackathonId: input.hackathonId,
      userId: input.userId,
      rating: new Rating(input.rating),
      title: input.title.trim(),
      body: input.body.trim(),
      organizationQuality: new Rating(input.organizationQuality),
      prizeTransparency: new Rating(input.prizeTransparency),
      mentorship: new Rating(input.mentorship),
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
}

export class NotificationFactory {
  public static createNew(input: {
    userId: string;
    type: string;
    title: string;
    body: string;
    metadata?: Record<string, unknown>;
  }): NotificationEntity {
    const id = `notif_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    return new NotificationEntity({
      id,
      userId: input.userId,
      type: input.type,
      title: input.title.trim(),
      body: input.body.trim(),
      isRead: false,
      metadata: input.metadata || {},
      createdAt: new Date()
    });
  }
}

export class ProfileFactory {
  public static createDefault(userId: string, roleName: string = USER_ROLES.USER): ProfileEntity {
    return new ProfileEntity({
      id: userId,
      fullName: null,
      avatarUrl: null,
      bio: null,
      organization: null,
      phone: null,
      website: null,
      socialTwitter: null,
      socialLinkedin: null,
      socialInstagram: null,
      socialDiscord: null,
      role: new Role(roleName),
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
}
