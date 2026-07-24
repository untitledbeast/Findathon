import { UserDTO } from '@/lib/auth/auth.service';
import { USER_ROLES } from '@/constants/roles';

export const PermissionService = {
  canSubmitHackathon(user: UserDTO | null): boolean {
    if (!user) return false;
    return (user.role as string) !== USER_ROLES.GUEST;
  },

  canEditHackathon(user: UserDTO | null, hackathonSubmittedBy: string | null): boolean {
    if (!user) return false;
    if (user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.MODERATOR) return true;
    return Boolean(hackathonSubmittedBy && user.id === hackathonSubmittedBy);
  },

  canDeleteHackathon(user: UserDTO | null): boolean {
    if (!user) return false;
    return user.role === USER_ROLES.ADMIN;
  },

  canApproveHackathon(user: UserDTO | null): boolean {
    if (!user) return false;
    return user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.MODERATOR;
  },

  canWriteReview(user: UserDTO | null): boolean {
    return Boolean(user && user.id);
  },

  canDeleteReview(user: UserDTO | null, reviewUserId: string): boolean {
    if (!user) return false;
    if (user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.MODERATOR) return true;
    return user.id === reviewUserId;
  }
};
