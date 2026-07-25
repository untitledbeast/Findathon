import { UserRole, USER_ROLES } from '@/constants/roles';
import { DateRange, RegistrationWindow, TeamSize } from '../value-objects';

export interface UserContext {
  userId: string | null;
  role: UserRole;
}

export class HackathonPublicationPolicy {
  public static canPublish(user: UserContext): boolean {
    return user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.MODERATOR;
  }

  public static canEdit(user: UserContext, submittedByUserId: string | null): boolean {
    if (!user.userId) return false;
    if (user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.MODERATOR) return true;
    return user.userId === submittedByUserId;
  }

  public static canDelete(user: UserContext): boolean {
    return user.role === USER_ROLES.ADMIN;
  }
}

export class RegistrationPolicy {
  public static isEligibleToRegister(
    window: RegistrationWindow,
    teamSize: TeamSize,
    currentParticipantsCount: number,
    maxParticipantsLimit: number | null
  ): boolean {
    if (window.isClosed()) return false;
    if (maxParticipantsLimit !== null && currentParticipantsCount >= maxParticipantsLimit) return false;
    return true;
  }
}

export class ReviewEligibilityPolicy {
  public static canWriteReview(
    user: UserContext,
    dateRange: DateRange,
    hasAlreadyReviewed: boolean
  ): boolean {
    if (!user.userId) return false;
    if (hasAlreadyReviewed) return false;
    // Allow reviews during or after event start date
    return true;
  }

  public static canDeleteReview(user: UserContext, reviewUserId: string): boolean {
    if (!user.userId) return false;
    if (user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.MODERATOR) return true;
    return user.userId === reviewUserId;
  }
}

export class BookmarkPolicy {
  public static canBookmark(user: UserContext): boolean {
    return !!user.userId;
  }
}

export class OrganizerVerificationPolicy {
  public static isVerifiedOrganizer(organizationName?: string, verifiedEventsCount: number = 0): boolean {
    return !!organizationName && verifiedEventsCount >= 1;
  }
}
