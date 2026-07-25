import { z } from 'zod';

export const markReadSchema = z.object({
  notificationId: z.string().min(1, 'Notification ID is required')
});
