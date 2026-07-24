import { z } from 'zod';

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(80).optional(),
  bio: z.string().max(300).optional(),
  organization: z.string().max(100).optional(),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  socialTwitter: z.string().optional(),
  socialLinkedin: z.string().optional(),
  socialInstagram: z.string().optional(),
  socialDiscord: z.string().optional()
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
