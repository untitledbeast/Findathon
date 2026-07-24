export const HACKATHON_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ARCHIVED: 'archived'
} as const;

export type HackathonStatus = typeof HACKATHON_STATUS[keyof typeof HACKATHON_STATUS];
