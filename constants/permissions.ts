export const PERMISSIONS = {
  SUBMIT_HACKATHON: 'hackathon:submit',
  EDIT_HACKATHON: 'hackathon:edit',
  DELETE_HACKATHON: 'hackathon:delete',
  APPROVE_HACKATHON: 'hackathon:approve',
  WRITE_REVIEW: 'review:write',
  DELETE_REVIEW: 'review:delete',
  MANAGE_NOTIFICATIONS: 'notification:manage'
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
