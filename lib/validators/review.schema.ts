import { z } from 'zod';

export const createReviewSchema = z.object({
  hackathonId: z.string().min(1, 'Hackathon ID is required'),
  rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
  title: z.string().min(3, 'Review title must be at least 3 characters').max(80).optional(),
  comment: z.string().min(10, 'Comment must be at least 10 characters').max(500),
  organizationQuality: z.number().int().min(1).max(5).optional(),
  prizeTransparency: z.number().int().min(1).max(5).optional(),
  mentorship: z.number().int().min(1).max(5).optional()
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
