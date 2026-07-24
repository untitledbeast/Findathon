export const USER_ROLES = {
  GUEST: 'guest',
  USER: 'user',
  ORGANIZER: 'organizer',
  MODERATOR: 'moderator',
  ADMIN: 'admin'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
