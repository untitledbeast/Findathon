import { ProfileDTO } from '../../application/dtos/ProfileDTO';

export interface ProfileViewModel {
  id: string;
  displayName: string;
  avatarUrl: string;
  formattedRole: string;
  roleBadgeColor: string;
  bioText: string;
  organizationLabel: string;
  completionPercentage: number;
  xpLabel: string;
  skillsList: string[];
  interestsList: string[];
}

export function createProfileViewModel(dto: ProfileDTO): ProfileViewModel {
  const filledFields = [
    dto.fullName,
    dto.bio,
    dto.organization,
    dto.phone,
    dto.website,
    dto.socialTwitter || dto.socialLinkedin || dto.socialInstagram,
    dto.skills.length > 0,
    dto.interests.length > 0,
  ].filter(Boolean).length;

  const totalFields = 8;
  const completionPercentage = Math.round((filledFields / totalFields) * 100);

  const roleColors: Record<string, string> = {
    admin: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    organizer: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    user: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  };

  return {
    id: dto.id,
    displayName: dto.fullName || 'Anonymous Developer',
    avatarUrl: dto.avatarUrl || '/images/default-avatar.png',
    formattedRole: dto.role.toUpperCase(),
    roleBadgeColor: roleColors[dto.role] || roleColors.user,
    bioText: dto.bio || 'No bio provided yet.',
    organizationLabel: dto.organization ? `@ ${dto.organization}` : 'Independent Developer',
    completionPercentage,
    xpLabel: `${dto.xpPoints.toLocaleString()} XP`,
    skillsList: dto.skills,
    interestsList: dto.interests,
  };
}
