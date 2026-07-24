import { z } from 'zod';

export const searchSchema = z.object({
  query: z.string().max(100).optional(),
  city: z.string().optional(),
  college: z.string().optional(),
  tags: z.array(z.string()).optional(),
  mode: z.enum(['online', 'offline', 'hybrid', 'all']).optional(),
  isOnline: z.boolean().optional(),
  verified: z.boolean().optional(),
  difficulty: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(12)
});

export type SearchInput = z.infer<typeof searchSchema>;
